"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Button from "@/components/Button";
import Header from "@/components/Header";
import DnaBackdrop from "@/components/DnaBackdrop";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Status =
  | "checking"
  | "need_login"
  | "need_pro"
  | "connecting"
  | "done"
  | "error";

export default function ExtensionConnectPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        // 1) login kontrol
        const { data } = await supabase.auth.getSession();
        const session = data.session;

        if (!session?.access_token || !session.user?.id) {
          setStatus("need_login");
          return;
        }

        const uid = session.user.id;

        // 2) plan kontrol
        const { data: planRow, error: planErr } = await supabase
          .from("user_plan")
          .select("plan,status,current_period_end,grace_until")
          .eq("user_id", uid)
          .maybeSingle();

        if (planErr || !planRow) {
          setStatus("need_pro");
          return;
        }

        const statusOk =
          planRow.status === "active" || planRow.status === "trialing";

        const stillValid =
          !!planRow.current_period_end &&
          new Date(planRow.current_period_end).getTime() > Date.now();

        const inGrace =
          !!(planRow as any).grace_until &&
          new Date((planRow as any).grace_until).getTime() > Date.now();

        const isPro =
          planRow.plan === "pro" && (statusOk || stillValid || inGrace);

        if (!isPro) {
          setStatus("need_pro");
          return;
        }

        setStatus("connecting");

        // 3) backend’den token al
        const res = await fetch("/api/clip/token", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

        const token = json?.token;
        if (!token) throw new Error("Token alınamadı.");

        // 4) Extension gerçekten burada mı? (READY/PONG)
        const EXT_READY = "EXTENSION_READY";
        const READY_SOURCE = "clarionot-extension";
        const PING = "CLARIONOT_PING";
        const PONG = "CLARIONOT_PONG";

        await new Promise<void>((resolve, reject) => {
          let done = false;

          const cleanup = () => {
            window.removeEventListener("message", onMsg);
          };

          const t = window.setTimeout(() => {
            if (done) return;
            cleanup();
            reject(
              new Error("Extension bu sayfada aktif değil (READY/PONG yok)."),
            );
          }, 3500);

          function ok() {
            if (done) return;
            done = true;
            window.clearTimeout(t);
            cleanup();
            resolve();
          }

          function onMsg(e: MessageEvent) {
            if (e.source !== window) return;
            if (e.origin !== window.location.origin) return;

            const data = (e.data ?? {}) as any;

            if (data?.source === READY_SOURCE && data?.type === EXT_READY) {
              ok();
              return;
            }

            if (data?.type === PONG) {
              ok();
              return;
            }
          }

          window.addEventListener("message", onMsg);

          window.postMessage({ type: PING }, window.location.origin);
        });

        // 5) ACK bekle, token yolla
        const ACK_OK = "CLARIONOT_TOKEN_SAVED";
        const ACK_FAIL = "CLARIONOT_TOKEN_SAVE_FAILED";

        await new Promise<void>((resolve, reject) => {
          let resolved = false;
          let iv: number | null = null;
          let t: number | null = null;

          const cleanup = () => {
            if (t) window.clearTimeout(t);
            if (iv) window.clearInterval(iv);
            window.removeEventListener("message", onMsg);
          };

          t = window.setTimeout(() => {
            if (resolved) return;
            cleanup();
            reject(new Error("Extension token kaydedilemedi (ACK gelmedi)."));
          }, 8000);

          function onMsg(e: MessageEvent) {
            if (e.source !== window) return;
            if (e.origin !== window.location.origin) return;

            const type = (e.data as any)?.type;

            if (type === ACK_OK) {
              resolved = true;
              cleanup();
              resolve();
              return;
            }

            if (type === ACK_FAIL) {
              const msg =
                typeof (e.data as any)?.error === "string" &&
                (e.data as any).error.trim()
                  ? (e.data as any).error
                  : "Token kaydı başarısız.";
              resolved = true;
              cleanup();
              reject(new Error(msg));
              return;
            }
          }

          window.addEventListener("message", onMsg);

          let tries = 0;

          const send = () => {
            window.postMessage(
              { type: "CLARIONOT_TOKEN", token },
              window.location.origin,
            );
          };

          iv = window.setInterval(() => {
            tries++;
            send();
            if (tries >= 10 && iv) {
              window.clearInterval(iv);
              iv = null;
            }
          }, 300);

          send();
        });

        setStatus("done");
        setTimeout(() => (window.location.href = "/dashboard"), 800);
      } catch (e: any) {
        setErr(e?.message ?? "Bağlantı hatası");
        setStatus("error");
      }
    })();
  }, []);

  const redirectToLogin = () => {
    const redirect = encodeURIComponent("/extension/connect");
    window.location.href = `/login?redirect=${redirect}`;
  };

  const goPricing = () => {
    window.location.href = "/#pricing";
  };

  const goDashboard = () => {
    window.location.href = "/dashboard";
  };

  const reload = () => window.location.reload();

  const Title = ({ children }: { children: any }) => (
    <div className="text-base font-semibold text-[#f4f1ef]">{children}</div>
  );

  const Sub = ({ children }: { children: any }) => (
    <div className="mt-1 text-sm leading-relaxed text-[#bccabb]">
      {children}
    </div>
  );

  const Badge = ({
    tone,
    children,
  }: {
    tone: "ok" | "warn" | "err" | "info";
    children: any;
  }) => {
    const cls =
      tone === "ok"
        ? "border-emerald-900/40 bg-emerald-950/30 text-emerald-200"
        : tone === "warn"
          ? "border-amber-900/40 bg-amber-950/30 text-amber-200"
          : tone === "err"
            ? "border-red-900/40 bg-red-950/30 text-red-200"
            : "border-neutral-800 bg-neutral-950 text-neutral-300";

    return (
      <div
        className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs ${cls}`}
      >
        {children}
      </div>
    );
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#131313] pb-16 text-[#e5e2e1]">
      <DnaBackdrop className="fixed opacity-30" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(107,251,154,0.08),transparent_42%),linear-gradient(to_bottom,transparent,#131313_82%)]" />
      <div className="fixed inset-x-0 top-0 z-50 border-b border-[#3d4a3e]/20 bg-[#131313]/70 px-5 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Header />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-5 pt-24 sm:px-6 lg:pt-28">
        <section className="rounded-xl border border-[#3d4a3e]/30 bg-[#201f1f]/70 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
                ClarioNot Clip
              </div>
              <div className="mt-3 text-3xl font-black tracking-tight text-[#f4f1ef] sm:text-5xl">
                Eklenti bağlantısı
              </div>
              <div className="mt-3 max-w-xl text-sm leading-6 text-[#bccabb]">
                Token bu tarayıcıya güvenli şekilde kaydedilecek. Sonra sağ tıkla
                kaydedebilirsin.
              </div>
            </div>

            {status === "connecting" || status === "checking" ? (
              <Badge tone="info">⏳ İşleniyor</Badge>
            ) : status === "done" ? (
              <Badge tone="ok">✅ Tamam</Badge>
            ) : status === "need_pro" ? (
              <Badge tone="warn">🔒 Pro</Badge>
            ) : status === "need_login" ? (
              <Badge tone="warn">👤 Login</Badge>
            ) : status === "error" ? (
              <Badge tone="err">❌ Hata</Badge>
            ) : null}
          </div>

          <div className="mt-6">
            {(status === "checking" || status === "connecting") && (
              <div className="rounded-lg border border-[#3d4a3e]/25 bg-[#0e0e0e]/55 p-4">
                <Title>Bağlanıyor…</Title>
                <Sub>
                  Lütfen bu sayfayı kapatma. Birkaç saniye içinde çalışma
                  alanına yönlendireceğim.
                </Sub>

                <div className="mt-4 flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-lg border border-[#3d4a3e]/30 bg-[#1c1b1b]" />
                  <div className="text-xs text-[#bccabb]/70">
                    Extension ile el sıkışma yapılıyor (READY/PONG + ACK)
                  </div>
                </div>
              </div>
            )}

            {status === "need_login" && (
              <div className="rounded-lg border border-[#3d4a3e]/25 bg-[#0e0e0e]/55 p-4">
                <Title>Giriş gerekli</Title>
                <Sub>
                  Extension’ı bağlamak için önce hesabına giriş yapmalısın.
                </Sub>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={redirectToLogin}>Giriş Yap</Button>
                  <Button variant="ghost" onClick={goDashboard}>
                    Çalışma alanına dön
                  </Button>
                </div>
              </div>
            )}

            {status === "need_pro" && (
              <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4">
                <Title>Pro gerekli</Title>
                <Sub>
                  Sağ tıkla kaydetme özelliği Pro’da. Planını yükseltmeden token
                  bağlamayı açmıyorum.
                </Sub>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={goPricing}>Pro’ya geç</Button>
                  <Button variant="ghost" onClick={goDashboard}>
                    Çalışma alanına dön
                  </Button>
                </div>
              </div>
            )}

            {status === "done" && (
              <div className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-4">
                <Title>Bağlandı</Title>
                <Sub>
                  Token kaydedildi. Şimdi çalışma alanına yönlendiriliyorsun…
                </Sub>

                <div className="mt-4">
                  <Button onClick={goDashboard}>Çalışma alanına git</Button>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="rounded-lg border border-red-900/40 bg-red-950/25 p-4">
                <Title>Bağlanamadı</Title>
                <Sub>{err || "Bir hata oluştu."}</Sub>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={reload}>Tekrar dene</Button>
                  <Button variant="ghost" onClick={goDashboard}>
                    Çalışma alanına dön
                  </Button>
                </div>

                <div className="mt-3 text-xs leading-5 text-[#bccabb]/70">
                  İpucu: Extension yüklü mü, bu domain izinli mi, gizli pencere
                  mi kullanıyorsun? Genelde sorun burada saklanır.
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="mt-6 rounded-xl border border-[#3d4a3e]/30 bg-[#1c1b1b]/70 p-4 text-center text-xs leading-5 text-[#bccabb] backdrop-blur-2xl">
          Sağ tık → “clarionot’ya Kaydet” ile modal açılmalı.
        </div>
      </div>
    </main>
  );
}
