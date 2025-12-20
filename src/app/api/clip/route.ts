import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs"; // crypto için net olsun
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // Netlify env ayarlanmamışsa anlaşılır hata
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

function corsHeaders() {
  // extension/3rd-party çağıracak diye * verdim.
  // İstersen ileride sadece kendi domainlerine daraltırız.
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request) {
  try {
    // 1) Token al
    const auth = req.headers.get("authorization") ?? "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const rawToken = m?.[1]?.trim();
    if (!rawToken) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token." },
        { status: 401, headers: corsHeaders() }
      );
    }

    const token_hash = sha256Hex(rawToken);

    // 2) Token doğrula (aktif mi?)
    const { data: tokenRow, error: tokenErr } = await admin
      .from("clip_tokens")
      .select("user_id, revoked_at")
      .eq("token_hash", token_hash)
      .maybeSingle();

    if (tokenErr) throw tokenErr;

    if (!tokenRow || tokenRow.revoked_at) {
      return NextResponse.json(
        { error: "Invalid or revoked token." },
        { status: 401, headers: corsHeaders() }
      );
    }

    const userId = tokenRow.user_id as string;

    // 3) Body parse et
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400, headers: corsHeaders() }
      );
    }

    const type = body.type === "note" ? "note" : "link"; // default link
    const title = String(body.title ?? "").trim();
    const tags = Array.isArray(body.tags)
      ? body.tags
          .map((t: any) => String(t).trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    let content = String(body.content ?? "").trim();
    const note = String(body.note ?? "").trim();

    // link formatını senin uygulamanla uyumlu yapalım:
    // URL \n\n açıklama
    if (type === "link") {
      let url = String(body.url ?? content).trim();
      if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;

      content = url;
      if (note) content = `${url}\n\n${note}`;
    }

    if (!title && !content) {
      return NextResponse.json(
        { error: "title or content required." },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 4) items insert
    const { data: inserted, error: insErr } = await admin
      .from("items")
      .insert({
        user_id: userId,
        type,
        title,
        content,
        tags,
      })
      .select("id")
      .single();

    if (insErr) throw insErr;

    return NextResponse.json(
      { ok: true, id: inserted.id },
      { status: 200, headers: corsHeaders() }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500, headers: corsHeaders() }
    );
  }
}
