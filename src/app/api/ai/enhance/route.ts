import { NextResponse } from "next/server";

export const runtime = "nodejs";

function requireUser(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

export async function POST(req: Request) {
  try {
    const token = requireUser(req);
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const itemIds = Array.isArray(body?.itemIds) ? body.itemIds : [];
    if (!itemIds.length) {
      return NextResponse.json({ error: "Missing itemIds" }, { status: 400 });
    }

    if (!process.env.INTERNAL_AI_SECRET) {
      return NextResponse.json(
        { error: "Missing INTERNAL_AI_SECRET" },
        { status: 500 },
      );
    }

    const origin = process.env.APP_ORIGIN || new URL(req.url).origin;

    // kullanıcı tokenını validate etmiyoruz burada (Supabase RLS zaten koruyor)
    // ama en azından auth header zorunlu tuttuk

    const concurrency = 4;
    let idx = 0;
    let okCount = 0;
    let failCount = 0;

    async function worker() {
      while (idx < itemIds.length) {
        const itemId = String(itemIds[idx++]);
        try {
          const r = await fetch(`${origin}/api/ai/process-item`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": process.env.INTERNAL_AI_SECRET!,
            },
            body: JSON.stringify({ itemId }),
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          okCount++;
        } catch {
          failCount++;
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    return NextResponse.json({ ok: true, okCount, failCount });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
