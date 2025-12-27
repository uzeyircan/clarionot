import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function getUserIdFromAuthHeader(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const accessToken = m?.[1]?.trim();
  if (!accessToken) return null;

  const { data, error } = await admin.auth.getUser(accessToken);
  if (error) return null;
  return data.user?.id ?? null;
}

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromAuthHeader(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // TODO: iyzico subscription checkout oluştur
    // burada kullanıcı email/isim gibi bilgileri de almak isteyebiliriz
    // admin.auth.getUser(accessToken) ile user info çekebilirsin

    return NextResponse.json(
      { ok: true /* checkoutUrl: "..." */ },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
