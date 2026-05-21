import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RecallItem = {
  id: string;
  type: "note" | "link";
  title: string;
  tags: string[] | null;
  content: string;
  group_id?: string | null;
  ai_summary?: string | null;
  updated_at: string;
  last_viewed_at?: string | null;
  created_at: string;
};

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function parseLinkContent(content: string) {
  const raw = (content ?? "").trim();
  if (!raw) return { url: "", note: "" };

  const parts = raw.split(/\n\s*\n/);
  return {
    url: (parts[0] ?? "").trim(),
    note: parts.slice(1).join("\n\n").trim(),
  };
}

function getHostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function tokenize(text: string) {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "are",
    "you",
    "your",
    "bir",
    "ve",
    "ile",
    "için",
    "gibi",
    "daha",
    "çok",
    "ama",
    "olan",
    "gün",
    "note",
    "link",
    "page",
  ]);

  return Array.from(
    new Set(
      String(text || "")
        .toLowerCase()
        .split(/[^a-z0-9çğıöşü]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !stop.has(token)),
    ),
  ).slice(0, 18);
}

function daysAgo(value: string) {
  const time = new Date(value).getTime();
  return Math.max(0, Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000)));
}

function scoreItem(item: RecallItem, pageHostname: string, keywords: string[]) {
  let score = 0;
  let matchedHostname = false;

  const title = (item.title ?? "").toLowerCase();
  const summary = (item.ai_summary ?? "").toLowerCase();
  const tags = Array.isArray(item.tags) ? item.tags.join(" ").toLowerCase() : "";
  const linkMeta =
    item.type === "link"
      ? parseLinkContent(item.content ?? "")
      : { url: "", note: item.content ?? "" };
  const content = `${linkMeta.note} ${item.content ?? ""}`.toLowerCase();
  const itemHostname = linkMeta.url ? getHostname(linkMeta.url) : "";

  if (pageHostname && itemHostname && pageHostname === itemHostname) {
    score += 8;
    matchedHostname = true;
  }

  for (const keyword of keywords) {
    if (title.includes(keyword)) score += 5;
    if (tags.includes(keyword)) score += 4;
    if (summary.includes(keyword)) score += 3;
    if (content.includes(keyword)) score += 2;
  }

  if (daysAgo(item.last_viewed_at ?? item.created_at) <= 7) {
    score += 1;
  }

  return {
    score,
    matchedHostname,
  };
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json({ error: "TOKEN_MISSING" }, { status: 401 });
    }

    const tokenHash = sha256Hex(token);
    const { data: tok, error: tokErr } = await supabaseAdmin
      .from("clip_tokens")
      .select("id,user_id,revoked_at")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .maybeSingle();

    if (tokErr) throw tokErr;
    if (!tok?.user_id) {
      return NextResponse.json({ error: "TOKEN_INVALID" }, { status: 401 });
    }

    await supabaseAdmin
      .from("clip_tokens")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", tok.id);

    const body = await req.json().catch(() => ({}));
    const pageUrl = String(body?.pageUrl ?? "").trim();
    const pageTitle = String(body?.title ?? "").trim();
    const selection = String(body?.selection ?? "").trim();
    const pageHostname = getHostname(pageUrl);
    const keywords = tokenize(`${pageTitle} ${selection} ${pageHostname}`);

    const { data, error } = await supabaseAdmin
      .from("items")
      .select(
        "id,type,title,tags,content,group_id,ai_summary,updated_at,last_viewed_at,created_at",
      )
      .eq("user_id", tok.user_id)
      .order("updated_at", { ascending: false })
      .limit(120);

    if (error) throw error;

    const groupIds = Array.from(
      new Set(
        ((data ?? []) as RecallItem[])
          .map((item) => item.group_id)
          .filter(Boolean) as string[],
      ),
    );

    let groupTitleMap = new Map<string, string>();
    if (groupIds.length) {
      const { data: groupRows, error: groupError } = await supabaseAdmin
        .from("groups")
        .select("id,title")
        .in("id", groupIds);

      if (groupError) throw groupError;
      groupTitleMap = new Map(
        ((groupRows ?? []) as GroupRow[]).map((group) => [group.id, group.title]),
      );
    }

    const recall = ((data ?? []) as RecallItem[])
      .map((item) => {
        const result = scoreItem(item, pageHostname, keywords);
        const { url } =
          item.type === "link" ? parseLinkContent(item.content ?? "") : { url: "" };

        return {
          id: item.id,
          type: item.type,
          title: item.title || (item.type === "link" ? "Başlıksız link" : "Başlıksız not"),
          tags: item.tags ?? [],
          summary: item.ai_summary || "",
          hostname: url ? getHostname(url) : "",
          age_days: daysAgo(item.last_viewed_at ?? item.created_at),
          group_id: item.group_id || "",
          group_title: item.group_id ? groupTitleMap.get(item.group_id) || "" : "",
          score: result.score,
          matched_hostname: result.matchedHostname,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.age_days - b.age_days)
      .slice(0, 4);

    return NextResponse.json({ recall });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
type GroupRow = {
  id: string;
  title: string;
};
