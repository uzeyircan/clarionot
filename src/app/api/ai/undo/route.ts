import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function requireUser(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

async function getUserIdFromToken(token: string) {
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;
  return user.id;
}

export async function POST(req: Request) {
  try {
    const token = requireUser(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const itemId = String(body?.itemId ?? "").trim();

    if (!itemId) {
      return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
    }

    const { data: item, error: itemErr } = await supabaseAdmin
      .from("items")
      .select(
        `
        id,
        user_id,
        ai_summary,
        ai_tags,
        ai_category,
        ai_prev_summary,
        ai_prev_tags,
        ai_prev_category
      `,
      )
      .eq("id", itemId)
      .eq("user_id", userId)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const hasPrev =
      item.ai_prev_summary !== null ||
      (Array.isArray(item.ai_prev_tags) && item.ai_prev_tags.length > 0) ||
      item.ai_prev_category !== null;

    if (!hasPrev) {
      return NextResponse.json(
        { error: "Undo için önceki AI verisi yok" },
        { status: 400 },
      );
    }

    const { error: upErr } = await supabaseAdmin
      .from("items")
      .update({
        ai_summary: item.ai_prev_summary ?? null,
        ai_tags: Array.isArray(item.ai_prev_tags) ? item.ai_prev_tags : [],
        ai_category: item.ai_prev_category ?? null,
        ai_status: "done",
        ai_error: null,

        // prev alanları temizle
        ai_prev_summary: null,
        ai_prev_tags: [],
        ai_prev_category: null,
      })
      .eq("id", itemId)
      .eq("user_id", userId);

    if (upErr) throw upErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
