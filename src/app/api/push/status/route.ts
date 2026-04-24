import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(req: Request) {
  try {
    const user = await getUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [subscriptionRes, settingsRes, logRes] = await Promise.all([
      supabase
        .from("device_push_subscriptions")
        .select("endpoint,platform,last_seen_at,created_at")
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .order("updated_at", { ascending: false }),
      supabase
        .from("user_settings")
        .select(
          "push_frequency,push_last_sent_at,timezone,push_quiet_hours_start,push_quiet_hours_end,push_max_per_day",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("notification_log")
        .select("kind,status,sent_at,item_id")
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(10),
    ]);

    if (subscriptionRes.error) throw subscriptionRes.error;
    if (settingsRes.error) throw settingsRes.error;
    if (logRes.error) throw logRes.error;

    return NextResponse.json({
      ok: true,
      permission:
        req.headers.get("x-client-push-permission") ?? "unknown",
      subscriptions: subscriptionRes.data ?? [],
      settings: settingsRes.data ?? null,
      recent_log: logRes.data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Push status could not be loaded" },
      { status: 500 },
    );
  }
}
