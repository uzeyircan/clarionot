import type { Item, ItemType, WorkStatus } from "@/lib/types";

export type Group = { id: string; title: string; created_at?: string };

export type ItemDraft = {
  id?: string;
  type: ItemType;
  title: string;
  content: string;
  tags: string[];
  note?: string;
  group_id?: string | null;
};

export function emptyDraft(type: ItemType): ItemDraft {
  return { type, title: "", content: "", note: "", tags: [], group_id: null };
}

export type WorkStatusFilter = "all" | WorkStatus;
export type ForgottenSegment = "all" | "7" | "30" | "90" | "today" | "snoozed";

export const WORK_STATUS_META: Record<
  WorkStatus,
  { label: string; shortLabel: string; description: string }
> = {
  later: {
    label: "Sonra",
    shortLabel: "Sonra",
    description: "Henüz işleme alınmamış kayıtlar",
  },
  today: {
    label: "Bugün bak",
    shortLabel: "Bugün",
    description: "Bugün dönmek istediğin kayıtlar",
  },
  doing: {
    label: "İşleniyor",
    shortLabel: "İşleniyor",
    description: "Üzerinde çalıştığın kayıtlar",
  },
  done: {
    label: "Tamamlandı",
    shortLabel: "Bitti",
    description: "Okunmuş veya sonuca bağlanmış kayıtlar",
  },
};

export function parseLinkContent(content: string) {
  const raw = (content ?? "").trim();
  if (!raw) return { url: "", note: "" };

  const parts = raw.split(/\n\s*\n/);
  const url = (parts[0] ?? "").trim();
  const note = parts.slice(1).join("\n\n").trim();
  return { url, note };
}

export function joinLinkContent(url: string, note: string) {
  let content = (url ?? "").trim();
  if (content && !/^https?:\/\//i.test(content)) content = "https://" + content;
  const trimmedNote = (note ?? "").trim();
  if (trimmedNote) content = `${content}\n\n${trimmedNote}`;
  return content;
}

export function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function baseDateOf(item: Pick<Item, "last_viewed_at" | "created_at">) {
  return new Date(item.last_viewed_at ?? item.created_at);
}

export function daysAgoFrom(date: Date) {
  const ms = Date.now() - date.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export function daysSinceBase(item: Pick<Item, "last_viewed_at" | "created_at">) {
  const time = baseDateOf(item).getTime();
  if (!Number.isFinite(time)) return 0;
  return daysAgoFrom(new Date(time));
}

export function formatDaysAgo(days: number) {
  if (days <= 0) return "bugün";
  if (days === 1) return "1 gün önce";
  return `${days} gün önce`;
}

export function snoozeLeftLabel(iso?: string | null) {
  if (!iso) return null;
  const until = new Date(iso).getTime();
  const diff = until - Date.now();
  if (diff <= 0) return null;

  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return days <= 1 ? "Erteleme: 1g kaldı" : `Erteleme: ${days}g kaldı`;
}

export function isActivelySnoozed(item: any) {
  const snoozedUntil = item?.snoozed_until as string | null | undefined;
  if (!snoozedUntil) return false;
  return new Date(snoozedUntil).getTime() > Date.now();
}

export function categoryMeta(category?: string | null) {
  const value = (category ?? "").toLowerCase();
  switch (value) {
    case "documentation":
      return { label: "Doküman", icon: "📘" };
    case "inspiration":
      return { label: "İlham", icon: "💡" };
    case "tool":
      return { label: "Araç", icon: "🛠" };
    case "pricing":
      return { label: "Fiyat", icon: "💵" };
    case "competitor":
      return { label: "Rakip", icon: "🥊" };
    case "article":
      return { label: "Yazı", icon: "📰" };
    case "other":
      return { label: "Diğer", icon: "📌" };
    default:
      return null;
  }
}

export function isDebugAiSummary(summary: string) {
  const lower = summary.toLowerCase();
  return (
    lower.includes("ai is disabled") ||
    lower.includes("set ai_enabled") ||
    lower.includes("openai_api_key") ||
    lower.includes("generate real summary") ||
    lower.includes("mock")
  );
}

export function canUndoAi(item: any) {
  return !!(
    item?.ai_prev_summary ||
    (item?.ai_prev_tags && item.ai_prev_tags.length > 0) ||
    item?.ai_prev_category
  );
}
