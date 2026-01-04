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
};

const emptyDraft = (type: ItemType): Draft => ({
  type,
  title: "",
  content: "",
  note: "",
  tags: [],
});

// Not: Bu iki fonksiyon şu dosyada kullanılmıyor. Dokunmadım.
async function hashToken(token: string) {
  const enc = new TextEncoder().encode(token);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

  // ✅ Pro durumu artık DB’den okunacak
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isPro, setIsPro] = useState<boolean | null>(null); // null = yükleniyor
  const [planChecking, setPlanChecking] = useState<boolean>(true);

  const [q, setQ] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft("link"));
  const [err, setErr] = useState<string | null>(null);

  const skipOnboarding = () => {
    if (userId) {
      const key = `clarionot:onboarding:v1:${userId}`;
      localStorage.setItem(key, "1");
    }
    setOpenOnboarding(false);
  };

  // ✅ user_plan üzerinden Pro kontrolü
  const fetchPlan = async (uid: string) => {
    setPlanChecking(true);
    try {
      const { data, error } = await supabase
        .from("user_plan")
        .select("plan,status")
        .eq("user_id", uid)
        .maybeSingle();

      if (error) throw error;

      const ok =
        data?.plan === "pro" &&
        (data?.status === "active" || data?.status === "trialing");

      setIsPro(!!ok);
    } catch {
      // Plan okunamazsa Free gibi davranalım
      setIsPro(false);
    } finally {
      setPlanChecking(false);
    }
  };

  // auth gate
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      const email = data.session?.user?.email ?? null;

      if (!uid) {
        router.replace("/login");
        return;
      }

      setUserId(uid);
      setUserEmail(email);
      fetchPlan(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      const email = session?.user?.email ?? null;

      if (!uid) {
        router.replace("/login");
        return;
      }

      setUserId(uid);
      setUserEmail(email);
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
      // hata olsa bile kullanıcıya bağlanmadı gibi gösterelim
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

  useEffect(() => {
    if (!userId) return;

    const key = `clarionot:onboarding:v1:${userId}`;
    const seen = localStorage.getItem(key);

    if (!seen) {
      setOpenOnboarding(true);
      setOnboardingStep(0);
    }
  }, [userId]);

  // ✅ data yükle + extension kontrolünü sadece Pro iken yap
  useEffect(() => {
    if (!userId) return;

    load();

    if (isPro === true) {
      checkExtension(userId);
    } else if (isPro === false) {
      setExtConnected(false);
      setExtChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isPro]);

  const { notes, links } = useMemo(() => {
    const s = q.trim().toLowerCase();

    const base = !s
      ? items
      : items.filter((it) => {
          const inTitle = (it.title ?? "").toLowerCase().includes(s);
          const inContent = (it.content ?? "").toLowerCase().includes(s);
          const inTags = (it.tags ?? []).some((t) =>
            t.toLowerCase().includes(s)
          );
          return inTitle || inContent || inTags;
        });

    return {
      notes: base.filter((it) => it.type === "note"),
      links: base.filter((it) => it.type === "link"),
    };
  }, [items, q]);

  const openNew = (type: ItemType) => {
    setDraft(emptyDraft(type));
    setOpenAdd(true);
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
        if (content && !/^https?:\/\//i.test(content)) {
          content = "https://" + content;
        }

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
          } catch {
            // sessiz geç
          }

          if (!title && content) {
            try {
              const u = new URL(content.split(/\n/)[0].trim());
              title = u.hostname.replace("www.", "");
            } catch {}
          }
        }
      }

      const payload = {
        user_id: userId,
        type: draft.type,
        title,
        content,
        tags: draft.tags,
      };

      // ✅ Free limit: Pro değilse uygula (isPro null iken de Free gibi davran)
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

  const openItem = (it: Item) => {
    setDraft({
      id: it.id,
      type: it.type,
      title: it.title ?? "",
      content: it.content ?? "",
      tags: it.tags ?? [],
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

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Header />
        {!isPro ? (
          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
            Pro ile tarayıcı eklentisini kullanıp sağ tıkla kaydedebilirsin.{" "}
            <a className="underline text-neutral-100" href="/pro">
              Pro planı gör
            </a>
          </div>
        ) : null}

        {/* ✅ TEK KART: Sadece Pro kullanıcıya göster */}
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
                {notes.map((it) => (
                  <ItemCard key={it.id} item={it} onOpen={openItem} />
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
                {links.map((it) => (
                  <ItemCard key={it.id} item={it} onOpen={openItem} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

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
    </main>
  );
}
