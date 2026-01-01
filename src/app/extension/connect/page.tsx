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

        const isPro = planRow?.plan === "pro" && planRow?.status === "active";
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

        // 4) extension’a gönder (origin kısıtlı)
        window.postMessage(
          { type: "clarionot_TOKEN", token },
          window.location.origin
        );

        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(() => {
            window.removeEventListener("message", onMsg);
            reject(
              new Error("Extension token kaydedilemedi (bridge çalışmadı).")
            );
          }, 5000);

          function onMsg(e: MessageEvent) {
            if (e.origin !== window.location.origin) return;
            if (e.data?.type === "clarionot_TOKEN_SAVED" && e.data?.ok) {
              clearTimeout(t);
              window.removeEventListener("message", onMsg);
              resolve();
            }
          }

          window.addEventListener("message", onMsg);
        });

        setStatus("done");
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
