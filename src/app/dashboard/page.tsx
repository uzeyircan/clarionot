"use client";

import { useEffect, useMemo, useState } from "react";
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
  note?: string; // link için opsiyonel açıklama
  group_id?: string | null; // ✅
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

export default function DashboardPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [openOnboarding, setOpenOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // ✅ Tek kaynak: extension durumunu sadece buradan göstereceğiz
  const [extConnected, setExtConnected] = useState<boolean>(false);
  const [extChecking, setExtChecking] = useState<boolean>(true);

  const CHROME_STORE_URL =
    "https://chromewebstore.google.com/detail/clario-clip/iadmjpgdbncmblmjbgbiljaobnlhgomo?authuser=0&hl=tr";

  // Free/Pro limit kontrolü için gerekli
  const freeLimit = Number(process.env.NEXT_PUBLIC_FREE_LIMIT ?? 50);

  // ✅ Pro durumu DB’den
  const [isPro, setIsPro] = useState<boolean | null>(null);

  const [q, setQ] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft("link"));
  const [err, setErr] = useState<string | null>(null);

  // ✅ Groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | "all" | "inbox">(
    "all"
  );

  // ✅ Create group modal
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // ✅ Drag state (UI için)
  const [dragOverTarget, setDragOverTarget] = useState<
    null | "inbox" | { groupId: string }
  >(null);

  const skipOnboarding = () => {
    if (userId) {
      const key = `clarionot:onboarding:v1:${userId}`;
      localStorage.setItem(key, "1");
    }
    setOpenOnboarding(false);
  };

  const fetchPlan = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("user_plan")
        .select("plan,status")
        .eq("user_id", uid)
        .maybeSingle();

      if (error) throw error;
      const ok = data?.plan === "pro" && data?.status === "active";
      setIsPro(!!ok);
    } catch {
      setIsPro(false);
    }
  };

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

  const checkExtension = async (uid: string) => {
    setExtChecking(true);
    try {
      const { data, error } = await supabase
        .from("clip_tokens")
        .select("id, revoked_at, label")
        .eq("user_id", uid)
        .eq("label", "Browser Extension")
        .is("revoked_at", null)
        .limit(1);

      if (error) throw error;
      setExtConnected((data?.length ?? 0) > 0);
    } catch {
      setExtConnected(false);
    } finally {
      setExtChecking(false);
    }
  };

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data ?? []) as Item[]);
    } catch (e: any) {
      setErr(e?.message ?? "Liste alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("groups")
      .select("id,title,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    setGroups((data ?? []) as any);
  };

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

    load();
    loadGroups();

    if (isPro === true) checkExtension(userId);
    if (isPro === false) {
      setExtConnected(false);
      setExtChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isPro]);

  // ✅ Search + Group filter
  const filteredItems = useMemo(() => {
    const s = q.trim().toLowerCase();

    const base = !s
      ? items
      : items.filter((it: any) => {
          const inTitle = (it.title ?? "").toLowerCase().includes(s);
          const inContent = (it.content ?? "").toLowerCase().includes(s);
          const inTags = (it.tags ?? []).some((t: string) =>
            t.toLowerCase().includes(s)
          );
          return inTitle || inContent || inTags;
        });

    if (activeGroupId === "all") return base;
    if (activeGroupId === "inbox")
      return base.filter((it: any) => !it.group_id);

    return base.filter((it: any) => it.group_id === activeGroupId);
  }, [items, q, activeGroupId]);

  const { notes, links } = useMemo(() => {
    return {
      notes: filteredItems.filter((it) => it.type === "note"),
      links: filteredItems.filter((it) => it.type === "link"),
    };
  }, [filteredItems]);

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
      "Bu grubu silmek istiyor musun?\nGruba ait tüm notlar Inbox'a taşınacak."
    );
    if (!ok) return;

    try {
      // Optimistic UI: aktif grup siliniyorsa Inbox'a dön
      if (activeGroupId === groupId) {
        setActiveGroupId("inbox");
      }

      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId)
        .eq("user_id", userId);

      if (error) throw error;

      // UI refresh
      await loadGroups();
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Group silinemedi.");
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
      if (!userId) return;

      if (!draft.content.trim() && !draft.title.trim()) {
        setErr("En az başlık ya da içerik gir.");
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
        group_id: draft.group_id ?? null, // ✅ opsiyonel
      };

      // ✅ Free limit: Pro değilse
      if (isPro !== true) {
        const { count, error: countErr } = await supabase
          .from("items")
          .select("*", { count: "exact", head: true });

        if (countErr) throw countErr;

        if ((count ?? 0) >= freeLimit) {
          setErr(
            `Free planda en fazla ${freeLimit} kayıt ekleyebilirsin. Pro’ya geç.`
          );
          return;
        }
      }

      const { error } = await supabase.from("items").insert(payload);
      if (error) throw error;

      setOpenAdd(false);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Kaydedilemedi.");
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
  };

  const updateItem = async () => {
    setErr(null);
    try {
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
        .eq("id", draft.id);

      if (error) throw error;

      setOpenDetail(false);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Güncellenemedi.");
    }
  };

  const removeItem = async () => {
    setErr(null);
    try {
      if (!draft.id) return;

      const ok = confirm("Silmek istiyor musun?");
      if (!ok) return;

      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", draft.id);
      if (error) throw error;

      setOpenDetail(false);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Silinemedi.");
    }
  };

  const createGroupAndAssign = async () => {
    try {
      if (!userId) return;

      const title = groupTitle.trim();
      if (!title) {
        setErr("Group title required.");
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

      await loadGroups();
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Group oluşturulamadı.");
    } finally {
      setSavingGroup(false);
    }
  };

  // ===========================
  // ✅ DRAG & DROP HELPERS
  // ===========================
  const onDragStartItem = (itemId: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  const moveItemToGroup = async (itemId: string, groupId: string | null) => {
    if (!userId) return;

    // Optimistic UI
    setItems((prev: any) =>
      prev.map((it: any) =>
        it.id === itemId ? { ...it, group_id: groupId } : it
      )
    );

    const { error } = await supabase
      .from("items")
      .update({ group_id: groupId, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("user_id", userId);

    if (error) {
      // rollback: reload
      await load();
      throw error;
    }
  };

  const makeDropHandlers = (target: "inbox" | { groupId: string }) => {
    const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverTarget(target);
    };

    const onDragLeave = () => {
      setDragOverTarget(null);
    };

    const onDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverTarget(null);

      const itemId = e.dataTransfer.getData("text/plain") || "";
      if (!itemId) return;

      try {
        if (target === "inbox") {
          await moveItemToGroup(itemId, null);
          return;
        }
        await moveItemToGroup(itemId, target.groupId);
      } catch (err: any) {
        setErr(err?.message ?? "Taşıma başarısız.");
      }
    };

    return { onDragOver, onDragLeave, onDrop };
  };

  const inboxDrop = makeDropHandlers("inbox");

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Header />

        {isPro === false ? (
          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
            Pro ile tarayıcı eklentisini kullanıp sağ tıkla kaydedebilirsin.{" "}
            <a className="underline text-neutral-100" href="/pro">
              Pro planı gör
            </a>
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
                ) : extConnected ? (
                  <div className="text-xs text-emerald-300">
                    ✅ Eklenti bağlı
                  </div>
                ) : (
                  <div className="text-xs text-amber-300">
                    ⚠️ Eklenti bağlı değil
                  </div>
                )}
              </div>

              {!extChecking && !extConnected ? (
                <div className="flex gap-2">
                  <a
                    href={CHROME_STORE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-100 hover:bg-neutral-800 transition"
                  >
                    Extension’ı Kur
                  </a>

                  <a
                    href="/extension/connect"
                    className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-100 transition"
                  >
                    Bağla
                  </a>
                </div>
              ) : (
                <button
                  onClick={() => router.push("/extension/connect")}
                  className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-100 hover:bg-neutral-800 transition"
                >
                  Yeniden bağla
                </button>
              )}
            </div>

            {!extChecking && !extConnected ? (
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

              {/* ✅ Inbox = drop zone */}
              <button
                onClick={() => setActiveGroupId("inbox")}
                {...inboxDrop}
                className={`rounded-xl border px-3 py-1 text-xs ${
                  activeGroupId === "inbox"
                    ? "border-neutral-600 bg-neutral-900 text-neutral-100"
                    : "border-neutral-800 bg-neutral-950 text-neutral-300"
                } ${
                  dragOverTarget === "inbox"
                    ? "outline outline-2 outline-emerald-500/60"
                    : ""
                }`}
                title="Item’ları buraya sürükleyip Inbox’a alabilirsin"
              >
                Inbox
              </button>

              {groups.map((g) => {
                const drop = makeDropHandlers({ groupId: g.id });
                const isOver =
                  dragOverTarget !== null &&
                  typeof dragOverTarget === "object" &&
                  dragOverTarget.groupId === g.id;

                return (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroupId(g.id)}
                    {...drop}
                    className={`rounded-xl border px-3 py-1 text-xs ${
                      activeGroupId === g.id
                        ? "border-neutral-600 bg-neutral-900 text-neutral-100"
                        : "border-neutral-800 bg-neutral-950 text-neutral-300"
                    } ${
                      isOver ? "outline outline-2 outline-emerald-500/60" : ""
                    }`}
                    title="Item’ları buraya sürükleyip gruba taşı"
                  >
                    {g.title}
                    <div> </div>
                    {/* 🗑️ Delete */}
                    <button
                      onClick={() => deleteGroup(g.id)}
                      className="text-xs text-neutral-500 hover:text-red-400"
                      title="Grubu sil"
                    >
                      ✕
                    </button>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpenGroupModal(true)}>
                + Group
              </Button>

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
            ) : (
              <div className="grid gap-3">
                {notes.map((it: any) => (
                  <div
                    key={it.id}
                    draggable
                    onDragStart={onDragStartItem(it.id)}
                    className="cursor-grab active:cursor-grabbing"
                    title="Sürükleyip Inbox/Group’a bırak"
                  >
                    <ItemCard item={it} onOpen={openItem} />
                  </div>
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
            ) : (
              <div className="grid gap-3">
                {links.map((it: any) => (
                  <div
                    key={it.id}
                    draggable
                    onDragStart={onDragStartItem(it.id)}
                    className="cursor-grab active:cursor-grabbing"
                    title="Sürükleyip Inbox/Group’a bırak"
                  >
                    <ItemCard item={it} onOpen={openItem} />
                  </div>
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
                        if (e.target.checked) {
                          setSelectedItemIds((prev) => [...prev, it.id]);
                        } else {
                          setSelectedItemIds((prev) =>
                            prev.filter((x) => x !== it.id)
                          );
                        }
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

          {/* ✅ Group select (optional) */}
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

          {/* ✅ Group select in detail */}
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

      {err ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl border border-red-900/40 bg-red-950/60 px-4 py-2 text-sm text-red-200">
          {err}
        </div>
      ) : null}
    </main>
  );
}
