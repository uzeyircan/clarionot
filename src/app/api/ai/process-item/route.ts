import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function requireInternalSecret(req: Request) {
  const secret = req.headers.get("x-internal-secret") ?? "";
  if (!process.env.INTERNAL_AI_SECRET) {
    throw new Error("Missing INTERNAL_AI_SECRET");
  }
  return secret === process.env.INTERNAL_AI_SECRET;
}

function parseLinkContent(content: string) {
  const raw = (content ?? "").trim();
  const parts = raw.split(/\n\s*\n/);
  const url = (parts[0] ?? "").trim();
  const note = parts.slice(1).join("\n\n").trim();
  return { url, note };
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

async function callOpenAI(input: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "You are an AI research assistant for freelance developers. Return ONLY valid JSON.",
        },
        {
          role: "user",
          content:
            `Analyze and produce JSON with keys: ` +
            `"title"(max 10 words), "summary"(max 40 words), ` +
            `"tags"(array of 3-5 short tags, lowercase), ` +
            `"category"(one of: documentation,inspiration,tool,pricing,competitor,article,other). ` +
            `\n\nCONTENT:\n${input}`,
        },
      ],
      text: { format: { type: "json_object" } },
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI error: ${res.status} ${t}`);
  }

  const data = await res.json();
  const txt = data?.output?.[0]?.content?.[0]?.text ?? data?.output_text ?? "";
  if (!txt) throw new Error("OpenAI returned empty output");

  return JSON.parse(txt) as {
    title?: string;
    summary?: string;
    tags?: string[];
    category?: string;
  };
}

export async function POST(req: Request) {
  let itemId: string | undefined;

  try {
    if (!requireInternalSecret(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    itemId = body?.itemId as string | undefined;

    if (!itemId) {
      return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
    }

    // Item çek
    const { data: item, error: itemErr } = await supabaseAdmin
      .from("items")
      .select("id,user_id,type,title,content,tags,ai_status")
      .eq("id", itemId)
      .single();

    if (itemErr) throw itemErr;

    // ✅ Pro kontrol (ürünleştirme burada)
    const pro = await isProUser(String(item.user_id));
    if (!pro) {
      // Free ise AI alanlarına dokunma, sadece status set et
      await supabaseAdmin
        .from("items")
        .update({ ai_status: "disabled", ai_error: null })
        .eq("id", itemId);

      return NextResponse.json({ ok: true, disabled: true });
    }

    // processing set
    await supabaseAdmin
      .from("items")
      .update({ ai_status: "processing", ai_error: null })
      .eq("id", itemId);

    // Prompt input hazırla
    let input = `type: ${item.type}\ncurrent_title: ${item.title}\n`;

    if (item.type === "link") {
      const { url, note } = parseLinkContent(item.content || "");
      input += `url: ${url}\nnote: ${note}\n`;
    } else {
      input += `note_content:\n${item.content || ""}\n`;
    }

    const out = await callOpenAI(input);

    const aiTitle = (out.title ?? "").trim();
    const aiSummary = (out.summary ?? "").trim();
    const aiTags = Array.isArray(out.tags)
      ? out.tags
          .map((t) => String(t).trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 5)
      : [];
    const aiCategory = (out.category ?? "other").trim().toLowerCase();

    const currentTags = Array.isArray(item.tags) ? item.tags : [];
    const mergedTags = currentTags.length ? currentTags : aiTags;

    // ✅ Başlık doluysa dokunma
    const keepTitle = (item.title ?? "").trim().length > 0;

    const updatePayload: any = {
      ai_summary: aiSummary || null,
      ai_tags: aiTags,
      ai_category: aiCategory,
      ai_status: "done",
      tags: mergedTags,
    };

    if (!keepTitle && aiTitle) updatePayload.title = aiTitle;

    const { error: upErr } = await supabaseAdmin
      .from("items")
      .update(updatePayload)
      .eq("id", itemId);

    if (upErr) throw upErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (itemId) {
      try {
        await supabaseAdmin
          .from("items")
          .update({ ai_status: "failed", ai_error: e?.message ?? "AI failed" })
          .eq("id", itemId);
      } catch {}
    }

    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
