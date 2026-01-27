"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Item, ItemType } from "@/lib/types";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import Textarea from "@/components/Textarea";
import TagInput from "@/components/TagInput";
import ItemCard from "@/components/ItemCard";
import Header from "@/components/Header";

type Draft = {
  id?: string;
  type: ItemType;
  title: string;
  content: string;
  tags: string[];
  note?: string;
  group_id?: string | null;
};

const emptyDraft = (type: ItemType): Draft => ({
  type,
  title: "",
  content: "",
  note: "",
  tags: [],
  group_id: null,
});

type Group = { id: string; title: string; created_at?: string };

type ToastState = {
  type: "ok" | "err";
  text: string;
} | null;

export default function DashboardPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [openOnboarding, setOpenOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // ✅ extension durumu (DB token var mı?)
  const [extConnected, setExtConnected] = useState<boolean>(false);
  // ✅ bu tarayıcıda gerçekten canlı mı?
  const [extLiveHere, setExtLiveHere] = useState<boolean>(false);
  const [extChecking, setExtChecking] = useState<boolean>(true);

  const freeLimit = Number(process.env.NEXT_PUBLIC_FREE_LIMIT ?? 50);
  const [forgottenSort, setForgottenSort] = useState<"oldest" | "newest">(
    "oldest",
  );

  // ✅ Pro durumu DB’den
  const [isPro, setIsPro] = useState<boolean | null>(null);

  // ✅ Pro için Forgotten eşiği (DB kalıcı)
  const [proForgottenDays, setProForgottenDays] = useState<30 | 60 | 90>(30);

  const [q, setQ] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft("link"));
  const [err, setErr] = useState<string | null>(null);

  // ✅ Toast
  const [toast, setToast] = useState<ToastState>(null);
  const showToast = (type: "ok" | "err", text: string) =>
    setToast({ type, text });
  const viewTimersRef = useRef<Record<string, number>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);

  // ✅ Drag UI state
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<
    null | "inbox" | { groupId: string }
  >(null);

  // ✅ Groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<
    string | "all" | "inbox" | "forgotten"
  >("all");

  // ✅ Create group modal
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // ✅ Rename modal
  const [openRenameModal, setOpenRenameModal] = useState(false);
  const [renameGroupId, setRenameGroupId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [paymentIssue, setPaymentIssue] = useState<boolean>(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // ✅ Collapse state
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    inbox_notes: false,
    inbox_links: false,
  });
  const toggleCollapsed = (key: string) =>
    setCollapsed((p) => ({ ...p, [key]: !p[key] }));

  const [forgottenSelection, setForgottenSelection] = useState<string[]>([]);

  // ✅ Free: 7 gün sabit, Pro: 30/60/90 seçilebilir
  const forgottenDays = isPro === true ? proForgottenDays : 7;
  const FORGOTTEN_MS = forgottenDays * 24 * 60 * 60 * 1000;

  const isForgotten = useCallback(
    (it: any) => {
      // ✅ Snooze: süre bitmediyse unutulanlarda GÖSTERME
      if (it.snoozed_until) {
        const until = new Date(it.snoozed_until).getTime();
        if (Date.now() < until) return false;
      }

      const base = it.last_viewed_at
        ? new Date(it.last_viewed_at)
        : new Date(it.created_at);

      return Date.now() - base.getTime() > FORGOTTEN_MS;
    },
    [FORGOTTEN_MS],
  );

  const baseDateOf = (it: any) => new Date(it.last_viewed_at ?? it.created_at);

  const skipOnboarding = () => {
    if (userId) {
      const key = `clarionot:onboarding:v1:${userId}`;
      localStorage.setItem(key, "1");
    }
    setOpenOnboarding(false);
  };

  const markViewed = (itemId: string) => {
    if (!userId) return;

    const nowIso = new Date().toISOString();

    // ✅ optimistic UI: anında güncelle
    setItems((prev: any) =>
      prev.map((it: any) =>
        it.id === itemId ? { ...it, last_viewed_at: nowIso } : it,
      ),
    );

    // ✅ debounce: DB spam olmasın
    const prevTimer = viewTimersRef.current[itemId];
    if (prevTimer) window.clearTimeout(prevTimer);

    viewTimersRef.current[itemId] = window.setTimeout(async () => {
      try {
        const { error } = await supabase
          .from("items")
          .update({ last_viewed_at: nowIso })
          .eq("id", itemId)
          .eq("user_id", userId);

        if (error) throw error;
      } catch {
        // kritik değil: sessiz geçiyoruz
      } finally {
        delete viewTimersRef.current[itemId];
      }
    }, 600);
  };

  const fetchUserSettings = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("forgotten_days")
        .eq("user_id", uid)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // ilk kez giren kullanıcı → default ayarı oluştur
        const { error: insErr } = await supabase
          .from("user_settings")
          .upsert(
            { user_id: uid, forgotten_days: 30 },
            { onConflict: "user_id" },
          );

        if (insErr) throw insErr;

        setProForgottenDays(30);
        return;
      }

      const value = Number((data as any).forgotten_days);
      if (value === 30 || value === 60 || value === 90)
        setProForgottenDays(value);
      else setProForgottenDays(30);
    } catch {
      setProForgottenDays(30);
    }
  };

  const fetchPlan = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("user_plan")
        .select("plan,status,current_period_end,grace_until")
        .eq("user_id", uid)
        .maybeSingle();

      if (error || !data) {
        setIsPro(false);
        setPaymentIssue(false);
        return;
      }

      const statusOk = data.status === "active" || data.status === "trialing";

      const stillValid =
        !!data.current_period_end &&
        new Date(data.current_period_end).getTime() > Date.now();

      const inGrace =
        !!(data as any).grace_until &&
        new Date((data as any).grace_until).getTime() > Date.now();

      const isProUser =
        data.plan === "pro" && (statusOk || stillValid || inGrace);

      const hasIssue = data.status === "past_due" || data.status === "unpaid";

      setIsPro(isProUser);
      setPaymentIssue(isProUser && hasIssue);

      if (isProUser) {
        await fetchUserSettings(uid);
      }
    } catch {
      setIsPro(false);
    }
  };
  const openBillingPortal = async () => {
    try {
      setPortalLoading(true);
      setErr(null);

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          return_url: window.location.href,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      const url = json?.url;
      if (!url) throw new Error("Portal URL alınamadı.");

      window.location.href = url;
    } catch (e: any) {
      setErr(e?.message ?? "Billing portal açılamadı.");
      showToast("err", e?.message ?? "Billing portal açılamadı ❌");
    } finally {
      setPortalLoading(false);
    }
  };
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // ✅ sadece bu pencereden gelen postMessage'ları dinle
      if (e.source !== window) return;

      const data = (e.data ?? {}) as any;

      if (
        data.source === "clarionot-extension" &&
        data.type === "EXTENSION_READY"
      ) {
        setExtConnected(true);
        setExtLiveHere(true);
        setExtChecking(false);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // auth gate
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      if (!uid) {
        router.replace("/login");
        return;
      }
      setUserId(uid);
      fetchPlan(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      if (!uid) {
        router.replace("/login");
        return;
      }
      setUserId(uid);
      fetchPlan(uid);
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ✅ Extension: bu tarayıcıda canlı mı? (PING/PONG)
  const pingExtension = async () => {
    const PING = "CLARIONOT_PING";
    const PONG = "CLARIONOT_PONG";

    return await new Promise<boolean>((resolve) => {
      const t = window.setTimeout(() => {
        window.removeEventListener("message", onMsg);
        resolve(false);
      }, 1200);

      function onMsg(e: MessageEvent) {
        if (e.origin !== window.location.origin) return;
        if ((e.data as any)?.type !== PONG) return;

        window.clearTimeout(t);
        window.removeEventListener("message", onMsg);
        resolve(true);
      }

      window.addEventListener("message", onMsg);
      window.postMessage({ type: PING }, window.location.origin);
    });
  };
  const pingExtensionWithRetry = async (
    retries = 3,
    delayMs = 300,
  ): Promise<boolean> => {
    for (let i = 0; i < retries; i++) {
      const ok = await pingExtension();
      if (ok) return true;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
    return false;
  };

  const checkExtension = async (uid: string) => {
    try {
      const cutoffMs = Date.now() - 7 * 24 * 60 * 60 * 1000;

      const { data, error } = await supabase
        .from("clip_tokens")
        .select("id, revoked_at, label, last_seen_at")
        .eq("user_id", uid)
        .eq("label", "Browser Extension")
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      const row = data?.[0];
      if (!row) {
        setExtConnected(false);
        return false;
      }

      const seen = row.last_seen_at;
      const isLive = !!seen && new Date(seen).getTime() >= cutoffMs;

      setExtConnected(true);

      // isLive'ı şimdilik sadece not olarak tutuyorsun
      void isLive;

      return true;
    } catch {
      setExtConnected(false);
      return false;
    }
  };

  const load = async (uid: string) => {
    setErr(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", uid) // ✅ net filtre
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data ?? []) as Item[]);
    } catch (e: any) {
      setErr(e?.message ?? "Liste alınamadı.");
      showToast("err", e?.message ?? "Liste alınamadı ❌");
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async (uid: string) => {
    const { data, error } = await supabase
      .from("groups")
      .select("id,title,created_at")
      .eq("user_id", uid) // ✅ net filtre
      .order("created_at", { ascending: false });

    if (error) throw error;
    setGroups((data ?? []) as any);
  };

  useEffect(() => {
    return () => {
      Object.values(viewTimersRef.current).forEach((t) =>
        window.clearTimeout(t),
      );
      viewTimersRef.current = {};
    };
  }, []);

  // onboarding
  useEffect(() => {
    if (!userId) return;
    const key = `clarionot:onboarding:v1:${userId}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      setOpenOnboarding(true);
      setOnboardingStep(0);
    }
  }, [userId]);

  // initial load
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    // 1) Data load (pro durumundan bağımsız)
    load(userId);
    loadGroups(userId);

    // 2) Extension check yalnızca Pro ise
    const run = async () => {
      // isPro henüz belli değilse (null) hiçbir şey yapma
      if (isPro == null) return;

      // Pro değilse extension state'lerini temizle
      if (isPro === false) {
        if (cancelled) return;
        setExtConnected(false);
        setExtLiveHere(false);
        setExtChecking(false);
        return;
      }

      // Pro ise kontrol et
      if (cancelled) return;
      setExtChecking(true);

      try {
        const hasToken = await checkExtension(userId); // DB kontrol
        if (cancelled) return;

        if (!hasToken) {
          setExtLiveHere(false);
          return;
        }

        const live = await pingExtensionWithRetry(3, 300);
        if (cancelled) return;
        setExtLiveHere(live);
      } catch {
        if (cancelled) return;
        setExtConnected(false);
        setExtLiveHere(false);
      } finally {
        if (cancelled) return;
        setExtChecking(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [userId, isPro]); // load/loadGroups/ping/check fonksiyonların stable değilse useCallback yap

  useEffect(() => {
    if (activeGroupId !== "forgotten" || isPro !== true) {
      setForgottenSelection([]);
    }
  }, [activeGroupId, isPro]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { inbox: 0, forgotten: 0 };
    for (const it of items as any) {
      const gid = it.group_id ? String(it.group_id) : "inbox";
      counts[gid] = (counts[gid] ?? 0) + 1;
      if (isForgotten(it)) counts["forgotten"] = (counts["forgotten"] ?? 0) + 1;
    }
    return counts;
  }, [items, isForgotten]);

  // ✅ Search + group filter (+ forgotten)
  const filteredItems = useMemo(() => {
    const s = q.trim().toLowerCase();

    const base = !s
      ? items
      : items.filter((it: any) => {
          const inTitle = (it.title ?? "").toLowerCase().includes(s);
          const inContent = (it.content ?? "").toLowerCase().includes(s);
          const inTags = (it.tags ?? []).some((t: string) =>
            t.toLowerCase().includes(s),
          );
          return inTitle || inContent || inTags;
        });

    if (activeGroupId === "all") return base;

    if (activeGroupId === "forgotten") {
      return base.filter((it: any) => isForgotten(it));
    }

    if (activeGroupId === "inbox")
      return base.filter((it: any) => !it.group_id);

    return base.filter((it: any) => String(it.group_id) === activeGroupId);
  }, [items, q, activeGroupId, isForgotten]);

  const finalItems = useMemo(() => {
    if (activeGroupId !== "forgotten") return filteredItems;

    const sorted = [...filteredItems].sort((a: any, b: any) => {
      const da = baseDateOf(a).getTime();
      const db = baseDateOf(b).getTime();
      return forgottenSort === "oldest" ? da - db : db - da;
    });

    return sorted;
  }, [filteredItems, activeGroupId, forgottenSort]);

  const { notes, links } = useMemo(() => {
    return {
      notes: finalItems.filter((it) => it.type === "note"),
      links: finalItems.filter((it) => it.type === "link"),
    };
  }, [finalItems]);

  // ✅ All view için gruplama
  const notesByGroup = useMemo(() => {
    const map: Record<string, Item[]> = { inbox: [] };
    for (const it of notes) {
      const gid = (it as any).group_id ? String((it as any).group_id) : "inbox";
      (map[gid] ||= []).push(it);
    }
    return map;
  }, [notes]);

  const linksByGroup = useMemo(() => {
    const map: Record<string, Item[]> = { inbox: [] };
    for (const it of links) {
      const gid = (it as any).group_id ? String((it as any).group_id) : "inbox";
      (map[gid] ||= []).push(it);
    }
    return map;
  }, [links]);

  const ungroupedItems = useMemo(() => {
    return items.filter((it: any) => !it.group_id);
  }, [items]);

  const openNew = (type: ItemType) => {
    setDraft(emptyDraft(type));
    setOpenAdd(true);
  };

  // ✅ Group silme
  const deleteGroup = async (groupId: string) => {
    if (!userId) return;

    const ok = confirm(
      "Bu grubu silmek istiyor musun?\nBu gruptaki tüm kayıtlar Inbox’a taşınacak.",
    );
    if (!ok) return;

    const groupTitle = groups.find((g) => g.id === groupId)?.title ?? "Group";

    try {
      setErr(null);

      // 1) DB: önce item'ları inbox'a taşı
      const { error: moveErr } = await supabase
        .from("items")
        .update({ group_id: null, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("group_id", groupId);

      if (moveErr) throw moveErr;

      // 2) DB: sonra group'u sil
      const { error: delErr } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId)
        .eq("user_id", userId);

      if (delErr) throw delErr;

      // 3) UI refresh (en temiz)
      if (activeGroupId === groupId) setActiveGroupId("inbox");
      await loadGroups(userId);
      await load(userId);

      showToast("ok", `🗑️ "${groupTitle}" silindi (Inbox’a taşındı)`);
    } catch (e: any) {
      setErr(e?.message ?? "Group silinemedi.");
      showToast("err", e?.message ?? "Group silinemedi ❌");
    }
  };

  const openRename = (g: Group) => {
    setRenameGroupId(g.id);
    setRenameTitle(g.title);
    setOpenRenameModal(true);
  };

  const saveRename = async () => {
    if (!userId || !renameGroupId) return;

    const t = renameTitle.trim();
    if (!t) {
      setErr("Group title boş olamaz.");
      showToast("err", "Group title boş olamaz ❌");
      return;
    }

    try {
      setRenaming(true);
      setErr(null);

      const { error } = await supabase
        .from("groups")
        .update({ title: t })
        .eq("id", renameGroupId)
        .eq("user_id", userId);

      if (error) throw error;

      setOpenRenameModal(false);
      setRenameGroupId(null);
      setRenameTitle("");

      await loadGroups(userId);
      showToast("ok", "✅ Grup adı güncellendi");
    } catch (e: any) {
      setErr(e?.message ?? "Group adı güncellenemedi.");
      showToast("err", e?.message ?? "Group adı güncellenemedi ❌");
    } finally {
      setRenaming(false);
    }
  };

  const finishOnboarding = () => {
    if (userId) {
      const key = `clarionot:onboarding:v1:${userId}`;
      localStorage.setItem(key, "1");
    }
    setOpenOnboarding(false);
    openNew("link");
  };

  const saveDraft = async () => {
    setErr(null);
    setSaving(true);
    try {
      if (!userId) {
        showToast("err", "Oturum bulunamadı ❌");
        return;
      }

      if (!draft.content.trim() && !draft.title.trim()) {
        setErr("En az başlık ya da içerik gir.");
        showToast("err", "En az başlık ya da içerik gir ❌");
        return;
      }

      let title = draft.title.trim();
      let content = draft.content.trim();

      if (draft.type === "link") {
        if (content && !/^https?:\/\//i.test(content))
          content = "https://" + content;

        const note = (draft.note ?? "").trim();
        if (note) content = `${content}\n\n${note}`;

        if (!title && content) {
          const urlOnly = content.split(/\n/)[0].trim();

          try {
            const r = await fetch("/api/linkTitle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: urlOnly }),
            });
            const data = await r.json();
            if (data?.title) title = data.title;
          } catch {}

          if (!title && content) {
            try {
              const u = new URL(content.split(/\n/)[0].trim());
              title = u.hostname.replace("www.", "");
            } catch {}
          }
        }
      }

      // ✅ user_id yine gönderiyoruz (DB default da olsa sorun değil)
      const payload: any = {
        user_id: userId,
        type: draft.type,
        title,
        content,
        tags: draft.tags,
        group_id: draft.group_id ?? null,
      };

      if (isPro !== true) {
        const { count, error: countErr } = await supabase
          .from("items")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        if (countErr) throw countErr;

        if ((count ?? 0) >= freeLimit) {
          const msg = `Free planda en fazla ${freeLimit} kayıt ekleyebilirsin. Pro’ya geç.`;
          setErr(msg);
          showToast("err", msg);
          return;
        }
      }

      const { error } = await supabase.from("items").insert(payload);
      if (error) throw error;

      setOpenAdd(false);
      await load(userId);
      showToast("ok", "✅ Kaydedildi");
    } catch (e: any) {
      setErr(e?.message ?? "Kaydedilemedi.");
      showToast("err", e?.message ?? "Kaydedilemedi ❌");
    } finally {
      setSaving(false);
    }
  };

  const openItem = (it: any) => {
    setDraft({
      id: it.id,
      type: it.type,
      title: it.title ?? "",
      content: it.content ?? "",
      tags: it.tags ?? [],
      group_id: it.group_id ?? null,
    });
    setOpenDetail(true);
    markViewed(it.id);
  };

  const updateItem = async () => {
    setErr(null);
    try {
      if (!userId) {
        showToast("err", "Oturum bulunamadı ❌");
        return;
      }
      if (!draft.id) return;

      const { error } = await supabase
        .from("items")
        .update({
          title: draft.title.trim(),
          content: draft.content.trim(),
          tags: draft.tags,
          group_id: draft.group_id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", draft.id)
        .eq("user_id", userId);

      if (error) throw error;

      setOpenDetail(false);
      await load(userId);
      showToast("ok", "✅ Güncellendi");
    } catch (e: any) {
      setErr(e?.message ?? "Güncellenemedi.");
      showToast("err", e?.message ?? "Güncellenemedi ❌");
    }
  };

  const removeItem = async () => {
    setErr(null);
    try {
      if (!userId) {
        showToast("err", "Oturum bulunamadı ❌");
        return;
      }
      if (!draft.id) return;

      const ok = confirm("Silmek istiyor musun?");
      if (!ok) return;

      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", draft.id)
        .eq("user_id", userId);

      if (error) throw error;

      setOpenDetail(false);
      await load(userId);
      showToast("ok", "🗑️ Silindi");
    } catch (e: any) {
      setErr(e?.message ?? "Silinemedi.");
      showToast("err", e?.message ?? "Silinemedi ❌");
    }
  };

  const createGroupAndAssign = async () => {
    try {
      if (!userId) {
        showToast("err", "Oturum bulunamadı ❌");
        return;
      }

      const title = groupTitle.trim();
      if (!title) {
        setErr("Group title required.");
        showToast("err", "Group title required ❌");
        return;
      }

      setSavingGroup(true);
      setErr(null);

      const { data: g, error: gErr } = await supabase
        .from("groups")
        .insert({ user_id: userId, title })
        .select("id,title,created_at")
        .single();

      if (gErr) throw gErr;

      if (selectedItemIds.length > 0) {
        const { error: uErr } = await supabase
          .from("items")
          .update({ group_id: g.id, updated_at: new Date().toISOString() })
          .in("id", selectedItemIds)
          .eq("user_id", userId);

        if (uErr) throw uErr;
      }

      setOpenGroupModal(false);
      setGroupTitle("");
      setSelectedItemIds([]);

      await loadGroups(userId);
      await load(userId);

      showToast("ok", "✅ Grup oluşturuldu");
    } catch (e: any) {
      setErr(e?.message ?? "Group oluşturulamadı.");
      showToast("err", e?.message ?? "Grup oluşturulamadı ❌");
    } finally {
      setSavingGroup(false);
    }
  };

  // ===========================
  // ✅ DRAG & DROP
  // ===========================
  const onDragStartItem = (itemId: string) => (e: React.DragEvent) => {
    setDraggingItemId(itemId);
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragEndItem = () => {
    setDraggingItemId(null);
    setDragOverTarget(null);
  };

  const moveItemToGroup = async (itemId: string, groupId: string | null) => {
    if (!userId) return;

    const prevGroupId =
      (items as any[]).find((x) => x.id === itemId)?.group_id ?? null;

    // optimistic
    setItems((prev: any) =>
      prev.map((it: any) =>
        it.id === itemId ? { ...it, group_id: groupId } : it,
      ),
    );

    const { error } = await supabase
      .from("items")
      .update({ group_id: groupId, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("user_id", userId);

    if (error) {
      // rollback
      setItems((prev: any) =>
        prev.map((it: any) =>
          it.id === itemId ? { ...it, group_id: prevGroupId } : it,
        ),
      );
      throw error;
    }

    showToast("ok", groupId ? "Gruba taşındı ✅" : "Inbox’a alındı ✅");
  };

  const makeDropHandlers = (target: "inbox" | { groupId: string }) => {
    const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverTarget(target);
    };

    const onDragLeave = () => setDragOverTarget(null);

    const onDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverTarget(null);

      const itemId = e.dataTransfer.getData("text/plain") || "";
      if (!itemId) return;

      try {
        if (target === "inbox") await moveItemToGroup(itemId, null);
        else await moveItemToGroup(itemId, target.groupId);
      } catch (err: any) {
        showToast("err", err?.message ?? "Taşıma başarısız ❌");
      } finally {
        setDraggingItemId(null);
      }
    };

    return { onDragOver, onDragLeave, onDrop };
  };

  const inboxDrop = makeDropHandlers("inbox");
  const dropZoneClass = (isOver: boolean) =>
    isOver
      ? "outline outline-2 outline-emerald-500/60 bg-emerald-500/10 border-emerald-500/40"
      : "";

  // ✅ Draggable wrapper
  const DraggableWrap = ({ it }: { it: any }) => {
    const isForgottenMode = activeGroupId === "forgotten";
    const canBulk = isPro === true && isForgottenMode;
    const checked = forgottenSelection.includes(it.id);

    const toggle = (next: boolean) => {
      setForgottenSelection((prev) =>
        next ? [...prev, it.id] : prev.filter((x) => x !== it.id),
      );
    };

    return (
      <div className="relative">
        {canBulk ? (
          <>
            {/* Bigger hit-area */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(!checked);
              }}
              className="absolute top-2 left-2 z-20 h-9 w-9 rounded-lg
                       bg-neutral-950/70 border border-neutral-800
                       hover:bg-neutral-900 flex items-center justify-center"
              title="Seç"
            >
              <span
                className={`h-5 w-5 rounded border flex items-center justify-center
                          ${
                            checked
                              ? "bg-emerald-500/20 border-emerald-500/50"
                              : "border-neutral-600"
                          }`}
              >
                {checked ? "✓" : ""}
              </span>
            </button>

            {/* Keyboard/Screen reader için gerçek checkbox */}
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => toggle(e.target.checked)}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="sr-only"
              aria-label="Seç"
            />
          </>
        ) : null}

        <div
          draggable={!isForgottenMode}
          onDragStart={!isForgottenMode ? onDragStartItem(it.id) : undefined}
          onDragEnd={!isForgottenMode ? onDragEndItem : undefined}
          className={`cursor-grab ${
            draggingItemId === it.id ? "opacity-60 scale-[0.99]" : ""
          } ${checked ? "ring-2 ring-emerald-500/40" : ""}`}
        >
          <ItemCard
            item={it}
            onOpen={openItem}
            className={canBulk ? "pl-12" : ""}
          />
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Header />

        {isPro === true && paymentIssue ? (
          <div className="mt-4 rounded-2xl border border-amber-900/40 bg-amber-950/30 p-4 text-sm text-amber-200">
            <div className="font-semibold text-amber-100">
              Ödeme sorunu tespit edildi
            </div>
            <div className="mt-1 text-amber-200/90">
              Kartınızdan ödeme alınamadı. Pro erişiminiz dönem sonuna kadar
              devam edebilir; ama sorun çözülmezse askıya alınabilir.
            </div>
            <button
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="mt-3 rounded-xl bg-amber-200 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60"
            >
              {portalLoading ? "Opening…" : "Kartı Güncelle"}
            </button>
          </div>
        ) : null}

        {isPro === false ? (
          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
            Pro ile tarayıcı eklentisini kullanıp sağ tıkla kaydedebilirsin.{" "}
            <a className="underline text-neutral-100" href="/pro">
              Pro planı gör
            </a>
          </div>
        ) : null}

        {/* ✅ Forgotten Upsell (Free users) */}
        {isPro === false && activeGroupId === "forgotten" ? (
          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-neutral-200">
                  Unutulanlar: Free vs Pro
                </div>
                <div className="mt-1 text-xs text-neutral-400">
                  Free planda{" "}
                  <span className="text-neutral-200 font-semibold">7+</span>{" "}
                  gündür bakmadıkların burada görünür. Pro’da{" "}
                  <span className="text-neutral-200 font-semibold">
                    30 / 60 / 90+
                  </span>{" "}
                  seçip kontrolü eline alırsın.
                </div>
              </div>

              <a
                href="/pro"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-100 transition"
              >
                Pro’ya geç
              </a>
            </div>
          </div>
        ) : null}

        {/* ✅ Extension card only Pro */}
        {isPro === true ? (
          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-neutral-200">
                  Tarayıcı Eklentisi (PRO)
                </div>

                {extChecking ? (
                  <div className="text-xs text-neutral-400">
                    Kontrol ediliyor…
                  </div>
                ) : extLiveHere ? (
                  <div className="text-xs text-emerald-300">
                    ✅ Bu tarayıcıda aktif
                  </div>
                ) : extConnected ? (
                  <div className="text-xs text-amber-300">
                    ⚠️ Bağlı görünüyor ama bu tarayıcıda aktif değil
                  </div>
                ) : (
                  <div className="text-xs text-rose-300">
                    ❌ Eklenti bağlı değil
                  </div>
                )}
              </div>

              {extChecking ? (
                <button
                  disabled
                  className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs font-semibold text-neutral-500 cursor-not-allowed"
                >
                  Kontrol ediliyor…
                </button>
              ) : extLiveHere ? (
                <button
                  onClick={() => router.push("/extension/connect")}
                  className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-100 hover:bg-neutral-800 transition"
                >
                  Yeniden bağla
                </button>
              ) : (
                <a
                  href="/extension/connect"
                  className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-100 transition"
                >
                  Bağla
                </a>
              )}
            </div>

            {!extChecking && !extLiveHere ? (
              <div className="mt-2 text-xs text-neutral-500">
                Pro kullanıcılar sağ tık → “clarionot’ya Kaydet” ile tek tık
                kaydeder.
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ✅ Groups bar + Drop zones */}
        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveGroupId("all")}
                className={`rounded-xl border px-3 py-1 text-xs ${
                  activeGroupId === "all"
                    ? "border-neutral-600 bg-neutral-900 text-neutral-100"
                    : "border-neutral-800 bg-neutral-950 text-neutral-300"
                }`}
              >
                All
              </button>

              {/* ✅ Forgotten PILL */}
              <button
                onClick={() => setActiveGroupId("forgotten")}
                className={`rounded-xl border px-3 py-1 text-xs ${
                  activeGroupId === "forgotten"
                    ? "border-neutral-600 bg-neutral-900 text-neutral-100"
                    : "border-neutral-800 bg-neutral-950 text-neutral-300"
                }`}
                title={
                  isPro === true
                    ? `${proForgottenDays}+ gündür açılmayan kayıtlar`
                    : "Free: 7+ gün | Pro: 30/60/90 seç"
                }
              >
                Unutulanlar{" "}
                <span className="text-neutral-500">
                  ({groupCounts["forgotten"] ?? 0})
                </span>
              </button>

              {/* ✅ Pro: 30/60/90 seçilebilir (DB kalıcı) */}
              {activeGroupId === "forgotten" ? (
                <div className="flex items-center gap-2">
                  <div className="text-[11px] text-neutral-500">Eşik</div>

                  {isPro === true ? (
                    <select
                      value={proForgottenDays}
                      onChange={async (e) => {
                        if (!userId) return;
                        const value = Number(e.target.value) as 30 | 60 | 90;
                        setProForgottenDays(value);

                        const { error } = await supabase
                          .from("user_settings")
                          .update({ forgotten_days: value })
                          .eq("user_id", userId);

                        if (error) {
                          showToast("err", "Ayar kaydedilemedi ❌");
                          fetchUserSettings(userId);
                        } else {
                          showToast("ok", "Ayar kaydedildi ✅");
                        }
                      }}
                      className="rounded-xl border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-200"
                    >
                      <option value={30}>30+</option>
                      <option value={60}>60+</option>
                      <option value={90}>90+</option>
                    </select>
                  ) : (
                    <button
                      type="button"
                      onClick={() => (window.location.href = "/pro")}
                      className="rounded-xl border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-900"
                      title="30 / 60 / 90 gün seçmek Pro’da"
                    >
                      7+ gün <span className="ml-1">🔒</span>
                    </button>
                  )}
                </div>
              ) : null}

              {/* ✅ Forgotten aksiyonları */}
              {/* ✅ Forgotten aksiyonları (Action Bar) */}
              {activeGroupId === "forgotten" && isPro === true ? (
                <div className="mt-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    {/* Sol: seçili info */}
                    <div className="flex items-center gap-2 text-xs text-neutral-300">
                      <span className="rounded-full border border-neutral-800 bg-neutral-900 px-2 py-1">
                        Seçili:{" "}
                        <span className="text-neutral-100 font-semibold">
                          {forgottenSelection.length}
                        </span>
                      </span>

                      {forgottenSelection.length === 0 ? (
                        <span className="text-neutral-500">
                          (Aksiyonlar için en az 1 kayıt seç)
                        </span>
                      ) : null}
                    </div>

                    {/* Sağ: aksiyonlar */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={
                          forgottenSelection.length === 0 || bulkLoading
                        }
                        onClick={async () => {
                          if (!userId) return;
                          if (forgottenSelection.length === 0) return;

                          try {
                            setBulkLoading(true);

                            const { error } = await supabase
                              .from("items")
                              .update({
                                group_id: null,
                                updated_at: new Date().toISOString(),
                              })
                              .in("id", forgottenSelection)
                              .eq("user_id", userId);

                            if (error) throw error;

                            setForgottenSelection([]);
                            await load(userId);
                            showToast("ok", "Inbox’a taşındı ✅");
                          } catch (e: any) {
                            showToast(
                              "err",
                              e?.message ?? "Inbox’a alınamadı ❌",
                            );
                          } finally {
                            setBulkLoading(false);
                          }
                        }}
                        className={`rounded-xl border px-3 py-1 text-xs transition ${
                          forgottenSelection.length === 0 || bulkLoading
                            ? "border-neutral-900 bg-neutral-950 text-neutral-600 cursor-not-allowed"
                            : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:bg-neutral-900"
                        }`}
                      >
                        Inbox’a al
                      </button>

                      <button
                        disabled={
                          forgottenSelection.length === 0 || bulkLoading
                        }
                        onClick={async () => {
                          if (!userId) return;
                          if (forgottenSelection.length === 0) return;

                          const ok = confirm(
                            `${forgottenSelection.length} kayıt silinecek. Emin misin?`,
                          );
                          if (!ok) return;

                          try {
                            setBulkLoading(true);

                            const { error } = await supabase
                              .from("items")
                              .delete()
                              .in("id", forgottenSelection)
                              .eq("user_id", userId);

                            if (error) throw error;

                            setForgottenSelection([]);
                            await load(userId);
                            showToast("ok", "Silindi 🗑️");
                          } catch (e: any) {
                            showToast("err", e?.message ?? "Silinemedi ❌");
                          } finally {
                            setBulkLoading(false);
                          }
                        }}
                        className={`rounded-xl border px-3 py-1 text-xs transition ${
                          forgottenSelection.length === 0 || bulkLoading
                            ? "border-red-950/40 bg-red-950/10 text-red-400/40 cursor-not-allowed"
                            : "border-red-900/40 bg-red-950/40 text-red-300 hover:bg-red-900/40"
                        }`}
                      >
                        Sil
                      </button>

                      {/* ✅ Ertele dropdown (7/14/30 buton çöplüğünü kaldırdık) */}
                      <select
                        disabled={
                          forgottenSelection.length === 0 || bulkLoading
                        }
                        defaultValue=""
                        onChange={async (e) => {
                          if (!userId) return;
                          const v = Number(e.target.value);
                          e.currentTarget.value = ""; // seçimi resetle (UI temiz kalsın)

                          if (![7, 14, 30].includes(v)) return;

                          try {
                            setBulkLoading(true);

                            const untilIso = new Date(
                              Date.now() + v * 24 * 60 * 60 * 1000,
                            ).toISOString();

                            const { error } = await supabase
                              .from("items")
                              .update({
                                snoozed_until: untilIso,
                                updated_at: new Date().toISOString(),
                              })
                              .in("id", forgottenSelection)
                              .eq("user_id", userId);

                            if (error) throw error;

                            setForgottenSelection([]);
                            await load(userId);
                            showToast("ok", `Ertelendi (${v} gün) ⏳`);
                          } catch (e2: any) {
                            showToast(
                              "err",
                              e2?.message ?? "Ertele kaydedilemedi ❌",
                            );
                          } finally {
                            setBulkLoading(false);
                          }
                        }}
                        className={`rounded-xl border px-3 py-1 text-xs transition ${
                          forgottenSelection.length === 0 || bulkLoading
                            ? "border-neutral-900 bg-neutral-950 text-neutral-600 cursor-not-allowed"
                            : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:bg-neutral-900"
                        }`}
                        title="Seçili kayıtları belirli süre gizle"
                      >
                        <option value="">Ertele ▼</option>
                        <option value={7}>7 gün</option>
                        <option value={14}>14 gün</option>
                        <option value={30}>30 gün</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* ✅ Inbox PILL (drop zone) */}
              <button
                type="button"
                onClick={() => setActiveGroupId("inbox")}
                {...inboxDrop}
                className={`rounded-xl border px-3 py-1 text-xs ${
                  activeGroupId === "inbox"
                    ? "border-neutral-600 bg-neutral-900 text-neutral-100"
                    : "border-neutral-800 bg-neutral-950 text-neutral-300"
                } ${
                  dragOverTarget === "inbox"
                    ? "outline outline-2 outline-emerald-500/60 bg-emerald-500/10 border-emerald-500/40"
                    : ""
                }`}
                title="Item’ları buraya sürükleyip Inbox’a alabilirsin"
              >
                Inbox{" "}
                <span className="text-neutral-500">
                  ({groupCounts["inbox"] ?? 0})
                </span>
              </button>

              {groups.map((g) => {
                const drop = makeDropHandlers({ groupId: g.id });
                const isOver =
                  dragOverTarget !== null &&
                  typeof dragOverTarget === "object" &&
                  dragOverTarget.groupId === g.id;

                const isActive = activeGroupId === g.id;
                const count = groupCounts[g.id] ?? 0;

                return (
                  <div
                    key={g.id}
                    {...drop}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1 text-xs ${
                      isActive
                        ? "border-neutral-600 bg-neutral-900 text-neutral-100"
                        : "border-neutral-800 bg-neutral-950 text-neutral-300"
                    } ${
                      isOver
                        ? "outline outline-2 outline-emerald-500/60 bg-emerald-500/10 border-emerald-500/40"
                        : ""
                    }`}
                    title="Item’ları buraya sürükleyip gruba taşı"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveGroupId(g.id)}
                      className="flex items-center gap-2"
                    >
                      <span className="max-w-[140px] truncate">{g.title}</span>
                      <span className="rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] text-neutral-400">
                        {count}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openRename(g);
                      }}
                      className="text-[11px] text-neutral-500 hover:text-neutral-200"
                      title="Grubu yeniden adlandır"
                    >
                      ✎
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGroup(g.id);
                      }}
                      className="text-[11px] text-neutral-500 hover:text-red-400"
                      title="Grubu sil"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => setOpenGroupModal(true)}
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-900 transition"
              >
                + Group
              </button>

              {activeGroupId === "forgotten" ? (
                <button
                  type="button"
                  onClick={() =>
                    setForgottenSort((p) =>
                      p === "oldest" ? "newest" : "oldest",
                    )
                  }
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-900 transition"
                  title="Unutulanları sırala"
                >
                  {forgottenSort === "oldest" ? "En eski" : "En yeni"}
                </button>
              ) : null}

              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ara..."
              />
            </div>
          </div>

          <div className="mt-3 text-xs text-neutral-500">
            İpucu: Bir not/link kartını sürükleyip Inbox veya bir gruba bırak.
          </div>
        </div>

        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SOL: NOTLAR */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-200">
                📝 Notlar
              </h2>
              <Button variant="ghost" onClick={() => openNew("note")}>
                + Not
              </Button>
            </div>

            {loading ? (
              <div className="text-sm text-neutral-400">Yükleniyor…</div>
            ) : notes.length === 0 ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-sm text-neutral-400">
                Henüz not yok.
              </div>
            ) : activeGroupId === "all" ? (
              <div className="space-y-4">
                {/* Inbox notes section */}
                <div
                  {...inboxDrop}
                  className={`rounded-2xl border border-neutral-800 bg-neutral-950 ${dropZoneClass(
                    dragOverTarget === "inbox",
                  )}`}
                >
                  <button
                    onClick={() => toggleCollapsed("inbox_notes")}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="text-xs font-semibold text-neutral-200">
                      Inbox{" "}
                      <span className="text-neutral-500">
                        ({(notesByGroup["inbox"] ?? []).length})
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400">
                      {collapsed["inbox_notes"] ? "▸" : "▾"}
                    </div>
                  </button>

                  {!collapsed["inbox_notes"] ? (
                    <div className="p-4 pt-0 grid gap-3">
                      {(notesByGroup["inbox"] ?? []).map((it: any) => (
                        <DraggableWrap key={it.id} it={it} />
                      ))}
                      {(notesByGroup["inbox"] ?? []).length === 0 ? (
                        <div className="text-sm text-neutral-500">
                          Inbox boş.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Group sections */}
                {groups.map((g) => {
                  const list = notesByGroup[g.id] ?? [];
                  if (list.length === 0) return null;

                  const drop = makeDropHandlers({ groupId: g.id });
                  const isOver =
                    dragOverTarget !== null &&
                    typeof dragOverTarget === "object" &&
                    dragOverTarget.groupId === g.id;

                  return (
                    <div
                      key={g.id}
                      {...drop}
                      className={`rounded-2xl border border-neutral-800 bg-neutral-950 ${dropZoneClass(
                        isOver,
                      )}`}
                    >
                      <button
                        onClick={() => toggleCollapsed(`notes_${g.id}`)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left"
                      >
                        <div className="text-xs font-semibold text-neutral-200">
                          {g.title}{" "}
                          <span className="text-neutral-500">
                            ({list.length})
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400">
                          {collapsed[`notes_${g.id}`] ? "▸" : "▾"}
                        </div>
                      </button>

                      {!collapsed[`notes_${g.id}`] ? (
                        <div className="p-4 pt-0 grid gap-3">
                          {list.map((it: any) => (
                            <DraggableWrap key={it.id} it={it} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-3">
                {notes.map((it: any) => (
                  <DraggableWrap key={it.id} it={it} />
                ))}
              </div>
            )}
          </div>

          {/* SAĞ: LİNKLER */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-200">
                🔗 Linkler
              </h2>
              <Button variant="ghost" onClick={() => openNew("link")}>
                + Link
              </Button>
            </div>

            {loading ? (
              <div className="text-sm text-neutral-400">Yükleniyor…</div>
            ) : links.length === 0 ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-sm text-neutral-400">
                Henüz link yok.
              </div>
            ) : activeGroupId === "all" ? (
              <div className="space-y-4">
                {/* Inbox links section */}
                <div
                  {...inboxDrop}
                  className={`rounded-2xl border border-neutral-800 bg-neutral-950 ${dropZoneClass(
                    dragOverTarget === "inbox",
                  )}`}
                >
                  <button
                    onClick={() => toggleCollapsed("inbox_links")}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="text-xs font-semibold text-neutral-200">
                      Inbox{" "}
                      <span className="text-neutral-500">
                        ({(linksByGroup["inbox"] ?? []).length})
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400">
                      {collapsed["inbox_links"] ? "▸" : "▾"}
                    </div>
                  </button>

                  {!collapsed["inbox_links"] ? (
                    <div className="p-4 pt-0 grid gap-3">
                      {(linksByGroup["inbox"] ?? []).map((it: any) => (
                        <DraggableWrap key={it.id} it={it} />
                      ))}
                      {(linksByGroup["inbox"] ?? []).length === 0 ? (
                        <div className="text-sm text-neutral-500">
                          Inbox boş.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Group sections */}
                {groups.map((g) => {
                  const list = linksByGroup[g.id] ?? [];
                  if (list.length === 0) return null;

                  const drop = makeDropHandlers({ groupId: g.id });
                  const isOver =
                    dragOverTarget !== null &&
                    typeof dragOverTarget === "object" &&
                    dragOverTarget.groupId === g.id;

                  return (
                    <div
                      key={g.id}
                      {...drop}
                      className={`rounded-2xl border border-neutral-800 bg-neutral-950 ${dropZoneClass(
                        isOver,
                      )}`}
                    >
                      <button
                        onClick={() => toggleCollapsed(`links_${g.id}`)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left"
                      >
                        <div className="text-xs font-semibold text-neutral-200">
                          {g.title}{" "}
                          <span className="text-neutral-500">
                            ({list.length})
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400">
                          {collapsed[`links_${g.id}`] ? "▸" : "▾"}
                        </div>
                      </button>

                      {!collapsed[`links_${g.id}`] ? (
                        <div className="p-4 pt-0 grid gap-3">
                          {list.map((it: any) => (
                            <DraggableWrap key={it.id} it={it} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-3">
                {links.map((it: any) => (
                  <DraggableWrap key={it.id} it={it} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ✅ CREATE GROUP MODAL */}
      <Modal
        open={openGroupModal}
        title="Create group"
        onClose={() => setOpenGroupModal(false)}
      >
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs text-neutral-400">Title</div>
            <Input
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              placeholder="e.g. Work, Learn, Ideas..."
            />
          </div>

          <div>
            <div className="mb-2 text-xs text-neutral-400">
              Add items (optional) — only Inbox items selectable
            </div>

            <div className="max-h-64 overflow-auto rounded-xl border border-neutral-800">
              {ungroupedItems.map((it: any) => {
                const checked = selectedItemIds.includes(it.id);
                return (
                  <label
                    key={it.id}
                    className="flex items-center gap-2 px-3 py-2 border-b border-neutral-900 text-sm text-neutral-200"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedItemIds((prev) => [...prev, it.id]);
                        else
                          setSelectedItemIds((prev) =>
                            prev.filter((x) => x !== it.id),
                          );
                      }}
                    />
                    <span className="truncate">
                      {it.type === "note" ? "📝" : "🔗"}{" "}
                      {it.title || it.content}
                    </span>
                  </label>
                );
              })}

              {ungroupedItems.length === 0 ? (
                <div className="p-3 text-sm text-neutral-500">
                  Inbox boş (group’suz item yok).
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpenGroupModal(false)}>
              Cancel
            </Button>
            <Button onClick={createGroupAndAssign} disabled={savingGroup}>
              {savingGroup ? "Saving..." : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ✅ RENAME MODAL */}
      <Modal
        open={openRenameModal}
        title="Rename group"
        onClose={() => setOpenRenameModal(false)}
      >
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs text-neutral-400">New title</div>
            <Input
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              placeholder="Group name..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpenRenameModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveRename} disabled={renaming}>
              {renaming ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ONBOARDING MODAL */}
      <Modal
        open={openOnboarding}
        title="Hoş geldin 👋"
        onClose={() => setOpenOnboarding(false)}
      >
        <div className="space-y-4">
          {onboardingStep === 0 ? (
            <>
              <div className="text-sm font-semibold text-neutral-200">
                1) Değerli şeyi kaydet
              </div>
              <div className="text-sm text-neutral-300">
                Bir link veya not ekle. “Sonra bakarım” dediğin şey kaybolmasın.
              </div>
            </>
          ) : null}

          {onboardingStep === 1 ? (
            <>
              <div className="text-sm font-semibold text-neutral-200">
                2) Bağlam ekle
              </div>
              <div className="text-sm text-neutral-300">
                Linke kısa bir açıklama yaz ve etiketle. Sonra ararken hayat
                kurtarır.
              </div>
            </>
          ) : null}

          {onboardingStep === 2 ? (
            <>
              <div className="text-sm font-semibold text-neutral-200">
                3) Saniyede bul
              </div>
              <div className="text-sm text-neutral-300">
                Üstteki arama alanına bir kelime yaz. Başlık, içerik ve
                etiketlerden tarar.
              </div>
            </>
          ) : null}

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-neutral-500">
              {onboardingStep + 1} / 3
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={skipOnboarding}>
                Şimdilik geç
              </Button>

              {onboardingStep < 2 ? (
                <Button onClick={() => setOnboardingStep((s) => s + 1)}>
                  Devam
                </Button>
              ) : (
                <Button onClick={finishOnboarding}>Hadi başlayalım</Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ADD MODAL */}
      <Modal
        open={openAdd}
        title={draft.type === "link" ? "Link ekle" : "Not ekle"}
        onClose={() => setOpenAdd(false)}
      >
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs text-neutral-400">Başlık</div>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder={
                draft.type === "link"
                  ? "Örn: YouTube - React Hooks"
                  : "Örn: Bugünkü notlar"
              }
            />
          </div>

          {draft.type === "link" ? (
            <>
              <div>
                <div className="mb-1 text-xs text-neutral-400">URL</div>
                <Input
                  value={draft.content}
                  onChange={(e) =>
                    setDraft({ ...draft, content: e.target.value })
                  }
                  placeholder="https://..."
                  inputMode="url"
                />
                <div className="mt-1 text-xs text-neutral-500">
                  (http/https yoksa otomatik eklenecek)
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs text-neutral-400">
                  Açıklama (opsiyonel)
                </div>
                <Textarea
                  className="min-h-[90px]"
                  value={(draft as any).note ?? ""}
                  onChange={(e) =>
                    setDraft({ ...(draft as any), note: e.target.value } as any)
                  }
                  placeholder="Bu link neyle ilgili?"
                />
              </div>
            </>
          ) : (
            <div>
              <div className="mb-1 text-xs text-neutral-400">Not</div>
              <Textarea
                className="min-h-[180px]"
                value={draft.content}
                onChange={(e) =>
                  setDraft({ ...draft, content: e.target.value })
                }
                placeholder="Notunu yaz..."
              />
            </div>
          )}

          <div>
            <div className="mb-1 text-xs text-neutral-400">
              Group (optional)
            </div>
            <select
              value={draft.group_id ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  group_id: e.target.value ? e.target.value : null,
                })
              }
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
            >
              <option value="">Inbox (no group)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-neutral-400">Etiketler</div>
            <TagInput
              value={draft.tags}
              onChange={(tags) => setDraft({ ...draft, tags })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpenAdd(false)}>
              İptal
            </Button>
            <Button onClick={saveDraft} disabled={saving}>
              {saving
                ? draft.type === "link"
                  ? "Başlık alınıyor…"
                  : "Kaydediliyor…"
                : "Kaydet"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        open={openDetail}
        title="Detay"
        onClose={() => setOpenDetail(false)}
      >
        <div className="space-y-3">
          <div className="text-xs text-neutral-400">
            Tür: {draft.type === "link" ? "Link" : "Not"}
          </div>

          <div>
            <div className="mb-1 text-xs text-neutral-400">Başlık</div>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-neutral-400">İçerik</div>
            <Textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-neutral-400">Group</div>
            <select
              value={draft.group_id ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  group_id: e.target.value ? e.target.value : null,
                })
              }
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
            >
              <option value="">Inbox (no group)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-neutral-400">Etiketler</div>
            <TagInput
              value={draft.tags}
              onChange={(tags) => setDraft({ ...draft, tags })}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="danger" onClick={removeItem}>
              Sil
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpenDetail(false)}>
                Kapat
              </Button>
              <Button onClick={updateItem}>Kaydet</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ✅ ERR */}
      {err ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl border border-red-900/40 bg-red-950/60 px-4 py-2 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      {/* ✅ TOAST */}
      {toast ? (
        <div
          className={`fixed bottom-16 left-1/2 -translate-x-1/2 rounded-xl border px-4 py-2 text-sm ${
            toast.type === "ok"
              ? "border-emerald-900/40 bg-emerald-950/40 text-emerald-100"
              : "border-red-900/40 bg-red-950/40 text-red-100"
          }`}
        >
          {toast.text}
        </div>
      ) : null}
    </main>
  );
}
