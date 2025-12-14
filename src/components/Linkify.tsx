"use client";
import React from "react";

const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

function normalizeUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return "https://" + url; // www. ile başlıyorsa da çalışsın
}

export default function Linkify({ text }: { text: string }) {
  const parts = (text ?? "").split(urlRegex);

  return (
    <span>
      {parts.map((part, i) => {
        const isUrl = urlRegex.test(part);
        // regex test state'li olabildiği için reset:
        urlRegex.lastIndex = 0;

        if (!isUrl) return <span key={i}>{part}</span>;

        const href = normalizeUrl(part);
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="underline decoration-neutral-700 hover:decoration-neutral-300 break-all"
          >
            {part}
          </a>
        );
      })}
    </span>
  );
}
