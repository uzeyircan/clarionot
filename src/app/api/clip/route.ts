import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs"; // crypto için net olsun
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing env vars: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY",
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
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function hostnameTitle(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function firstLineTitle(text: string) {
  const line = (text || "")
    .split("\n")
    .map((s) => s.trim())
    .find(Boolean);
  return (line || "").slice(0, 80);
}

async function fetchTitleFromUrl(url: string) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000); // 5 sn timeout

    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      },
    });

    clearTimeout(t);

    const html = await res.text();

    const og =
      html.match(
        /property=["']og:title["']\s*content=["']([^"']+)["']/i,
      )?.[1] ?? "";
    const tw =
      html.match(
        /name=["']twitter:title["']\s*content=["']([^"']+)["']/i,
      )?.[1] ?? "";
    const tt = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "";

    return String(og || tw || tt || "").trim();
  } catch {
    return "";
  }
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
        { status: 401, headers: corsHeaders() },
      );
    }

    const token_hash = sha256Hex(rawToken);

    // 2) Token doğrula (aktif mi?)
    const { data: tokenRow, error: tokenErr } = await admin
      .from("clip_tokens")
      .select("id, user_id, revoked_at")
      .eq("token_hash", token_hash)
      .is("revoked_at", null)
      .maybeSingle();

    if (tokenErr) throw tokenErr;

    if (!tokenRow) {
      return NextResponse.json(
        { error: "Invalid or revoked token." },
        { status: 401, headers: corsHeaders() },
      );
    }

    const userId = tokenRow.user_id as string;
    // token doğrulandıktan sonra, pro kontrolünden önce/sonra fark etmez
    await admin
      .from("clip_tokens")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    // ✅ Pro kontrolü (downgrade olursa çalışmasın)
    const { data: planRow, error: planErr } = await admin
      .from("user_plan")
      .select("plan,status")
      .eq("user_id", userId)
      .maybeSingle();

    if (planErr) throw planErr;

    const okPro =
      planRow?.plan === "pro" &&
      (planRow?.status === "active" || planRow?.status === "trialing");

    if (!okPro) {
      return NextResponse.json(
        { error: "Pro plan required." },
        { status: 403, headers: corsHeaders() },
      );
    }

    // 3) Body parse et
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400, headers: corsHeaders() },
      );
    }

    const type = body.type === "note" ? "note" : "link"; // default link
    let title = String(body.title ?? "").trim();

    const tags = Array.isArray(body.tags)
      ? body.tags
          .map((t: any) => String(t).trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    let content = String(body.content ?? "").trim();
    const note = String(body.note ?? "").trim();

    // ✅✅✅ GROUP_ID: body’den al + doğrula (bu user’ın grubu mu?)
    let group_id: string | null =
      body.group_id === undefined ||
      body.group_id === null ||
      body.group_id === ""
        ? null
        : String(body.group_id);

    if (group_id) {
      const { data: g, error: gErr } = await admin
        .from("groups")
        .select("id")
        .eq("id", group_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (gErr) throw gErr;
      if (!g) group_id = null; // user’a ait değilse inbox’a düşsün
    }

    // link formatı: URL \n\n açıklama
    if (type === "link") {
      let url = String(body.url ?? content).trim();
      if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;

      content = url;
      if (note) content = `${url}\n\n${note}`;

      // ✅ TITLE AUTO: title boşsa URL’den çek
      if (!title) {
        try {
          const fetched = await fetchTitleFromUrl(url);
          title = fetched || hostnameTitle(url) || "Başlıksız link";
        } catch {
          title = hostnameTitle(url) || "Başlıksız link";
        }
      }
    }

    if (type === "note") {
      // ✅ NOTE TITLE AUTO: title boşsa ilk satır
      if (!title) {
        title = firstLineTitle(content) || "Başlıksız not";
      }
    }

    if (!title && !content) {
      return NextResponse.json(
        { error: "title or content required." },
        { status: 400, headers: corsHeaders() },
      );
    }

    // 4) items insert  ✅✅✅ group_id EKLENDİ
    const { data: inserted, error: insErr } = await admin
      .from("items")
      .insert({
        user_id: userId,
        type,
        title,
        content,
        tags,
        group_id, // ✅ burası kritik
        ai_status: "pending",
      })
      .select("id")
      .single();

    if (insErr) throw insErr;

    // ✅ AI processing tetikle (fire-and-forget). Secret yoksa sessizce geç.
    if (process.env.INTERNAL_AI_SECRET) {
      const origin = process.env.APP_ORIGIN || new URL(req.url).origin;
      void fetch(`${origin}/api/ai/process-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_AI_SECRET,
        },
        body: JSON.stringify({ itemId: inserted.id }),
      });
    }

    // ✅ Token kullanıldı -> last_used_at güncelle
    await admin
      .from("clip_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    return NextResponse.json(
      { ok: true, id: inserted.id },
      { status: 200, headers: corsHeaders() },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500, headers: corsHeaders() },
    );
  }
}
