"use client";

import React, { useMemo } from "react";
import type { Item } from "@/lib/types";

function parseLinkContent(content: string) {
  const raw = (content ?? "").trim();
  if (!raw) return { url: "", note: "" };

  // Biz linkte content'i şu formatta kaydediyoruz:
  // URL \n\n açıklama
  const parts = raw.split(/\n\s*\n/);
  const url = (parts[0] ?? "").trim();
  const note = parts.slice(1).join("\n\n").trim();
  return { url, note };
}

export default function ItemCard({
  item,
  onOpen,
}: {
  item: Item;
  onOpen: (item: Item) => void;
}) {
  const isLink = item.type === "link";

  const { url, note } = useMemo(() => {
    return isLink ? parseLinkContent(item.content) : { url: "", note: "" };
  }, [isLink, item.content]);

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="w-full overflow-hidden text-left rounded-2xl border border-neutral-800 bg-neutral-950 p-4 hover:bg-neutral-900 transition"
    >
      <div className="text-xs text-neutral-400 min-w-0 break-words">
        {isLink ? "🔗 Link" : "📝 Not"} ·{" "}
        {new Date(item.created_at).toLocaleString("tr-TR")}
      </div>

      <div className="mt-1 text-sm font-semibold min-w-0 break-words line-clamp-1">
        {item.title || (isLink ? "Başlıksız link" : "Başlıksız not")}
      </div>

      {/* CONTENT */}
      {isLink ? (
        <div className="mt-2 space-y-1 min-w-0">
          {/* URL */}
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block min-w-0 text-sm text-neutral-200 underline decoration-neutral-700 hover:decoration-neutral-300 break-all"
            >
              {url}
            </a>
          ) : (
            <div className="text-sm text-neutral-400">URL yok</div>
          )}

          {/* Açıklama */}
          {note ? (
            <div className="text-sm text-neutral-300 min-w-0 break-words whitespace-pre-wrap line-clamp-2">
              {note}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 text-sm text-neutral-300 min-w-0 break-words whitespace-pre-wrap line-clamp-2">
          {item.content}
        </div>
      )}

      {/* TAGS */}
      {item.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-2 min-w-0">
          {item.tags.slice(0, 6).map((t) => (
            <span
              key={t}
              className="max-w-full overflow-hidden text-ellipsis rounded-full border border-neutral-800 px-2 py-0.5 text-xs text-neutral-300"
            >
              #{t}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
