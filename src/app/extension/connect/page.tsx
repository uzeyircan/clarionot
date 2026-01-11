"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ExtensionConnectPage() {
  const [status, setStatus] = useState<
    "checking" | "need_login" | "need_pro" | "connecting" | "done" | "error"
  >("checking");
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

        // 2) plan kontrol (free ise engelle)
        const { data: planRow, error: planErr } = await supabase
          .from("user_plan")
          .select("plan,status")
          .eq("user_id", uid)
          .maybeSingle();

        if (planErr) {
          // Plan okunamazsa güvenli tarafta kal: Pro değil gibi davran
          setStatus("need_pro");
          return;
        }

        const isPro =
          planRow?.plan === "pro" &&
          (planRow?.status === "active" || planRow?.status === "trialing");

        if (!isPro) {
          setStatus("need_pro");
          return;
        }

        setStatus("connecting");

        // 3) backend’den token al (backend de ayrıca pro kontrol yapacak)
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

        // ✅ 4) ACK dinleyicisini ÖNCE kur, sonra postMessage at
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
            reject(
              new Error("Extension token kaydedilemedi (bridge çalışmadı).")
            );
          }, 8000);

          function onMsg(e: MessageEvent) {
            // sadece aynı sayfa içinden gelen mesajlar
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

          // ✅ content script geç yüklenebilir: birkaç kez tekrar gönder
          let tries = 0;

          const send = () => {
            window.postMessage(
              { type: "clarionot_TOKEN", token },
              window.location.origin
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

          // ilk gönder
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

  if (status === "checking" || status === "connecting") {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <h2>clarionot Extension Bağlanıyor…</h2>
        <p>Lütfen bu sayfayı kapatma.</p>
      </div>
    );
  }

  if (status === "need_login") {
    const redirect = encodeURIComponent("/extension/connect");
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <h2>Giriş gerekli</h2>
        <p>Extension’ı bağlamak için clarionot hesabına giriş yapmalısın.</p>
        <a href={`/login?redirect=${redirect}`}>Giriş Yap</a>
      </div>
    );
  }

  if (status === "need_pro") {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <h2>Pro gerekli</h2>
        <p>
          Tarayıcı eklentisini bağlamak ve sağ tıkla kaydetmek için Pro plana
          geçmelisin.
        </p>
        <a href="/#pricing">Pro’ya geç</a>
        <div style={{ marginTop: 12 }}>
          <a href="/dashboard">Dashboard’a dön</a>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <h2>✅ Bağlandı</h2>
        <p>Token kaydedildi. Dashboard’a yönlendiriliyorsun…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>❌ Bağlanamadı</h2>
      <p>{err}</p>
      <p>Sayfayı yenilemeyi deneyebilirsin.</p>
    </div>
  );
}
