import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isExpiredPushSubscription, sendWebPush } from "@/lib/push";

export const runtime = "nodejs";

function mustGetEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const supabase = createClient(
  process.env.SUPABASE_URL ?? mustGetEnv("NEXT_PUBLIC_SUPABASE_URL"),
  mustGetEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } },
);

type NotificationSettingRow = {
  user_id: string;
  forgotten_days: number | null;
  push_frequency: "daily" | "weekly" | null;
  push_last_sent_at: string | null;
  timezone: string | null;
  push_quiet_hours_start: number | null;
  push_quiet_hours_end: number | null;
  push_max_per_day: number | null;
};

type ItemRow = {
  id: string;
  title: string;
  type: string;
  created_at: string;
  last_viewed_at?: string | null;
  snoozed_until?: string | null;
  work_status?: string | null;
};

type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function isAuthorized(req: Request) {
  const incoming = req.headers.get("x-cron-secret") ?? "";
  const secret = process.env.PUSH_CRON_SECRET ?? "";
  return !!secret && incoming === secret;
}

function shouldSendByFrequency(
  lastSentAt: string | null,
  frequency: "daily" | "weekly",
) {
  if (!lastSentAt) return true;

  const last = new Date(lastSentAt).getTime();
  const now = Date.now();
  const threshold = frequency === "weekly" ? 7 : 1;
  return now - last >= threshold * 24 * 60 * 60 * 1000;
}

function getLocalHour(timezone: string | null) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: timezone || "UTC",
  });

  return Number(formatter.format(new Date()));
}

function isInQuietHours(
  timezone: string | null,
  startHour: number | null,
  endHour: number | null,
) {
  if (startHour === null || endHour === null) return false;

  const hour = getLocalHour(timezone);
  if (startHour === endHour) return true;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}

function getLocalDateStamp(date: Date, timezone: string | null) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone || "UTC",
  }).format(date);
}

function getDaysSinceTouch(item: ItemRow) {
  const base = item.last_viewed_at ?? item.created_at;
  const time = new Date(base).getTime();
  return Math.max(0, Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000)));
}

function pickForgottenCandidate(items: ItemRow[], forgottenDays: number) {
  return items
    .filter((item) => {
      if ((item.work_status ?? "later") === "done") return false;
      if (item.snoozed_until) {
        const until = new Date(item.snoozed_until).getTime();
        if (Date.now() < until) return false;
      }

      return getDaysSinceTouch(item) >= forgottenDays;
    })
    .sort((a, b) => getDaysSinceTouch(b) - getDaysSinceTouch(a))[0];
}

async function revokeExpiredSubscriptions(
  userId: string,
  subscriptions: SubscriptionRow[],
  results: PromiseSettledResult<string>[],
) {
  const staleEndpoints = results
    .flatMap((result, index) => {
      if (
        result.status === "rejected" &&
        isExpiredPushSubscription(result.reason)
      ) {
        return [subscriptions[index]?.endpoint];
      }
      return [];
    })
    .filter(Boolean) as string[];

  if (staleEndpoints.length === 0) return;

  await supabase
    .from("device_push_subscriptions")
    .update({
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in("endpoint", staleEndpoints)
    .eq("user_id", userId);
}

export async function POST(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: settingsRows, error } = await supabase
      .from("user_settings")
      .select(
        "user_id,forgotten_days,push_frequency,push_last_sent_at,timezone,push_quiet_hours_start,push_quiet_hours_end,push_max_per_day",
      );

    if (error) throw error;

    const settings = (settingsRows ?? []) as NotificationSettingRow[];
    let sent = 0;
    let skipped = 0;

    for (const row of settings) {
      const frequency = row.push_frequency ?? "daily";
      if (
        isInQuietHours(
          row.timezone,
          row.push_quiet_hours_start,
          row.push_quiet_hours_end,
        )
      ) {
        skipped += 1;
        continue;
      }

      if (!shouldSendByFrequency(row.push_last_sent_at, frequency)) {
        skipped += 1;
        continue;
      }

      const maxPerDay = row.push_max_per_day ?? 1;
      const { data: notificationRows, error: notificationError } = await supabase
        .from("notification_log")
        .select("sent_at")
        .eq("user_id", row.user_id)
        .eq("kind", "forgotten_item")
        .eq("status", "sent")
        .gte(
          "sent_at",
          new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order("sent_at", { ascending: false });

      if (notificationError) throw notificationError;

      const todayCount = (notificationRows ?? []).filter(
        (entry: { sent_at: string }) =>
          getLocalDateStamp(new Date(entry.sent_at), row.timezone) ===
          getLocalDateStamp(new Date(), row.timezone),
      ).length;

      if (todayCount >= maxPerDay) {
        skipped += 1;
        continue;
      }

      const { data: subscriptions, error: subError } = await supabase
        .from("device_push_subscriptions")
        .select("endpoint,p256dh,auth")
        .eq("user_id", row.user_id)
        .is("revoked_at", null)
        .eq("platform", "web");

      if (subError) throw subError;
      if (!subscriptions?.length) {
        skipped += 1;
        continue;
      }

      const { data: items, error: itemError } = await supabase
        .from("items")
        .select(
          "id,title,type,created_at,last_viewed_at,snoozed_until,work_status",
        )
        .eq("user_id", row.user_id)
        .order("created_at", { ascending: false });

      if (itemError) throw itemError;

      const candidate = pickForgottenCandidate(
        (items ?? []) as ItemRow[],
        row.forgotten_days ?? 30,
      );

      if (!candidate) {
        skipped += 1;
        continue;
      }

      const title =
        candidate.title ||
        (candidate.type === "link" ? "Başlıksız link" : "Başlıksız not");
      const age = getDaysSinceTouch(candidate);

      const payload = {
        title: "ClarioNot",
        body: `${age} gündür dönmediğin "${title}" bugün tekrar işine yarayabilir.`,
        url: `/dashboard?focus=${candidate.id}&view=forgotten`,
        kind: "forgotten_item" as const,
        itemId: candidate.id,
        tag: `forgotten-${candidate.id}`,
      };

      const results = await Promise.allSettled(
        (subscriptions as SubscriptionRow[]).map(async (subscription) => {
          await sendWebPush(subscription, payload);
          return subscription.endpoint;
        }),
      );

      await revokeExpiredSubscriptions(
        row.user_id,
        subscriptions as SubscriptionRow[],
        results,
      );

      const okCount = results.filter(
        (result) => result.status === "fulfilled",
      ).length;
      if (okCount === 0) {
        await supabase.from("notification_log").insert({
          user_id: row.user_id,
          item_id: candidate.id,
          channel: "web_push",
          kind: "forgotten_item",
          status: "failed",
          sent_at: new Date().toISOString(),
        });

        skipped += 1;
        continue;
      }

      sent += okCount;

      await supabase.from("notification_log").insert({
        user_id: row.user_id,
        item_id: candidate.id,
        channel: "web_push",
        kind: "forgotten_item",
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      await supabase
        .from("user_settings")
        .update({ push_last_sent_at: new Date().toISOString() })
        .eq("user_id", row.user_id);
    }

    return NextResponse.json({ ok: true, sent, skipped });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Forgotten push send failed" },
      { status: 500 },
    );
  }
}
