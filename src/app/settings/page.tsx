"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
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
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>("default");
  const [pushFrequency, setPushFrequency] = useState<"daily" | "weekly">(
    "daily",
  );
  const [pushQuietStart, setPushQuietStart] = useState<string>("");
  const [pushQuietEnd, setPushQuietEnd] = useState<string>("");
  const [pushMaxPerDay, setPushMaxPerDay] = useState<1 | 2 | 3>(1);
  const [pushSaving, setPushSaving] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [hasPushSubscription, setHasPushSubscription] = useState(false);
  const [pushTesting, setPushTesting] = useState(false);

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

      setPushSupported(
        typeof window !== "undefined" &&
          "Notification" in window &&
          "serviceWorker" in navigator &&
          "PushManager" in window,
      );
      if (typeof window !== "undefined" && "Notification" in window) {
        setPushPermission(Notification.permission);
      }

      const settingsRes = await supabase
        .from("user_settings")
        .select(
          "theme_accent,push_frequency,push_quiet_hours_start,push_quiet_hours_end,push_max_per_day",
        )
        .eq("user_id", uid)
        .maybeSingle();

      if (!settingsRes.error) {
        const remoteTheme = (settingsRes.data as any)?.theme_accent;
        if (remoteTheme) {
          localStorage.setItem(THEME_STORAGE_KEY, remoteTheme);
          setThemeAccent(remoteTheme as ThemeAccent);
          applyThemeAccent(remoteTheme);
        }

        const remotePushFrequency =
          (settingsRes.data as any)?.push_frequency === "weekly"
            ? "weekly"
            : "daily";
        const remoteQuietStart = (settingsRes.data as any)
          ?.push_quiet_hours_start;
        const remoteQuietEnd = (settingsRes.data as any)?.push_quiet_hours_end;
        const remotePushMaxPerDay = Number(
          (settingsRes.data as any)?.push_max_per_day ?? 1,
        );

        setPushFrequency(remotePushFrequency);
        setPushQuietStart(
          Number.isInteger(remoteQuietStart)
            ? String(remoteQuietStart).padStart(2, "0")
            : "",
        );
        setPushQuietEnd(
          Number.isInteger(remoteQuietEnd)
            ? String(remoteQuietEnd).padStart(2, "0")
            : "",
        );
        setPushMaxPerDay(
          remotePushMaxPerDay === 2 || remotePushMaxPerDay === 3
            ? remotePushMaxPerDay
            : 1,
        );
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

      if (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window
      ) {
        try {
          const registration =
            await navigator.serviceWorker.getRegistration("/sw.js");
          const subscription =
            await registration?.pushManager.getSubscription();
          if (!cancelled) {
            setHasPushSubscription(!!subscription);
          }
        } catch {
          if (!cancelled) setHasPushSubscription(false);
        }
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

  const savePushSettings = async (next: {
    push_frequency?: "daily" | "weekly";
    push_quiet_hours_start?: number | null;
    push_quiet_hours_end?: number | null;
    push_max_per_day?: 1 | 2 | 3;
  }) => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;

    const payload: Record<string, unknown> = { user_id: uid };
    if (next.push_frequency) payload.push_frequency = next.push_frequency;
    if ("push_quiet_hours_start" in next) {
      payload.push_quiet_hours_start = next.push_quiet_hours_start ?? null;
    }
    if ("push_quiet_hours_end" in next) {
      payload.push_quiet_hours_end = next.push_quiet_hours_end ?? null;
    }
    if (next.push_max_per_day) payload.push_max_per_day = next.push_max_per_day;
    if (!payload.timezone && typeof Intl !== "undefined") {
      payload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    const { error: saveErr } = await supabase
      .from("user_settings")
      .upsert(payload, { onConflict: "user_id" });

    if (saveErr) throw saveErr;
  };

  const enableDevicePush = async () => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setPushMessage("Bu cihaz web push desteklemiyor.");
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setPushMessage("VAPID public key tanımlı değil.");
      return;
    }

    setPushSaving(true);
    setPushMessage(null);

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== "granted") {
        setPushMessage("Bildirim izni verilmedi.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setPushMessage("Oturum bulunamadı.");
        return;
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          platform: "web",
          deviceLabel: navigator.platform || "Browser",
          userAgent: navigator.userAgent,
        }),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "Push subscription kaydedilemedi.");
      }

      await savePushSettings({ push_frequency: pushFrequency });
      setHasPushSubscription(true);
      setPushMessage("Bu cihaz için push bildirimi açıldı.");
    } catch (e: any) {
      setPushMessage(e?.message ?? "Push bildirimi açılamadı.");
    } finally {
      setPushSaving(false);
    }
  };

  const disableDevicePush = async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    setPushSaving(true);
    setPushMessage(null);

    try {
      const registration =
        await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (subscription && token) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        await subscription.unsubscribe().catch(() => null);
      }

      setHasPushSubscription(false);
      setPushMessage("Bu cihaz için push bildirimi kapatıldı.");
    } catch (e: any) {
      setPushMessage(e?.message ?? "Push bildirimi kapatılamadı.");
    } finally {
      setPushSaving(false);
    }
  };

  const updatePushFrequency = async (next: "daily" | "weekly") => {
    setPushFrequency(next);
    setPushSaving(true);
    setPushMessage(null);
    try {
      await savePushSettings({ push_frequency: next });
      setPushMessage("Bildirim sıklığı kaydedildi.");
    } catch (e: any) {
      setPushMessage(e?.message ?? "Bildirim sıklığı kaydedilemedi.");
    } finally {
      setPushSaving(false);
    }
  };

  const updatePushCadence = async (next: {
    quietStart?: string;
    quietEnd?: string;
    maxPerDay?: 1 | 2 | 3;
  }) => {
    const quietStart = next.quietStart ?? pushQuietStart;
    const quietEnd = next.quietEnd ?? pushQuietEnd;
    const maxPerDay = next.maxPerDay ?? pushMaxPerDay;

    setPushSaving(true);
    setPushMessage(null);

    try {
      if (typeof next.quietStart !== "undefined")
        setPushQuietStart(next.quietStart);
      if (typeof next.quietEnd !== "undefined") setPushQuietEnd(next.quietEnd);
      if (typeof next.maxPerDay !== "undefined")
        setPushMaxPerDay(next.maxPerDay);

      await savePushSettings({
        push_quiet_hours_start: quietStart === "" ? null : Number(quietStart),
        push_quiet_hours_end: quietEnd === "" ? null : Number(quietEnd),
        push_max_per_day: maxPerDay,
      });

      setPushMessage("Bildirim zamanlaması kaydedildi.");
    } catch (e: any) {
      setPushMessage(e?.message ?? "Bildirim zamanlaması kaydedilemedi.");
    } finally {
      setPushSaving(false);
    }
  };

  const sendPushTest = async () => {
    setPushTesting(true);
    setPushMessage(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Oturum bulunamadı.");

      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "Test bildirimi gönderilemedi.");
      }

      setPushMessage("Test bildirimi bu cihaza gönderildi.");
    } catch (e: any) {
      setPushMessage(e?.message ?? "Test bildirimi başarısız oldu.");
    } finally {
      setPushTesting(false);
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

  const activeThemePreset =
    THEME_PRESETS.find((preset) => preset.id === themeAccent) ??
    THEME_PRESETS[0];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030406] pb-16 text-white selection:bg-[var(--clarionot-accent-soft)]">
      <DnaBackdrop className="fixed opacity-18" />
      <div className="theme-page-glow pointer-events-none fixed inset-0" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.075] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#030406]/62 px-6 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
        <div className="mx-auto max-w-6xl">
          <Header />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <motion.section
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="theme-shell-strong rounded-xl p-6 shadow-[0_40px_120px_rgba(0,0,0,0.34)]"
        >
          <div className="accent-text text-xs font-bold uppercase tracking-[0.35em]">
            Ayarlar
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Verin sende kalsın.
          </h1>
          <p className="theme-text-muted mt-3 max-w-2xl text-sm leading-6">
            Hesabını, planını ve dışa aktarma seçeneklerini buradan yönet.
          </p>
        </motion.section>

        <section className="theme-shell mt-6 rounded-xl p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Tema rengi</h2>
              <p className="theme-text-muted mt-2 max-w-2xl text-sm leading-6">
                Vurgu rengini değiştir. Seçim yaptığın tema rengi hemen
                uygulanır.
              </p>
            </div>
            <div className="theme-text-soft text-xs">
              {themeSaving ? "Kaydediliyor..." : themeMessage}
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {THEME_PRESETS.map((preset) => {
                const active = themeAccent === preset.id;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => void saveThemeAccent(preset.id)}
                    className={`rounded-lg border p-4 text-left transition ${
                      active
                        ? "theme-accent-chip"
                        : "theme-shell-soft hover:bg-white/[0.06]"
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
                    <div className="mt-3 text-sm font-semibold text-white">
                      {preset.label}
                    </div>
                    <div className="theme-text-soft mt-1 text-xs">
                      {active ? "Aktif" : "Seç"}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="theme-shell-soft overflow-hidden rounded-xl p-4">
              <div className="accent-text text-[11px] font-bold uppercase tracking-[0.28em]">
                Canlı önizleme
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-[#05070a] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
                <div className="flex items-center justify-between border-b border-white/8 pb-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {activeThemePreset.label}
                    </div>
                    <div className="theme-text-soft mt-1 text-xs">
                      Landing + dashboard accent
                    </div>
                  </div>
                  <span className="theme-button-primary rounded-lg px-3 py-2 text-xs font-semibold">
                    Aktif tema
                  </span>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="theme-shell rounded-lg p-3">
                    <div className="theme-text-soft text-xs">Kart</div>
                    <div className="mt-3 h-2 w-20 rounded-full bg-white/20" />
                    <div className="mt-2 h-2 w-4/5 rounded-full bg-white/10" />
                  </div>

                  <div className="flex gap-3">
                    <span className="theme-button-primary rounded-lg px-4 py-2 text-xs font-semibold">
                      Birincil
                    </span>
                    <span className="theme-button-secondary rounded-lg px-4 py-2 text-xs font-semibold">
                      İkincil
                    </span>
                  </div>

                  <div className="theme-accent-chip w-fit rounded-md px-3 py-1 text-xs font-medium">
                    Accent önizleme
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="theme-shell mt-6 rounded-xl p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Push bildirimi</h2>
              <p className="theme-text-muted mt-2 max-w-2xl text-sm leading-6">
                Tarayıcı izni verildiğinde unutulan notlar bu cihaza doğrudan
                gelir. Ayrı bir uygulama içi izin gerekmiyor.
              </p>
            </div>
            <div className="theme-text-soft text-xs">
              {pushSaving
                ? "Kaydediliyor..."
                : pushTesting
                  ? "Test gönderiliyor..."
                  : pushMessage}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="theme-shell-soft rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="theme-chip rounded-md px-3 py-1 text-xs text-white/72">
                  İzin: {pushPermission}
                </span>
                <span className="theme-chip rounded-md px-3 py-1 text-xs text-white/72">
                  Cihaz: {hasPushSubscription ? "bağlı" : "bağlı değil"}
                </span>
                <span className="theme-chip rounded-md px-3 py-1 text-xs text-white/72">
                  Destek: {pushSupported ? "var" : "yok"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void enableDevicePush()}
                  disabled={pushSaving || !pushSupported || hasPushSubscription}
                  className="theme-button-primary rounded-lg px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Bu cihazı bağla
                </button>
                <button
                  type="button"
                  onClick={() => void disableDevicePush()}
                  disabled={pushSaving || !hasPushSubscription}
                  className="theme-button-secondary rounded-lg px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Bu cihazı kaldır
                </button>
                <button
                  type="button"
                  onClick={() => void sendPushTest()}
                  disabled={pushTesting || !hasPushSubscription}
                  className="theme-button-secondary rounded-lg px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Test bildirimi
                </button>
              </div>
            </div>

            <div className="theme-shell-soft rounded-xl p-4">
              <div className="text-sm font-semibold text-white">Sıklık</div>
              <p className="theme-text-soft mt-2 text-sm leading-6">
                Aynı cihaza gereksiz spam gitmesin. İlk sürüm günlük veya
                haftalık tekil hatırlatma yollar.
              </p>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => void updatePushFrequency("daily")}
                  disabled={pushSaving}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    pushFrequency === "daily"
                      ? "theme-button-primary"
                      : "theme-button-secondary"
                  }`}
                >
                  Günlük
                </button>
                <button
                  type="button"
                  onClick={() => void updatePushFrequency("weekly")}
                  disabled={pushSaving}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    pushFrequency === "weekly"
                      ? "theme-button-primary"
                      : "theme-button-secondary"
                  }`}
                >
                  Haftalık
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Bildirim zamanlaması</h2>
                <p className="theme-text-muted mt-2 max-w-2xl text-sm leading-6">
                  Sessiz saatleri tanımla ve aynı gün içinde en fazla kaç push
                  gönderilebileceğini sınırla.
                </p>
              </div>
              <div className="theme-text-soft text-xs">
                {pushSaving ? "Kaydediliyor..." : pushMessage}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2 text-sm">
                <span className="theme-text-soft">Sessiz saat başlangıç</span>
                <select
                  value={pushQuietStart}
                  onChange={(e) =>
                    void updatePushCadence({ quietStart: e.target.value })
                  }
                  disabled={pushSaving}
                  className="theme-field rounded-lg px-3 py-3 text-sm text-white outline-none"
                >
                  <option value="">Kapalı</option>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const value = String(hour).padStart(2, "0");
                    return (
                      <option key={`quiet-start-${value}`} value={value}>
                        {value}:00
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="theme-text-soft">Sessiz saat bitiş</span>
                <select
                  value={pushQuietEnd}
                  onChange={(e) =>
                    void updatePushCadence({ quietEnd: e.target.value })
                  }
                  disabled={pushSaving}
                  className="theme-field rounded-lg px-3 py-3 text-sm text-white outline-none"
                >
                  <option value="">Kapalı</option>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const value = String(hour).padStart(2, "0");
                    return (
                      <option key={`quiet-end-${value}`} value={value}>
                        {value}:00
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="theme-text-soft">Günlük maksimum</span>
                <select
                  value={String(pushMaxPerDay)}
                  onChange={(e) =>
                    void updatePushCadence({
                      maxPerDay: Number(e.target.value) as 1 | 2 | 3,
                    })
                  }
                  disabled={pushSaving}
                  className="theme-field rounded-lg px-3 py-3 text-sm text-white outline-none"
                >
                  <option value="1">1 bildirim</option>
                  <option value="2">2 bildirim</option>
                  <option value="3">3 bildirim</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="theme-shell rounded-xl p-6">
            <h2 className="text-lg font-semibold">Hesap</h2>
            <div className="theme-shell-soft mt-4 rounded-lg p-4 text-sm">
              <div className="theme-text-soft text-[10px] font-bold uppercase tracking-[0.28em]">
                Email
              </div>
              <div className="mt-2 break-all text-white">{email || "-"}</div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href="/pro"
                className="theme-button-secondary rounded-lg px-5 py-3 text-center text-sm font-semibold transition"
              >
                Plan ve faturalandırma
              </Link>
              <Link
                href="/extension/connect"
                className="theme-button-primary rounded-lg px-5 py-3 text-center text-sm font-semibold transition"
              >
                Eklentiyi bağla
              </Link>
            </div>
          </section>

          <section className="theme-shell rounded-xl p-6">
            <h2 className="text-lg font-semibold">Dışa aktar</h2>
            <p className="theme-text-muted mt-2 text-sm leading-6">
              Kayıtlarını istediğin zaman dışarı al. Bu, Pro ürün güveninin en
              önemli parçalarından biri.
            </p>

            <div className="mt-5 grid gap-3">
              <button
                onClick={exportMarkdown}
                disabled={loading || !!error}
                className="theme-button-secondary rounded-lg px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Markdown indir
              </button>
              <button
                onClick={exportJson}
                disabled={loading || !!error}
                className="theme-button-secondary rounded-lg px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                JSON indir
              </button>
              <button
                onClick={exportCsv}
                disabled={loading || !!error}
                className="theme-button-secondary rounded-lg px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                CSV indir
              </button>
            </div>

            <div className="theme-text-soft mt-4 text-xs">
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
