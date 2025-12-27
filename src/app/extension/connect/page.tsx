"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ExtensionConnectPage() {
  const [status, setStatus] = useState<
    "checking" | "need_login" | "connecting" | "done" | "error"
  >("checking");
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        // 1) session var mı?
        const { data } = await supabase.auth.getSession();
        const session = data.session;

        if (!session?.access_token) {
          setStatus("need_login");
          return;
        }

        setStatus("connecting");

        // 2) backend’den token al
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

        // 3) extension’a gönder (origin’i kısıtla)
        window.postMessage(
          { type: "clarionot_TOKEN", token },
          window.location.origin
        );

        setStatus("done");

        // (opsiyonel) 2 sn sonra dashboard’a dön
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
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

  if (status === "done") {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <h2>✅ Bağlandı</h2>
        <p>Token otomatik kaydedildi. Dashboard’a yönlendiriliyorsun…</p>
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
