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
    const itemIds = Array.isArray(body?.itemIds)
      ? body.itemIds.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [];

    if (itemIds.length === 0) {
      return NextResponse.json({ error: "itemIds gerekli" }, { status: 400 });
    }

    const { data: items, error: itemsErr } = await supabase
      .from("items")
      .select("id,user_id")
      .in("id", itemIds)
      .eq("user_id", user.id);

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    const safeIds = (items ?? []).map((x) => x.id);

    if (safeIds.length === 0) {
      return NextResponse.json(
        { error: "İşlenecek item bulunamadı" },
        { status: 404 },
      );
    }

    const baseUrl = process.env.APP_ORIGIN || new URL(req.url).origin;

    let okCount = 0;
    let failCount = 0;

    for (const itemId of safeIds) {
      try {
        const processRes = await fetch(`${baseUrl}/api/ai/regenerate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
          failCount++;
          continue;
        }

        okCount++;
      } catch {
        failCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      total: safeIds.length,
      okCount,
      failCount,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal error" },
      { status: 500 },
    );
  }
}
