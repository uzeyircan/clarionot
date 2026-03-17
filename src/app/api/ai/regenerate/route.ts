import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    );

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const itemId = String(body?.itemId ?? "").trim();

    if (!itemId) {
      return NextResponse.json({ error: "itemId gerekli" }, { status: 400 });
    }

    const { data: item, error: itemErr } = await supabase
      .from("items")
      .select("*")
      .eq("id", itemId)
      .eq("user_id", user.id)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: "Item bulunamadı" }, { status: 404 });
    }

    if (item.ai_status === "processing") {
      return NextResponse.json({ error: "Zaten işleniyor" }, { status: 400 });
    }

    const { error: snapshotErr } = await supabase
      .from("items")
      .update({
        ai_prev_summary: item.ai_summary ?? null,
        ai_prev_tags: item.ai_tags ?? [],
        ai_prev_category: item.ai_category ?? null,
      })
      .eq("id", itemId)
      .eq("user_id", user.id);

    if (snapshotErr) {
      return NextResponse.json(
        { error: "Snapshot alınamadı" },
        { status: 500 },
      );
    }

    const { error: processingErr } = await supabase
      .from("items")
      .update({
        ai_status: "processing",
        ai_error: null,
      })
      .eq("id", itemId)
      .eq("user_id", user.id);

    if (processingErr) {
      return NextResponse.json(
        { error: "Processing state ayarlanamadı" },
        { status: 500 },
      );
    }

    const baseUrl = process.env.APP_ORIGIN || new URL(req.url).origin;

    const processRes = await fetch(`${baseUrl}/api/ai/process-item`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_AI_SECRET!,
      },
      body: JSON.stringify({ itemId }),
    });

    const text = await processRes.text().catch(() => "");

    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {};
    }

    if (!processRes.ok) {
      await supabase
        .from("items")
        .update({
          ai_status: "failed",
          ai_error: json?.error || "AI process failed",
        })
        .eq("id", itemId)
        .eq("user_id", user.id);

      return NextResponse.json(
        { error: json?.error || "AI process failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal error" },
      { status: 500 },
    );
  }
}
