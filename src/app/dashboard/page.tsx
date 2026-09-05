"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Item, ItemType, WorkStatus } from "@/lib/types";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import Input from "@/components/Input";
import DnaBackdrop from "@/components/DnaBackdrop";
import { NATIVE_BACK_EVENT } from "@/lib/nativeBack";
import { useIsNativeApp } from "@/lib/useIsNativeApp";
import {
  WORK_STATUS_META,
  baseDateOf,
  emptyDraft,
  isActivelySnoozed,
  type ForgottenSegment,
  type Group,
  type ItemDraft,
  type WorkStatusFilter,
} from "@/lib/items";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import DesktopSidebar from "@/components/dashboard/DesktopSidebar";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import MobileGroupsSheet from "@/components/dashboard/MobileGroupsSheet";
import DashboardViewHeader from "@/components/dashboard/DashboardViewHeader";
import SelectionActionBar from "@/components/dashboard/SelectionActionBar";
import UnifiedItemList from "@/components/dashboard/UnifiedItemList";
import ItemDetailSheet from "@/components/dashboard/ItemDetailSheet";
import DashboardFilterSheet from "@/components/dashboard/DashboardFilterSheet";
import WeeklySummarySheet from "@/components/dashboard/WeeklySummarySheet";
import CreateItemModal from "@/components/dashboard/CreateItemModal";
import { ExtensionStatusSidebarFooter } from "@/components/dashboard/ExtensionStatus";

type ItemTypeFilter = "all" | "note" | "link";

type ClipUsage =
  | { plan: "pro"; unlimited: true }
  | {
      plan: "free";
      unlimited: false;
      used: number;
      limit: number;
      remaining: number;
    };

type ToastState = {
  type: "ok" | "err";
  text: string;
} | null;

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isNativeApp, isPlatformResolved } = useIsNativeApp();

  const [userId, setUserId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [openOnboarding, setOpenOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const [extConnected, setExtConnected] = useState<boolean>(false);
  const [extLiveHere, setExtLiveHere] = useState<boolean>(false);
  const [extChecking, setExtChecking] = useState<boolean>(true);
  const [openExtensionPanel, setOpenExtensionPanel] = useState(false);

  const [clipUsage, setClipUsage] = useState<ClipUsage | null>(null);
  const [clipUsageLoading, setClipUsageLoading] = useState<boolean>(true);
  const [clipUsageError, setClipUsageError] = useState<boolean>(false);

  const [forgottenSort, setForgottenSort] = useState<"oldest" | "newest">(
    "oldest",
  );
  const [forgottenSegment, setForgottenSegment] =
    useState<ForgottenSegment>("all");

  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [proForgottenDays, setProForgottenDays] = useState<30 | 60 | 90>(30);

  const [q, setQ] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [activeType, setActiveType] = useState<ItemTypeFilter>("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeWorkStatus, setActiveWorkStatus] =
    useState<WorkStatusFilter>("all");
  const [openAdd, setOpenAdd] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [draft, setDraft] = useState<ItemDraft>(emptyDraft("link"));
  const [err, setErr] = useState<string | null>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [openFilterSheet, setOpenFilterSheet] = useState(false);
  const [openWeeklySummarySheet, setOpenWeeklySummarySheet] = useState(false);
  const [openMobileGroupsSheet, setOpenMobileGroupsSheet] = useState(false);
  const [sidebarGroupsExpanded, setSidebarGroupsExpanded] = useState(true);

  const [toast, setToast] = useState<ToastState>(null);
  const normalizeAiError = (message?: string | null) => {
    if (!message) return "AI işlemi şu anda kullanılamıyor";

    if (
      message.includes("INTERNAL_AI_SECRET") ||
      message.includes("AI is not configured")
    ) {
      return "AI özelliği henüz yapılandırılmamış";
    }

    if (message.includes("OPENAI_API_KEY")) {
      return "AI sağlayıcı ayarları eksik";
    }

    return message;
  };
  const showToast = (type: "ok" | "err", text: string) =>
    setToast({ type, text });
  const viewTimersRef = useRef<Record<string, number>>({});
  const focusedQueryHandledRef = useRef<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const setWorkStatusForItem = async (itemId: string, status: WorkStatus) => {
    if (!userId) return;

    const previous = items;
    const nowIso = new Date().toISOString();

    setItems((prev: any) =>
      prev.map((it: any) =>
        it.id === itemId
          ? { ...it, work_status: status, updated_at: nowIso }
          : it,
      ),
    );

    const { error } = await supabase
      .from("items")
      .update({ work_status: status, updated_at: nowIso })
      .eq("id", itemId)
      .eq("user_id", userId);

    if (error) {
      setItems(previous);
      showToast("err", error.message ?? "Durum kaydedilemedi");
      return;
    }

    showToast("ok", `Durum: ${WORK_STATUS_META[status].label}`);
  };

  const setSnoozeForItem = async (itemId: string, days: number | null) => {
    if (!userId) return;

    const previous = items;
    const nowIso = new Date().toISOString();
    const snoozedUntil =
      days === null
        ? null
        : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    setItems((prev: any) =>
      prev.map((it: any) =>
        it.id === itemId
          ? { ...it, snoozed_until: snoozedUntil, updated_at: nowIso }
          : it,
      ),
    );

    const { error } = await supabase
      .from("items")
      .update({
        snoozed_until: snoozedUntil,
        updated_at: nowIso,
      })
      .eq("id", itemId)
      .eq("user_id", userId);

    if (error) {
      setItems(previous);
      showToast("err", error.message ?? "Erteleme kaydedilemedi");
      return;
    }

    showToast(
      "ok",
      days === null ? "Erteleme kaldırıldı" : `Ertelendi: ${days} gün`,
    );
  };

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const quickSearch =
        (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) ||
        (event.key === "/" && !isTypingTarget(event.target));

      if (quickSearch) {
        event.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        } else {
          setMobileSearchOpen(true);
        }
        return;
      }

      if (
        event.key === "Escape" &&
        document.activeElement === searchInputRef.current
      ) {
        setQ("");
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<
    null | "inbox" | { groupId: string }
  >(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<
    string | "all" | "inbox" | "forgotten"
  >("all");
  const [activeAiCategory, setActiveAiCategory] = useState<
    | "all"
    | "documentation"
    | "tool"
    | "competitor"
    | "article"
    | "inspiration"
    | "pricing"
    | "other"
  >("all");
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const [openRenameModal, setOpenRenameModal] = useState(false);
  const [renameGroupId, setRenameGroupId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [paymentIssue, setPaymentIssue] = useState<boolean>(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const [forgottenSelection, setForgottenSelection] = useState<string[]>([]);
  const [aiSelection, setAiSelection] = useState<string[]>([]);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [groupEnhancing, setGroupEnhancing] = useState(false);
  const [groupProgress, setGroupProgress] = useState<{
    total: number;
    okCount: number;
    failCount: number;
  } | null>(null);
  const forgottenDays = isPro === true ? proForgottenDays : 7;
  const FORGOTTEN_MS = forgottenDays * 24 * 60 * 60 * 1000;
  const [aiProgress, setAiProgress] = useState<{
    total: number;
    done: number;
    okCount: number;
    failCount: number;
  } | null>(null);
  const [regeneratingItemId, setRegeneratingItemId] = useState<string | null>(
    null,
  );
  const isForgotten = useCallback(
    (it: any) => {
      if (it.snoozed_until) {
        const until = new Date(it.snoozed_until).getTime();
        if (Date.now() < until) return false;
      }

      return Date.now() - baseDateOf(it).getTime() > FORGOTTEN_MS;
    },
    [FORGOTTEN_MS],
  );

  const daysSinceBaseOf = (it: any) => {
    const time = baseDateOf(it).getTime();
    if (!Number.isFinite(time)) return 0;
    return Math.max(0, Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000)));
  };

  const startOfWeek = () => {
    const now = new Date();
    const day = now.getDay() || 7;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - day + 1);
    return start;
  };

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

    setItems((prev: any) =>
      prev.map((it: any) =>
        it.id === itemId ? { ...it, last_viewed_at: nowIso } : it,
      ),
    );

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

  const fetchClipUsage = useCallback(async () => {
    setClipUsageLoading(true);
    setClipUsageError(false);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setClipUsageError(true);
        return;
      }

      const res = await fetch("/api/clip/usage", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        setClipUsageError(true);
        return;
      }

      setClipUsage(json as ClipUsage);
    } catch {
      setClipUsageError(true);
    } finally {
      setClipUsageLoading(false);
    }
  }, []);

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
      setErr(e?.message ?? "Ödeme sayfası açılamadı.");
      showToast("err", e?.message ?? "Ödeme sayfası açılamadı ❌");
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== window) return;
      if (e.origin !== window.location.origin) return;

      const data = (e.data ?? {}) as any;

      if (
        data.source === "clarionot-extension" &&
        data.type === "EXTENSION_READY"
      ) {
        setExtConnected(true);
        setExtLiveHere(true);
        setExtChecking(false);
        return;
      }

      if (data?.type === "CLARIONOT_SAVED_UI") {
        showToast("ok", "✅ Eklenti ile kaydedildi");
        if (userId) load(userId);
        fetchClipUsage();
        return;
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [userId, fetchClipUsage]);

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

  const pingExtension = async () => {
    const PING = "CLARIONOT_PING";
    const PONG = "CLARIONOT_PONG";

    return await new Promise<boolean>((resolve) => {
      const t = window.setTimeout(() => {
        window.removeEventListener("message", onMsg);
        resolve(false);
      }, 1200);

      function onMsg(e: MessageEvent) {
        if (e.source !== window) return;
        if ((e.data as any)?.type !== PONG) return;

        window.clearTimeout(t);
        window.removeEventListener("message", onMsg);
        resolve(true);
      }

      window.addEventListener("message", onMsg);
      window.postMessage({ type: PING }, "*");
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
        .eq("user_id", uid)
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
      .eq("user_id", uid)
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

  useEffect(() => {
    if (!userId) return;
    const key = `clarionot:onboarding:v1:${userId}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      setOpenOnboarding(true);
      setOnboardingStep(0);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    load(userId);
    loadGroups(userId);

    const run = async () => {
      if (!isPlatformResolved) return;

      if (isNativeApp) {
        setExtChecking(false);
        setExtConnected(false);
        setExtLiveHere(false);
        return;
      }

      if (isPro == null) return;

      if (cancelled) return;
      setExtChecking(true);

      try {
        const hasToken = await checkExtension(userId);
        if (cancelled) return;

        if (!hasToken) {
          setExtLiveHere(false);
          return;
        }

        const live = await pingExtensionWithRetry(3, 300);
        if (cancelled) return;

        setExtLiveHere((prev) => (live ? true : prev));
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
  }, [userId, isPro, isNativeApp, isPlatformResolved]);

  useEffect(() => {
    if (!userId || !isPlatformResolved || isNativeApp) return;
    fetchClipUsage();
  }, [userId, isPlatformResolved, isNativeApp, fetchClipUsage]);

  useEffect(() => {
    if (activeGroupId !== "forgotten" || isPro !== true) {
      setForgottenSelection([]);
    }
  }, [activeGroupId, isPro]);

  useEffect(() => {
    if (isPro !== true) {
      setSelectionMode(false);
      setAiSelection([]);
    }
  }, [isPro]);

  useEffect(() => {
    if (activeGroupId !== "forgotten") {
      setForgottenSegment("all");
    }
  }, [activeGroupId]);

  useEffect(() => {
    const closeTopmostDialog = () => {
      if (openOnboarding) {
        setOpenOnboarding(false);
        return true;
      }
      if (openDetail) {
        setOpenDetail(false);
        return true;
      }
      if (openAdd) {
        setOpenAdd(false);
        return true;
      }
      if (openFilterSheet) {
        setOpenFilterSheet(false);
        return true;
      }
      if (openWeeklySummarySheet) {
        setOpenWeeklySummarySheet(false);
        return true;
      }
      if (openMobileGroupsSheet) {
        setOpenMobileGroupsSheet(false);
        return true;
      }
      if (openExtensionPanel) {
        setOpenExtensionPanel(false);
        return true;
      }
      if (openRenameModal) {
        setOpenRenameModal(false);
        return true;
      }
      if (openGroupModal) {
        setOpenGroupModal(false);
        return true;
      }
      return false;
    };

    const onNativeBack = (event: Event) => {
      if (event.defaultPrevented) return;
      if (closeTopmostDialog()) {
        event.preventDefault();
      }
    };

    window.addEventListener(NATIVE_BACK_EVENT, onNativeBack);
    return () => window.removeEventListener(NATIVE_BACK_EVENT, onNativeBack);
  }, [
    openOnboarding,
    openDetail,
    openAdd,
    openFilterSheet,
    openWeeklySummarySheet,
    openMobileGroupsSheet,
    openExtensionPanel,
    openRenameModal,
    openGroupModal,
  ]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { inbox: 0, forgotten: 0 };
    for (const it of items as any) {
      const gid = it.group_id ? String(it.group_id) : "inbox";
      counts[gid] = (counts[gid] ?? 0) + 1;
      if (isForgotten(it)) counts["forgotten"] = (counts["forgotten"] ?? 0) + 1;
    }
    return counts;
  }, [items, isForgotten]);

  const forgottenSegmentCounts = useMemo(() => {
    const counts: Record<ForgottenSegment, number> = {
      all: 0,
      "7": 0,
      "30": 0,
      "90": 0,
      today: 0,
      snoozed: 0,
    };

    for (const it of items as any[]) {
      const age = daysSinceBaseOf(it);
      const status = (it.work_status ?? "later") as WorkStatus;

      if (isActivelySnoozed(it)) counts.snoozed += 1;
      if (isForgotten(it)) {
        counts.all += 1;
        if (age >= 7) counts["7"] += 1;
        if (age >= 30) counts["30"] += 1;
        if (age >= 90) counts["90"] += 1;
        if (status === "today") counts.today += 1;
      }
    }

    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isForgotten]);

  const aiCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const it of items as any) {
      const c = String(it.ai_category ?? "other").toLowerCase();
      counts.all = (counts.all ?? 0) + 1;
      counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const workStatusCounts = useMemo(() => {
    const counts: Record<WorkStatusFilter, number> = {
      all: items.length,
      later: 0,
      today: 0,
      doing: 0,
      done: 0,
    };

    for (const it of items as any) {
      const status = (it.work_status ?? "later") as WorkStatus;
      counts[status] += 1;
    }

    return counts;
  }, [items]);

  const weeklyPulse = useMemo(() => {
    const weekStart = startOfWeek().getTime();
    const savedThisWeek = items.filter((it: any) => {
      const created = new Date(it.created_at).getTime();
      return Number.isFinite(created) && created >= weekStart;
    }).length;

    const doneThisWeek = items.filter((it: any) => {
      const updated = new Date(it.updated_at).getTime();
      return (
        (it.work_status ?? "later") === "done" &&
        Number.isFinite(updated) &&
        updated >= weekStart
      );
    }).length;

    const forgottenItems = (items as any[])
      .filter((it) => isForgotten(it) && (it.work_status ?? "later") !== "done")
      .sort((a, b) => daysSinceBaseOf(b) - daysSinceBaseOf(a));

    const activeItems = (items as any[])
      .filter((it) => {
        const status = it.work_status ?? "later";
        return status === "today" || status === "doing";
      })
      .sort((a, b) => daysSinceBaseOf(b) - daysSinceBaseOf(a));

    const suggestions = [...activeItems, ...forgottenItems].filter(
      (item, index, list) => list.findIndex((it) => it.id === item.id) === index,
    );

    return {
      savedThisWeek,
      doneThisWeek,
      forgottenCount: forgottenItems.length,
      focusItems: suggestions.slice(0, 3),
    };
  }, [items, isForgotten]);

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

    const afterType =
      activeType === "all" ? base : base.filter((it: any) => it.type === activeType);

    const afterTags =
      activeTags.length === 0
        ? afterType
        : afterType.filter((it: any) =>
            (it.tags ?? []).some((t: string) => activeTags.includes(t)),
          );

    const afterAi =
      activeAiCategory === "all"
        ? afterTags
        : afterTags.filter((it: any) => {
            const c = String(it.ai_category ?? "other").toLowerCase();
            return c === activeAiCategory;
          });

    const afterWorkStatus =
      activeWorkStatus === "all"
        ? afterAi
        : afterAi.filter(
            (it: any) => (it.work_status ?? "later") === activeWorkStatus,
          );

    if (activeGroupId === "all") return afterWorkStatus;

    if (activeGroupId === "forgotten") {
      if (forgottenSegment === "snoozed") {
        return afterWorkStatus.filter((it: any) => isActivelySnoozed(it));
      }

      const forgottenItemsList = afterWorkStatus.filter((it: any) =>
        isForgotten(it),
      );

      if (forgottenSegment === "today") {
        return forgottenItemsList.filter(
          (it: any) => (it.work_status ?? "later") === "today",
        );
      }

      if (forgottenSegment === "7") {
        return forgottenItemsList.filter((it: any) => daysSinceBaseOf(it) >= 7);
      }

      if (forgottenSegment === "30") {
        return forgottenItemsList.filter((it: any) => daysSinceBaseOf(it) >= 30);
      }

      if (forgottenSegment === "90") {
        return forgottenItemsList.filter((it: any) => daysSinceBaseOf(it) >= 90);
      }

      return forgottenItemsList;
    }

    if (activeGroupId === "inbox")
      return afterWorkStatus.filter((it: any) => !it.group_id);

    return afterWorkStatus.filter(
      (it: any) => String(it.group_id) === activeGroupId,
    );
  }, [
    items,
    q,
    activeType,
    activeTags,
    activeGroupId,
    forgottenSegment,
    isForgotten,
    activeAiCategory,
    activeWorkStatus,
  ]);

  const finalItems = useMemo(() => {
    if (activeGroupId !== "forgotten") return filteredItems;

    const sorted = [...filteredItems].sort((a: any, b: any) => {
      const da = baseDateOf(a).getTime();
      const db = baseDateOf(b).getTime();
      return forgottenSort === "oldest" ? da - db : db - da;
    });

    const focusedItemId = searchParams.get("focus");
    if (focusedItemId) {
      sorted.sort((a: any, b: any) => {
        if (a.id === focusedItemId) return -1;
        if (b.id === focusedItemId) return 1;
        return 0;
      });
    }

    return sorted;
  }, [filteredItems, activeGroupId, forgottenSort, searchParams]);

  const totalNoteCount = useMemo(
    () => items.filter((it) => it.type === "note").length,
    [items],
  );
  const totalLinkCount = useMemo(
    () => items.filter((it) => it.type === "link").length,
    [items],
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) (it.tags ?? []).forEach((t) => set.add(t));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));
  }, [items]);

  const openItemLive = useMemo(
    () => items.find((it) => it.id === draft.id) ?? null,
    [items, draft.id],
  );

  const primaryNav = useMemo<"home" | "today" | "forgotten" | "groups">(() => {
    if (activeGroupId === "forgotten") return "forgotten";
    if (activeGroupId !== "all") return "groups";
    if (activeWorkStatus === "today") return "today";
    return "home";
  }, [activeGroupId, activeWorkStatus]);

  // "today" is the mandatory baseline work-status while primaryNav is Today,
  // not a user-applied advanced filter — it must not inflate the filter count.
  const advancedFilterCount = useMemo(() => {
    let n = 0;
    if (activeAiCategory !== "all") n += 1;
    if (activeTags.length > 0) n += 1;
    const isTodayBaseline = primaryNav === "today" && activeWorkStatus === "today";
    if (activeWorkStatus !== "all" && !isTodayBaseline) n += 1;
    return n;
  }, [activeWorkStatus, activeAiCategory, activeTags, primaryNav]);

  const viewTitle = useMemo(() => {
    if (activeGroupId === "forgotten") return "Unutulanlar";
    if (activeGroupId === "inbox") return "Inbox";
    if (activeGroupId !== "all") {
      return groups.find((g) => g.id === activeGroupId)?.title ?? "Grup";
    }
    return activeWorkStatus === "today" ? "Bugün" : "Ana sayfa";
  }, [activeGroupId, activeWorkStatus, groups]);

  // Shared baseline for every primary-nav destination: advanced/view-local
  // filters (type, tags, AI category) never carry over between Home, Today,
  // Forgotten and a Group/Inbox — only the primary nav scope itself persists.
  const resetViewLocalFilters = useCallback(() => {
    setActiveType("all");
    setActiveTags([]);
    setActiveAiCategory("all");
  }, []);

  const navHome = useCallback(() => {
    setActiveGroupId("all");
    setActiveWorkStatus("all");
    resetViewLocalFilters();
  }, [resetViewLocalFilters]);
  const navToday = useCallback(() => {
    setActiveGroupId("all");
    setActiveWorkStatus("today");
    resetViewLocalFilters();
  }, [resetViewLocalFilters]);
  const navForgotten = useCallback(() => {
    setActiveGroupId("forgotten");
    setActiveWorkStatus("all");
    setForgottenSegment("all");
    resetViewLocalFilters();
  }, [resetViewLocalFilters]);
  const selectGroup = useCallback(
    (id: string) => {
      setActiveGroupId(id);
      setActiveWorkStatus("all");
      resetViewLocalFilters();
    },
    [resetViewLocalFilters],
  );
  const onChangeGroupFilter = useCallback(
    (id: string) => {
      if (id === "all") navHome();
      else selectGroup(id);
    },
    [navHome, selectGroup],
  );

  useEffect(() => {
    if (searchParams.get("view") === "forgotten") {
      navForgotten();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const ungroupedItems = useMemo(() => {
    return items.filter((it: any) => !it.group_id);
  }, [items]);

  const openNew = (type: ItemType) => {
    setDraft(emptyDraft(type));
    setOpenAdd(true);
  };

  const deleteGroup = async (groupId: string) => {
    if (!userId) return;

    const ok = confirm(
      "Bu grubu silmek istiyor musun?\nBu gruptaki tüm kayıtlar Inbox’a taşınacak.",
    );
    if (!ok) return;

    const groupTitleValue = groups.find((g) => g.id === groupId)?.title ?? "Grup";

    try {
      setErr(null);

      const { error: moveErr } = await supabase
        .from("items")
        .update({ group_id: null, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("group_id", groupId);

      if (moveErr) throw moveErr;

      const { error: delErr } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId)
        .eq("user_id", userId);

      if (delErr) throw delErr;

      if (activeGroupId === groupId) setActiveGroupId("inbox");
      await loadGroups(userId);
      await load(userId);

      showToast("ok", `🗑️ "${groupTitleValue}" silindi (Inbox’a taşındı)`);
    } catch (e: any) {
      setErr(e?.message ?? "Grup silinemedi.");
      showToast("err", e?.message ?? "Grup silinemedi ❌");
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
      setErr("Grup adı boş olamaz.");
      showToast("err", "Grup adı boş olamaz ❌");
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
      setErr(e?.message ?? "Grup adı güncellenemedi.");
      showToast("err", e?.message ?? "Grup adı güncellenemedi ❌");
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

      const payload: any = {
        user_id: userId,
        type: draft.type,
        title,
        content,
        tags: draft.tags,
        work_status: "later",
        group_id: draft.group_id ?? null,
      };

      if (isPro !== true) {
        const { count, error: countErr } = await supabase
          .from("items")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        if (countErr) throw countErr;

        const freeLimit = Number(process.env.NEXT_PUBLIC_FREE_LIMIT ?? 50);
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

  useEffect(() => {
    const focusedItemId = searchParams.get("focus");
    if (!focusedItemId || !items.length) return;
    if (focusedQueryHandledRef.current === focusedItemId) return;

    const focusedItem = (items as any[]).find((it) => it.id === focusedItemId);
    if (!focusedItem) return;

    focusedQueryHandledRef.current = focusedItemId;
    navForgotten();
    openItem(focusedItem);
    router.replace("/dashboard?view=forgotten");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, router, searchParams]);

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

  const removeItemById = async (itemId: string) => {
    setErr(null);
    try {
      if (!userId) {
        showToast("err", "Oturum bulunamadı ❌");
        return;
      }

      const ok = confirm("Silmek istiyor musun?");
      if (!ok) return;

      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", itemId)
        .eq("user_id", userId);

      if (error) throw error;

      if (openDetail && draft.id === itemId) setOpenDetail(false);
      await load(userId);
      showToast("ok", "🗑️ Silindi");
    } catch (e: any) {
      setErr(e?.message ?? "Silinemedi.");
      showToast("err", e?.message ?? "Silinemedi ❌");
    }
  };

  const undoAi = async (itemId: string) => {
    try {
      if (!userId) {
        showToast("err", "Oturum bulunamadı ❌");
        return;
      }

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        showToast("err", "Oturum bulunamadı ❌");
        return;
      }

      const r = await fetch("/api/ai/undo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId }),
      });

      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);

      showToast("ok", "AI geri alındı ✅");
      await load(userId);
    } catch (e: any) {
      showToast("err", `${normalizeAiError(e?.message)} ❌`);
    }
  };

  const regenerateAi = async (itemId: string) => {
    try {
      if (!userId) {
        showToast("err", "Oturum bulunamadı ❌");
        return;
      }

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        showToast("err", "Oturum bulunamadı ❌");
        return;
      }

      setRegeneratingItemId(itemId);

      setItems((prev: any) =>
        prev.map((it: any) =>
          it.id === itemId
            ? { ...it, ai_status: "processing", ai_error: null }
            : it,
        ),
      );

      const r = await fetch("/api/ai/regenerate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId }),
      });

      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);

      showToast("ok", "AI yeniden üretildi ✨");
      await load(userId);
    } catch (e: any) {
      showToast("err", `${normalizeAiError(e?.message)} ❌`);
      if (userId) await load(userId);
    } finally {
      setRegeneratingItemId(null);
      setAiProgress(null);
    }
  };

  const enhanceSelected = async () => {
    try {
      if (!isPro) {
        showToast("err", "AI işlemleri sadece Pro’da ❌");
        return;
      }

      if (aiSelection.length === 0) {
        showToast("err", "En az 1 kayıt seç ❌");
        return;
      }

      setAiEnhancing(true);
      setAiProgress({
        total: aiSelection.length,
        done: 0,
        okCount: 0,
        failCount: 0,
      });

      setItems((prev: any) =>
        prev.map((it: any) =>
          aiSelection.includes(it.id)
            ? { ...it, ai_status: "processing", ai_error: null }
            : it,
        ),
      );

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        showToast("err", "Oturum bulunamadı ❌");
        return;
      }

      const r = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemIds: aiSelection }),
      });

      const text = await r.text().catch(() => "");

      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }

      if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);

      const okCount = Number(json?.okCount ?? 0);
      const failCount = Number(json?.failCount ?? 0);
      const total = okCount + failCount;

      setAiProgress({
        total,
        done: total,
        okCount,
        failCount,
      });

      showToast(
        failCount === 0 ? "ok" : "err",
        failCount === 0
          ? `✅ AI işlemi tamamlandı (${okCount})`
          : `⚠️ AI işlemi: ${okCount} başarılı, ${failCount} hatalı`,
      );

      setAiSelection([]);
      if (userId) await load(userId);
    } catch (e: any) {
      showToast("err", `${normalizeAiError(e?.message)} ❌`);
    } finally {
      setAiEnhancing(false);
      window.setTimeout(() => setAiProgress(null), 1200);
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
        setErr("Grup adı gerekli.");
        showToast("err", "Grup adı gerekli ❌");
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
      setErr(e?.message ?? "Grup oluşturulamadı.");
      showToast("err", e?.message ?? "Grup oluşturulamadı ❌");
    } finally {
      setSavingGroup(false);
    }
  };

  const enhanceCurrentGroup = async () => {
    try {
      if (!isPro) {
        showToast("err", "AI işlemleri sadece Pro’da ❌");
        return;
      }

      if (activeGroupId === "all" || activeGroupId === "forgotten") {
        showToast("err", "Önce Inbox veya bir grup seç ❌");
        return;
      }

      const targetItems =
        activeGroupId === "inbox"
          ? items.filter((it: any) => !it.group_id)
          : items.filter(
              (it: any) => String(it.group_id) === String(activeGroupId),
            );

      if (targetItems.length === 0) {
        showToast("err", "Bu alanda işlenecek kayıt yok ❌");
        return;
      }

      setGroupEnhancing(true);
      setGroupProgress({
        total: targetItems.length,
        okCount: 0,
        failCount: 0,
      });

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        showToast("err", "Oturum bulunamadı ❌");
        return;
      }

      const itemIds = targetItems.map((it: any) => it.id);

      setItems((prev: any) =>
        prev.map((it: any) =>
          itemIds.includes(it.id)
            ? { ...it, ai_status: "processing", ai_error: null }
            : it,
        ),
      );

      const r = await fetch("/api/ai/enhance-group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemIds }),
      });

      const text = await r.text().catch(() => "");

      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }

      if (!r.ok) {
        throw new Error(json?.error || `HTTP ${r.status}`);
      }

      const total = Number(json?.total ?? itemIds.length);
      const okCount = Number(json?.okCount ?? 0);
      const failCount = Number(json?.failCount ?? 0);

      setGroupProgress({
        total,
        okCount,
        failCount,
      });

      showToast(
        failCount === 0 ? "ok" : "err",
        failCount === 0
          ? `✅ Grup AI işlemi tamamlandı (${okCount})`
          : `⚠️ Grup AI işlemi: ${okCount} başarılı, ${failCount} hatalı`,
      );

      if (userId) {
        await load(userId);
      }
    } catch (e: any) {
      showToast("err", `${normalizeAiError(e?.message)} ❌`);
    } finally {
      setGroupEnhancing(false);
      window.setTimeout(() => setGroupProgress(null), 1200);
    }
  };

  const bulkMoveToInbox = async () => {
    if (!userId || forgottenSelection.length === 0) return;
    try {
      setBulkLoading(true);
      const { error } = await supabase
        .from("items")
        .update({ group_id: null, updated_at: new Date().toISOString() })
        .in("id", forgottenSelection)
        .eq("user_id", userId);
      if (error) throw error;
      setForgottenSelection([]);
      await load(userId);
      showToast("ok", "Inbox’a taşındı ✅");
    } catch (e: any) {
      showToast("err", e?.message ?? "Inbox’a alınamadı ❌");
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkDeleteSelected = async () => {
    if (!userId || forgottenSelection.length === 0) return;
    const ok = confirm(`${forgottenSelection.length} kayıt silinecek. Emin misin?`);
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
  };

  const bulkSnoozeSelected = async (days: number) => {
    if (!userId || forgottenSelection.length === 0) return;
    if (![7, 14, 30].includes(days)) return;
    try {
      setBulkLoading(true);
      const untilIso = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("items")
        .update({ snoozed_until: untilIso, updated_at: new Date().toISOString() })
        .in("id", forgottenSelection)
        .eq("user_id", userId);
      if (error) throw error;
      setForgottenSelection([]);
      await load(userId);
      showToast("ok", `Ertelendi (${days} gün) ⏳`);
    } catch (e: any) {
      showToast("err", e?.message ?? "Ertele kaydedilemedi ❌");
    } finally {
      setBulkLoading(false);
    }
  };

  const updateProForgottenDays = async (value: 30 | 60 | 90) => {
    if (!userId) return;
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
  };

  // Clearing advanced filters restores the *current* primary view's
  // baseline — it must never drop the mandatory Today work status or move
  // the user out of Today/Forgotten/a group.
  const clearAdvancedFilters = () => {
    setActiveAiCategory("all");
    setActiveTags([]);
    if (primaryNav !== "today") {
      setActiveWorkStatus("all");
    }
  };

  const clearAllForEmptyState = () => {
    clearAdvancedFilters();
    setActiveType("all");
    setQ("");
  };

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

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
      } catch (e: any) {
        showToast("err", e?.message ?? "Taşıma başarısız ❌");
      } finally {
        setDraggingItemId(null);
      }
    };

    return { onDragOver, onDragLeave, onDrop };
  };

  const inboxDrop = makeDropHandlers("inbox");

  const isDropTarget = useCallback(
    (target: "inbox" | { groupId: string }) => {
      if (dragOverTarget === null) return false;
      if (target === "inbox") return dragOverTarget === "inbox";
      return (
        typeof dragOverTarget === "object" &&
        dragOverTarget.groupId === target.groupId
      );
    },
    [dragOverTarget],
  );

  const selectionKind: "forgotten" | "ai" =
    activeGroupId === "forgotten" ? "forgotten" : "ai";
  const selectedIds = selectionKind === "forgotten" ? forgottenSelection : aiSelection;

  const toggleSelectedId = useCallback(
    (id: string, checked: boolean) => {
      if (selectionKind === "forgotten") {
        setForgottenSelection((prev) =>
          checked ? [...prev, id] : prev.filter((x) => x !== id),
        );
      } else {
        setAiSelection((prev) =>
          checked ? [...prev, id] : prev.filter((x) => x !== id),
        );
      }
    },
    [selectionKind],
  );

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      const next = !prev;
      if (!next) {
        setForgottenSelection([]);
        setAiSelection([]);
      }
      return next;
    });
  };

  const hasActiveFilters =
    advancedFilterCount > 0 || activeType !== "all" || q.trim().length > 0;

  // Today/Forgotten get a dedicated empty-state copy for their *baseline*
  // (no extra filters applied) — the generic "no results" message + Clear
  // filters button only ever appears once the user has added a real filter.
  const emptyStateOverride = hasActiveFilters
    ? null
    : primaryNav === "today"
      ? {
          title: "Bugün için kayıt yok",
          description: "Bugüne aldığın kayıtlar burada görünür.",
        }
      : primaryNav === "forgotten"
        ? {
            title: "Unutulan kayıt yok",
            description:
              "Uzun süredir açmadığın kayıtlar zamanla burada listelenecek.",
          }
        : null;

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#030406] pb-[calc(10.5rem+var(--safe-bottom))] text-white selection:bg-cyan-300/25 lg:pb-10">
      <DnaBackdrop className="fixed opacity-10" />
      <div className="theme-page-glow pointer-events-none fixed inset-0" />

      <DashboardTopbar
        q={q}
        onChangeQ={setQ}
        searchInputRef={searchInputRef}
        mobileSearchOpen={mobileSearchOpen}
        onToggleMobileSearch={() => setMobileSearchOpen((v) => !v)}
        onOpenCreate={() => openNew("link")}
      />

      {isPro === true && paymentIssue ? (
        <div className="relative z-40 mt-[calc(4.5rem+var(--safe-top))] px-4 safe-x sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs text-amber-100">
            <span>Ödeme sorunu tespit edildi — Pro erişimin dönem sonuna kadar sürebilir.</span>
            <button
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="rounded-full bg-amber-200 px-3 py-1 font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60"
            >
              {portalLoading ? "Açılıyor..." : "Kartı güncelle"}
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={`relative z-10 mx-auto flex max-w-7xl gap-6 px-4 pb-10 safe-x sm:px-6 lg:max-w-[1200px] lg:gap-5 ${
          mobileSearchOpen
            ? "pt-[calc(9.5rem+var(--safe-top))] lg:pt-[calc(6rem+var(--safe-top))]"
            : "pt-[calc(6rem+var(--safe-top))]"
        }`}
      >
        <DesktopSidebar
          primaryNav={primaryNav}
          forgottenCount={groupCounts["forgotten"] ?? 0}
          onNavHome={navHome}
          onNavToday={navToday}
          onNavForgotten={navForgotten}
          groups={groups}
          activeGroupId={activeGroupId}
          onSelectGroup={selectGroup}
          groupCounts={groupCounts}
          groupsExpanded={sidebarGroupsExpanded}
          onToggleGroupsExpanded={() => setSidebarGroupsExpanded((v) => !v)}
          onOpenCreateGroup={() => setOpenGroupModal(true)}
          onRenameGroup={openRename}
          onDeleteGroup={deleteGroup}
          inboxDrop={inboxDrop}
          makeGroupDrop={(groupId) => makeDropHandlers({ groupId })}
          isDropTarget={isDropTarget}
          totalCount={items.length}
          noteCount={totalNoteCount}
          linkCount={totalLinkCount}
          extension={
            !isNativeApp && isPlatformResolved ? (
              <ExtensionStatusSidebarFooter
                extConnected={extConnected}
                extLiveHere={extLiveHere}
                extChecking={extChecking}
                clipUsage={clipUsage}
                clipUsageLoading={clipUsageLoading}
                clipUsageError={clipUsageError}
                onReconnect={() => router.push("/extension/connect")}
                open={openExtensionPanel}
                onOpen={() => setOpenExtensionPanel(true)}
                onClose={() => setOpenExtensionPanel(false)}
              />
            ) : null
          }
        />

        <div className="min-w-0 flex-1 space-y-4">
          <DashboardViewHeader
            title={viewTitle}
            itemCount={finalItems.length}
            activeType={activeType}
            onChangeType={setActiveType}
            advancedFilterCount={advancedFilterCount}
            onOpenFilters={() => setOpenFilterSheet(true)}
            showSelectionToggle={isPro === true}
            selectionMode={selectionMode}
            onToggleSelectionMode={toggleSelectionMode}
            onOpenWeeklySummary={() => setOpenWeeklySummarySheet(true)}
            isForgottenView={activeGroupId === "forgotten"}
            forgottenSegment={forgottenSegment}
            onChangeForgottenSegment={setForgottenSegment}
            forgottenSegmentCounts={forgottenSegmentCounts}
            isPro={isPro}
            proForgottenDays={proForgottenDays}
            onChangeProForgottenDays={updateProForgottenDays}
            forgottenSort={forgottenSort}
            onChangeForgottenSort={setForgottenSort}
          />

          {selectionMode && selectedIds.length > 0 ? (
            <SelectionActionBar
              mode={selectionKind}
              selectedCount={selectedIds.length}
              bulkLoading={bulkLoading}
              onMoveToInbox={bulkMoveToInbox}
              onDelete={bulkDeleteSelected}
              onSnooze={bulkSnoozeSelected}
              onEnhanceSelected={enhanceSelected}
              aiEnhancing={aiEnhancing}
            />
          ) : null}

          <UnifiedItemList
            items={finalItems}
            totalItemsCount={items.length}
            loading={loading}
            err={err}
            onRetry={() => userId && load(userId)}
            onOpen={openItem}
            isForgotten={isForgotten}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelected={toggleSelectedId}
            selectLabel={activeGroupId === "forgotten" ? "Seç" : "AI işlemi için seç"}
            dragEnabled={activeGroupId !== "forgotten"}
            draggingItemId={draggingItemId}
            onDragStartItem={onDragStartItem}
            onDragEndItem={onDragEndItem}
            onSetWorkStatus={setWorkStatusForItem}
            onSetSnooze={setSnoozeForItem}
            onDelete={removeItemById}
            onCreateNew={() => openNew("link")}
            onClearFilters={clearAllForEmptyState}
            hasActiveFilters={hasActiveFilters}
            emptyStateOverride={emptyStateOverride}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => openNew("link")}
        aria-label="Yeni kayıt ekle"
        className="mobile-fab accent-gradient fixed z-40 grid h-14 w-14 place-items-center rounded-2xl text-3xl font-light shadow-[0_18px_60px_rgba(80,190,255,0.25)] transition hover:opacity-90 active:scale-95 lg:hidden"
      >
        +
      </button>

      <MobileBottomNav
        primaryNav={primaryNav}
        forgottenCount={groupCounts["forgotten"] ?? 0}
        onNavHome={navHome}
        onNavToday={navToday}
        onNavForgotten={navForgotten}
        onOpenGroups={() => setOpenMobileGroupsSheet(true)}
      />

      <MobileGroupsSheet
        open={openMobileGroupsSheet}
        onClose={() => setOpenMobileGroupsSheet(false)}
        groups={groups}
        activeGroupId={activeGroupId}
        groupCounts={groupCounts}
        onSelectGroup={selectGroup}
        onOpenCreateGroup={() => {
          setOpenMobileGroupsSheet(false);
          setOpenGroupModal(true);
        }}
        onRenameGroup={openRename}
        onDeleteGroup={deleteGroup}
      />

      <DashboardFilterSheet
        open={openFilterSheet}
        onClose={() => setOpenFilterSheet(false)}
        groups={groups}
        activeGroupId={activeGroupId}
        onChangeGroup={onChangeGroupFilter}
        groupCounts={groupCounts}
        activeWorkStatus={activeWorkStatus}
        onChangeWorkStatus={setActiveWorkStatus}
        workStatusCounts={workStatusCounts}
        activeAiCategory={activeAiCategory}
        onChangeAiCategory={(c) => setActiveAiCategory(c as typeof activeAiCategory)}
        aiCategoryCounts={aiCategoryCounts}
        allTags={allTags}
        activeTags={activeTags}
        onToggleTag={toggleTag}
        onClearAll={clearAdvancedFilters}
        activeFilterCount={advancedFilterCount}
        isPro={isPro === true}
        canEnhanceGroup={activeGroupId !== "all" && activeGroupId !== "forgotten"}
        groupEnhancing={groupEnhancing}
        onEnhanceGroup={enhanceCurrentGroup}
        isForgottenView={activeGroupId === "forgotten"}
        proForgottenDays={proForgottenDays}
        onChangeProForgottenDays={updateProForgottenDays}
        forgottenSort={forgottenSort}
        onChangeForgottenSort={setForgottenSort}
      />

      <WeeklySummarySheet
        open={openWeeklySummarySheet}
        onClose={() => setOpenWeeklySummarySheet(false)}
        savedThisWeek={weeklyPulse.savedThisWeek}
        doneThisWeek={weeklyPulse.doneThisWeek}
        forgottenCount={weeklyPulse.forgottenCount}
        focusItems={weeklyPulse.focusItems}
        onOpenItem={(item) => {
          setOpenWeeklySummarySheet(false);
          openItem(item);
        }}
        onSetWorkStatus={setWorkStatusForItem}
        onOpenForgotten={() => {
          setOpenWeeklySummarySheet(false);
          navForgotten();
        }}
        onOpenToday={() => {
          setOpenWeeklySummarySheet(false);
          navToday();
        }}
      />

      <CreateItemModal
        open={openAdd}
        draft={draft}
        onChange={setDraft}
        groups={groups}
        saving={saving}
        onClose={() => setOpenAdd(false)}
        onSave={saveDraft}
      />

      <ItemDetailSheet
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        item={openItemLive}
        draft={draft}
        onChangeDraft={setDraft}
        groups={groups}
        onSave={updateItem}
        onDelete={removeItemById}
        onSetWorkStatus={setWorkStatusForItem}
        onSetSnooze={setSnoozeForItem}
        onRegenerateAi={regenerateAi}
        onUndoAi={undoAi}
        regeneratingItemId={regeneratingItemId}
      />

      <Modal
        open={openGroupModal}
        title="Grup oluştur"
        onClose={() => setOpenGroupModal(false)}
      >
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs text-neutral-400">Başlık</div>
            <Input
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              placeholder="Örn. İş, Öğrenme, Fikirler..."
            />
          </div>

          <div>
            <div className="mb-2 text-xs text-neutral-400">
              Öğeleri ekle (opsiyonel) — sadece Inbox öğeleri seçilebilir
            </div>

            <div className="max-h-64 overflow-auto rounded-xl border border-neutral-800">
              {ungroupedItems.map((it: any) => {
                const checked = selectedItemIds.includes(it.id);
                return (
                  <label
                    key={it.id}
                    className="flex items-center gap-2 border-b border-neutral-900 px-3 py-2 text-sm text-neutral-200"
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
                      {it.type === "note" ? "📝" : "🔗"} {it.title || it.content}
                    </span>
                  </label>
                );
              })}

              {ungroupedItems.length === 0 ? (
                <div className="p-3 text-sm text-neutral-500">
                  Inbox boş (grupsuz kayıt yok).
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpenGroupModal(false)}>
              İptal
            </Button>
            <Button onClick={createGroupAndAssign} disabled={savingGroup}>
              {savingGroup ? "Kaydediliyor..." : "Oluştur"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={openRenameModal}
        title="Grubu yeniden adlandır"
        onClose={() => setOpenRenameModal(false)}
      >
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs text-neutral-400">Yeni başlık</div>
            <Input
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              placeholder="Grup adı..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpenRenameModal(false)}>
              İptal
            </Button>
            <Button onClick={saveRename} disabled={renaming}>
              {renaming ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
      </Modal>

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

      {err ? (
        <div className="mobile-toast fixed left-1/2 z-[120] -translate-x-1/2 rounded-xl border border-red-900/40 bg-red-950/60 px-4 py-2 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      {toast ? (
        <div
          className={`mobile-toast fixed left-1/2 z-[120] -translate-x-1/2 rounded-xl border px-4 py-2 text-sm ${
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
