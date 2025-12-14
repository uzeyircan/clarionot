"use client";

import React, { useMemo, useState } from "react";

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
};

function normalizeTag(s: string) {
  return s.trim().replace(/^#/, "").toLowerCase();
}

export default function TagInput({ value, onChange, placeholder = "etiket ekle (virgül/enter)" }: Props) {
  const [draft, setDraft] = useState("");

  const tags = useMemo(() => value.filter(Boolean), [value]);

  const addTags = (raw: string) => {
    const parts = raw.split(",").map(normalizeTag).filter(Boolean);
    if (parts.length === 0) return;
    const next = Array.from(new Set([...tags, ...parts])).slice(0, 12);
    onChange(next);
    setDraft("");
  };

  const remove = (t: string) => onChange(tags.filter((x) => x !== t));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-3 py-1 text-xs">
            #{t}
            <button type="button" className="text-neutral-400 hover:text-neutral-200" onClick={() => remove(t)}>×</button>
          </span>
        ))}
      </div>
      <input
        className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-neutral-600"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTags(draft);
          }
        }}
        onBlur={() => addTags(draft)}
      />
    </div>
  );
}
