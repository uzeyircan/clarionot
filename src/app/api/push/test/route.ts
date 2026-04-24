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

async function getUser(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}

export async function POST(req: Request) {
  try {
    const user = await getUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: subscriptions, error } = await supabase
      .from("device_push_subscriptions")
      .select("endpoint,p256dh,auth")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .eq("platform", "web");

    if (error) throw error;
    if (!subscriptions?.length) {
      return NextResponse.json(
        { error: "No active web push subscription found" },
        { status: 400 },
      );
    }

    const payload = {
      title: "ClarioNot",
      body: "Push bildirimi hazır. Artık unutulan notlar bu cihaza gelebilir.",
      url: "/dashboard?view=forgotten",
      kind: "test" as const,
      tag: "clarionot-test",
    };

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        await sendWebPush(subscription, payload);
        return subscription.endpoint;
      }),
    );

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

    if (staleEndpoints.length > 0) {
      await supabase
        .from("device_push_subscriptions")
        .update({
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in("endpoint", staleEndpoints)
        .eq("user_id", user.id);
    }

    const okCount = results.filter(
      (result) => result.status === "fulfilled",
    ).length;
    if (okCount === 0) {
      return NextResponse.json(
        { error: "Test notification could not be sent" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, sent: okCount });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Test notification failed" },
      { status: 500 },
    );
  }
}
