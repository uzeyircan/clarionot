// app/api/clip/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

type Body = {
  type: "link" | "note";
  url?: string; // link için
  text?: string; // seçili metin (note için veya link açıklaması)
  note?: string; // opsiyonel açıklama
  tags?: string[];
  title?: string; // opsiyonel
};

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : "";

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const tokenHash = sha256(token);

    // token doğrula
    const { data: tokenRow, error: tErr } = await supabaseAdmin
      .from("clip_tokens")
      .select("user_id, revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tErr || !tokenRow || tokenRow.revoked_at) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = (await req.json()) as Body;
    const type = body.type;

    if (type !== "link" && type !== "note") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // içerik üret
    let title = (body.title || "").trim();
    let content = "";

    if (type === "link") {
      let url = (body.url || "").trim();
      if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;

      if (!url)
        return NextResponse.json({ error: "Missing url" }, { status: 400 });

      // content formatın: URL \n\n açıklama
      const parts: string[] = [url];
      const extra = (body.note || body.text || "").trim();
      if (extra) parts.push("", extra);
      content = parts.join("\n");

      if (!title) {
        // fallback başlık: domain
        try {
          const u = new URL(url);
          title = u.hostname.replace("www.", "");
        } catch {}
      }
    } else {
      // note
      content = (body.text || body.note || "").trim();
      if (!content)
        return NextResponse.json({ error: "Missing text" }, { status: 400 });
      if (!title) title = content.slice(0, 60);
    }

    const tags = Array.isArray(body.tags) ? body.tags.slice(0, 12) : [];

    const { error: insErr } = await supabaseAdmin.from("items").insert({
      user_id: tokenRow.user_id,
      type,
      title,
      content,
      tags,
    });

    if (insErr) throw insErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
