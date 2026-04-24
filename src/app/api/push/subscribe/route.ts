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

export async function POST(req: Request) {
  try {
    const user = await getUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const subscription = body?.subscription;

    const endpoint =
      typeof subscription?.endpoint === "string" ? subscription.endpoint : "";
    const p256dh =
      typeof subscription?.keys?.p256dh === "string"
        ? subscription.keys.p256dh
        : "";
    const auth =
      typeof subscription?.keys?.auth === "string" ? subscription.keys.auth : "";

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Invalid subscription payload" },
        { status: 400 },
      );
    }

    const deviceLabel =
      typeof body?.deviceLabel === "string" ? body.deviceLabel : "Browser";
    const userAgent =
      typeof body?.userAgent === "string" ? body.userAgent : null;
    const platform =
      body?.platform === "ios" || body?.platform === "android"
        ? body.platform
        : "web";

    const nowIso = new Date().toISOString();

    const { error } = await supabase.from("device_push_subscriptions").upsert(
      {
        user_id: user.id,
        platform,
        endpoint,
        p256dh,
        auth,
        device_label: deviceLabel,
        user_agent: userAgent,
        last_seen_at: nowIso,
        revoked_at: null,
        updated_at: nowIso,
      },
      { onConflict: "endpoint" },
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Subscription could not be saved" },
      { status: 500 },
    );
  }
}
