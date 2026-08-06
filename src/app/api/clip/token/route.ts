import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing env vars: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function randomTokenHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex"); // 64 chars
}

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
    // 1) Kullanıcı kim? (Free/Pro fark etmeksizin geçerli bir Supabase
    // oturumu şart — kimlik doğrulaması korunuyor.)
    const user = await getUserFromAuthHeader(req);
    const userId = user?.id ?? null;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Missing or invalid Supabase access token." },
        { status: 401 }
      );
    }

    // ✅ Free + Pro: her giriş yapmış kullanıcı token alabilir.
    // Free/Pro ayrımı artık bağlantı anında değil, /api/clip'te
    // (kayıt oluşturma anında) uygulanıyor.

    // 3) Aynı label’daki eski tokenları revoke et (tek aktif kalsın)
    await admin
      .from("clip_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("label", "Browser Extension")
      .is("revoked_at", null);

    // 4) Yeni token üret + hashle
    const rawToken = randomTokenHex(32);
    const token_hash = sha256Hex(rawToken);

    // 5) DB insert
    const { error: insErr } = await admin.from("clip_tokens").insert({
      user_id: userId,
      token_hash,
      label: "Browser Extension",
    });

    if (insErr) throw insErr;

    // 6) Raw token döndür (extension alacak)
    return NextResponse.json({ token: rawToken }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
