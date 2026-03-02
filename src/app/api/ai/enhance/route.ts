import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function getBearer(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

async function requireAuthedUserId(req: Request) {
  const token = getBearer(req);
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) return null;

  return data.user.id;
}

async function isProUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_plan")
    .select("plan,status,current_period_end,grace_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return false;

  const statusOk = data.status === "active" || data.status === "trialing";

  const stillValid =
    !!data.current_period_end &&
    new Date(data.current_period_end).getTime() > Date.now();

  const inGrace =
    !!(data as any).grace_until &&
    new Date((data as any).grace_until).getTime() > Date.now();

  return data.plan === "pro" && (statusOk || stillValid || inGrace);
}

type EnhanceBody = {
  itemIds?: string[];
  groupId?: string | null; // null => inbox
  stream?: boolean;
};

export async function POST(req: Request) {
  try {
    const userId = await requireAuthedUserId(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pro = await isProUser(userId);
    if (!pro) {
      return NextResponse.json(
        { error: "AI Enhance sadece Pro’da" },
        { status: 403 },
      );
    }

    const body = (await req.json().catch(() => null)) as EnhanceBody | null;

    const wantsStream =
      body?.stream === true ||
      (req.headers.get("accept") ?? "").includes("text/event-stream");

    let itemIds: string[] = Array.isArray(body?.itemIds)
      ? body!.itemIds.map((x) => String(x)).filter(Boolean)
      : [];

    // ✅ Eğer itemIds boşsa ama groupId geldiyse: gruptaki item'ları çek
    if (itemIds.length === 0 && "groupId" in (body ?? {})) {
      const groupId = (body as any).groupId as string | null | undefined;

      let q = supabaseAdmin
        .from("items")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (groupId === null) q = q.is("group_id", null);
      else if (typeof groupId === "string" && groupId.trim())
        q = q.eq("group_id", groupId.trim());
      else
        return NextResponse.json({ error: "Invalid groupId" }, { status: 400 });

      const { data, error } = await q;
      if (error) throw error;

      itemIds = (data ?? []).map((r: any) => String(r.id)).filter(Boolean);
    }

    if (!itemIds.length) {
      return NextResponse.json(
        { error: "Missing itemIds or groupId" },
        { status: 400 },
      );
    }

    if (!process.env.INTERNAL_AI_SECRET) {
      return NextResponse.json(
        { error: "Missing INTERNAL_AI_SECRET" },
        { status: 500 },
      );
    }

    const origin = process.env.APP_ORIGIN || new URL(req.url).origin;

    const concurrency = 4;

    // ✅ Non-stream klasik JSON cevap
    if (!wantsStream) {
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
      return NextResponse.json({
        ok: true,
        total: itemIds.length,
        okCount,
        failCount,
      });
    }

    // ✅ STREAM (SSE) cevap
    const total = itemIds.length;

    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        const send = (event: string, data: any) => {
          controller.enqueue(
            enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        };

        let idx = 0;
        let done = 0;
        let okCount = 0;
        let failCount = 0;

        send("start", { total });

        const runOne = async (itemId: string) => {
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
            send("progress", {
              total,
              done: ++done,
              okCount,
              failCount,
              itemId,
              ok: true,
            });
          } catch (e: any) {
            failCount++;
            send("progress", {
              total,
              done: ++done,
              okCount,
              failCount,
              itemId,
              ok: false,
              error: e?.message ?? "failed",
            });
          }
        };

        // basit concurrency pool
        (async () => {
          const inFlight = new Set<Promise<void>>();

          const launchNext = () => {
            if (idx >= itemIds.length) return;
            const itemId = String(itemIds[idx++]);
            const p = runOne(itemId).finally(() => inFlight.delete(p));
            inFlight.add(p);
          };

          // ilk dalga
          for (let i = 0; i < Math.min(concurrency, itemIds.length); i++)
            launchNext();

          while (inFlight.size > 0) {
            await Promise.race(inFlight);
            launchNext();
          }

          send("done", { total, okCount, failCount });
          controller.close();
        })().catch((err) => {
          send("error", { message: err?.message ?? "stream failed" });
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
