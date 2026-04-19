"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import DnaBackdrop from "@/components/DnaBackdrop";
import { supabase } from "@/lib/supabase";
import type { Item, WorkStatus } from "@/lib/types";
import {
  applyThemeAccent,
  DEFAULT_THEME_ACCENT,
  THEME_PRESETS,
  THEME_STORAGE_KEY,
  type ThemeAccent,
} from "@/lib/theme";

type Group = {
  id: string;
  title: string;
  created_at?: string | null;
};

const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  later: "Sonra",
  today: "Bugün bak",
  doing: "İşleniyor",
  done: "Tamamlandı",
};

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  const text = Array.isArray(value)
    ? value.join(", ")
    : value === null || value === undefined
      ? ""
      : String(value);

  return `"${text.replace(/"/g, '""')}"`;
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

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [themeAccent, setThemeAccent] =
    useState<ThemeAccent>(DEFAULT_THEME_ACCENT);
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeMessage, setThemeMessage] = useState<string | null>(null);

  const groupMap = useMemo(() => {
    return new Map(groups.map((group) => [group.id, group.title]));
  }, [groups]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      const uid = session?.user?.id;

      if (!uid) {
        window.location.href = "/login";
        return;
      }

      setEmail(session.user.email ?? "");

      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme) setThemeAccent(storedTheme as ThemeAccent);

      const settingsRes = await supabase
        .from("user_settings")
        .select("theme_accent")
        .eq("user_id", uid)
        .maybeSingle();

      if (!settingsRes.error) {
        const remoteTheme = (settingsRes.data as any)?.theme_accent;
        if (remoteTheme) {
          localStorage.setItem(THEME_STORAGE_KEY, remoteTheme);
          setThemeAccent(remoteTheme as ThemeAccent);
          applyThemeAccent(remoteTheme);
        }
      }

      const [itemsRes, groupsRes] = await Promise.all([
        supabase
          .from("items")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("groups")
          .select("id,title,created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      if (itemsRes.error) {
        setError(itemsRes.error.message);
      } else {
        setItems((itemsRes.data ?? []) as Item[]);
      }

      if (groupsRes.error) {
        setError(groupsRes.error.message);
      } else {
        setGroups((groupsRes.data ?? []) as Group[]);
      }

      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveThemeAccent = async (accent: ThemeAccent) => {
    setThemeAccent(accent);
    setThemeMessage(null);
    localStorage.setItem(THEME_STORAGE_KEY, accent);
    applyThemeAccent(accent);
    window.dispatchEvent(
      new CustomEvent("clarionot:theme-change", { detail: accent }),
    );

    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;

    try {
      setThemeSaving(true);
      const { error: saveErr } = await supabase.from("user_settings").upsert(
        {
          user_id: uid,
          theme_accent: accent,
        },
        { onConflict: "user_id" },
      );

      if (saveErr) throw saveErr;
      setThemeMessage("Tema kaydedildi.");
    } catch (e: any) {
      setThemeMessage(
        e?.message
          ? `Tema bu cihazda değişti, Supabase kaydı bekliyor: ${e.message}`
          : "Tema bu cihazda değişti, Supabase kaydı bekliyor.",
      );
    } finally {
      setThemeSaving(false);
    }
  };

  const exportJson = () => {
    downloadText(
      `clarionot-export-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(
        { exported_at: new Date().toISOString(), groups, items },
        null,
        2,
      ),
      "application/json;charset=utf-8",
    );
  };

  const exportCsv = () => {
    const header = [
      "type",
      "title",
      "content",
      "tags",
      "group",
      "work_status",
      "created_at",
      "updated_at",
    ];

    const rows = items.map((item) =>
      [
        item.type,
        item.title,
        item.content,
        item.tags,
        item.group_id ? (groupMap.get(item.group_id) ?? "") : "Inbox",
        WORK_STATUS_LABELS[(item.work_status ?? "later") as WorkStatus],
        item.created_at,
        item.updated_at,
      ]
        .map(csvCell)
        .join(","),
    );

    downloadText(
      `clarionot-export-${new Date().toISOString().slice(0, 10)}.csv`,
      [header.map(csvCell).join(","), ...rows].join("\n"),
      "text/csv;charset=utf-8",
    );
  };

  const exportMarkdown = () => {
    const lines: string[] = [
      "# clarionot export",
      "",
      `Export: ${new Date().toLocaleString("tr-TR")}`,
      `Kayıt sayısı: ${items.length}`,
      "",
    ];

    for (const item of items) {
      const status =
        WORK_STATUS_LABELS[(item.work_status ?? "later") as WorkStatus];
      const group = item.group_id
        ? (groupMap.get(item.group_id) ?? "Grup")
        : "Inbox";

      lines.push(
        `## ${item.title || (item.type === "link" ? "Başlıksız link" : "Başlıksız not")}`,
      );
      lines.push("");
      lines.push(`- Tip: ${item.type === "link" ? "Link" : "Not"}`);
      lines.push(`- Durum: ${status}`);
      lines.push(`- Grup: ${group}`);
      if (item.tags?.length)
        lines.push(
          `- Etiketler: ${item.tags.map((tag) => `#${tag}`).join(" ")}`,
        );
      lines.push("");

      if (item.type === "link") {
        const { url, note } = parseLinkContent(item.content);
        if (url) lines.push(`[${url}](${url})`);
        if (note) {
          lines.push("");
          lines.push(note);
        }
      } else {
        lines.push(item.content || "");
      }

      lines.push("");
      lines.push("---");
      lines.push("");
    }

    downloadText(
      `clarionot-export-${new Date().toISOString().slice(0, 10)}.md`,
      lines.join("\n"),
      "text/markdown;charset=utf-8",
    );
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#131313] pb-16 text-[#e5e2e1]">
      <DnaBackdrop className="fixed opacity-30" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(107,251,154,0.08),transparent_42%),linear-gradient(to_bottom,transparent,#131313_82%)]" />

      <div className="fixed inset-x-0 top-0 z-50 border-b border-[#3d4a3e]/20 bg-[#131313]/70 px-6 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
        <div className="mx-auto max-w-5xl">
          <Header />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-24 sm:px-6">
        <section className="rounded-xl border border-[#3d4a3e]/30 bg-[#201f1f]/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
          <div className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
            Ayarlar
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Verin sende kalsın.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#bccabb]">
            Hesabını, planını ve dışa aktarma seçeneklerini buradan yönet.
          </p>
        </section>

        <section className="mt-6 rounded-xl border border-[#3d4a3e]/30 bg-[#1c1b1b]/70 p-6 backdrop-blur-2xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Tema rengi</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#bccabb]">
                Vurgu rengini değiştir. Seçim yaptığın tema rengi hemen
                uygulanır.
              </p>
            </div>
            <div className="text-xs text-[#bccabb]/70">
              {themeSaving ? "Kaydediliyor..." : themeMessage}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {THEME_PRESETS.map((preset) => {
              const active = themeAccent === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => void saveThemeAccent(preset.id)}
                  className={`rounded-lg border p-4 text-left transition hover:bg-[#2a2a2a] ${
                    active
                      ? "border-[var(--clarionot-accent)] bg-[var(--clarionot-accent-soft)]"
                      : "border-[#3d4a3e]/30 bg-[#0e0e0e]/70"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-5 w-5 rounded-full border border-white/15"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span
                      className="h-5 w-5 rounded-full border border-white/15"
                      style={{ backgroundColor: preset.secondary }}
                    />
                  </div>
                  <div className="mt-3 text-sm font-semibold text-[#e5e2e1]">
                    {preset.label}
                  </div>
                  <div className="mt-1 text-xs text-[#bccabb]/65">
                    {active ? "Aktif" : "Seç"}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-[#3d4a3e]/30 bg-[#1c1b1b]/70 p-6 backdrop-blur-2xl">
            <h2 className="text-lg font-bold">Hesap</h2>
            <div className="mt-4 rounded-lg border border-[#3d4a3e]/25 bg-[#0e0e0e]/70 p-4 text-sm text-[#bccabb]">
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#bccabb]/60">
                Email
              </div>
              <div className="mt-2 break-all text-[#e5e2e1]">
                {email || "-"}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href="/pro"
                className="rounded-full border border-[#3d4a3e]/40 bg-[#0e0e0e] px-5 py-3 text-center text-sm font-semibold transition hover:bg-[#2a2a2a]"
              >
                Plan ve faturalandırma
              </Link>
              <Link
                href="/extension/connect"
                className="rounded-full bg-gradient-to-r from-emerald-300 to-teal-300 px-5 py-3 text-center text-sm font-semibold text-emerald-950 transition hover:scale-[1.02]"
              >
                Eklentiyi bağla
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-[#3d4a3e]/30 bg-[#1c1b1b]/70 p-6 backdrop-blur-2xl">
            <h2 className="text-lg font-bold">Dışa aktar</h2>
            <p className="mt-2 text-sm leading-6 text-[#bccabb]">
              Kayıtlarını istediğin zaman dışarı al. Bu, Pro ürün güveninin en
              önemli parçalarından biri.
            </p>

            <div className="mt-5 grid gap-3">
              <button
                onClick={exportMarkdown}
                disabled={loading || !!error}
                className="rounded-full border border-[#3d4a3e]/40 bg-[#0e0e0e] px-5 py-3 text-sm font-semibold transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Markdown indir
              </button>
              <button
                onClick={exportJson}
                disabled={loading || !!error}
                className="rounded-full border border-[#3d4a3e]/40 bg-[#0e0e0e] px-5 py-3 text-sm font-semibold transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                JSON indir
              </button>
              <button
                onClick={exportCsv}
                disabled={loading || !!error}
                className="rounded-full border border-[#3d4a3e]/40 bg-[#0e0e0e] px-5 py-3 text-sm font-semibold transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                CSV indir
              </button>
            </div>

            <div className="mt-4 text-xs text-[#bccabb]/70">
              {loading
                ? "Kayıtlar hazırlanıyor..."
                : error
                  ? `Export hazırlanamadı: ${error}`
                  : `${items.length} kayıt ve ${groups.length} grup hazır.`}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-[#3d4a3e]/30 bg-[#1c1b1b]/70 p-6 backdrop-blur-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Güven ve destek</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#bccabb]">
                Gizlilik, kullanım şartları, iade politikası ve destek
                kanallarını tek yerden aç.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <Link
                href="/privacy"
                className="rounded-lg border border-[#3d4a3e]/40 bg-[#0e0e0e] px-4 py-2 text-center text-xs font-semibold transition hover:bg-[#2a2a2a]"
              >
                Gizlilik
              </Link>
              <Link
                href="/terms"
                className="rounded-lg border border-[#3d4a3e]/40 bg-[#0e0e0e] px-4 py-2 text-center text-xs font-semibold transition hover:bg-[#2a2a2a]"
              >
                Şartlar
              </Link>
              <Link
                href="/refund"
                className="rounded-lg border border-[#3d4a3e]/40 bg-[#0e0e0e] px-4 py-2 text-center text-xs font-semibold transition hover:bg-[#2a2a2a]"
              >
                İade
              </Link>
              <Link
                href="/support"
                className="rounded-lg bg-gradient-to-r from-emerald-300 to-teal-300 px-4 py-2 text-center text-xs font-semibold text-emerald-950 transition hover:scale-[1.01]"
              >
                Destek
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
