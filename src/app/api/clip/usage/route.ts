import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isProFromPlanRow } from "@/lib/planServer";
import { FREE_MONTHLY_CLIP_LIMIT } from "@/lib/clipLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing env vars: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY",
  );
}

// ✅ service-role: yalnızca sunucuda kullanılır, istemciye asla gönderilmez.
const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

// ✅ user_id istemciden (query/body) hiçbir zaman kabul edilmez; kimlik
// yalnızca Authorization: Bearer <supabase access token> üzerinden,
// admin.auth.getUser() ile doğrulanmış oturumdan çıkarılır.
async function getUserFromAuthHeader(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const accessToken = m?.[1]?.trim();
  if (!accessToken) return null;

  const { data, error } = await admin.auth.getUser(accessToken);
  if (error) return null;

  return data.user ?? null;
}

// clip_monthly_usage.period = ayın ilk günü (bkz. create_free_clip_item RPC:
// date_trunc('month', now())::date). Aynı değeri burada da üretiyoruz ki
// aynı ay satırını okuyalım.
function currentPeriodDate(): string {
  const now = new Date();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${mm}-01`;
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user?.id) {
      return noStore({ error: "Unauthorized" }, 401);
    }

    const { data: planRow, error: planErr } = await admin
      .from("user_plan")
      .select("plan,status,current_period_end,grace_until")
      .eq("user_id", user.id)
      .maybeSingle();

    if (planErr) throw planErr;

    if (isProFromPlanRow(planRow)) {
      return noStore({ plan: "pro", unlimited: true });
    }

    // Free: clip_monthly_usage service-role ile okunur (istemciden bu
    // tabloya doğrudan erişim yok — RLS + revoke ile kapalı).
    const { data: usageRow, error: usageErr } = await admin
      .from("clip_monthly_usage")
      .select("count")
      .eq("user_id", user.id)
      .eq("period", currentPeriodDate())
      .maybeSingle();

    if (usageErr) throw usageErr;

    const limit = FREE_MONTHLY_CLIP_LIMIT;
    const used = Math.max(0, usageRow?.count ?? 0);
    const remaining = Math.max(0, limit - used);

    return noStore({
      plan: "free",
      unlimited: false,
      used,
      limit,
      remaining,
    });
  } catch (e: any) {
    return noStore({ error: e?.message ?? "Server error" }, 500);
  }
}
