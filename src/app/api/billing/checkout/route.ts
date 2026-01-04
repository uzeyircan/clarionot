import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function getUserFromAuthHeader(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const accessToken = m?.[1]?.trim();
  if (!accessToken) return null;

  const { data, error } = await admin.auth.getUser(accessToken);
  if (error) return null;
  return data.user ?? null;
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ İstersen burada user_plan'a bakıp zaten Pro ise dashboard'a yönlendirebilirsin
    // const { data: planRow } = await admin
    //   .from("user_plan")
    //   .select("plan,status")
    //   .eq("user_id", user.id)
    //   .maybeSingle();
    // if (planRow?.plan === "pro" && planRow?.status === "active") {
    //   return NextResponse.json({ url: "/dashboard" }, { status: 200 });
    // }

    // TODO: Burada Paddle / Lemon Squeezy checkout linki oluşturacağız
    // Şimdilik placeholder:
    return NextResponse.json(
      {
        error:
          "Checkout provider not configured yet. Next step: connect Lemon Squeezy or Paddle here and return { url }.",
      },
      { status: 501 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
