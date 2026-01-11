"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // Bu sayfaya mail linkiyle gelince supabase session kurulur.
    // Session yoksa kullanıcı buraya direkt girmiş olabilir.
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setMsg(
          "❌ Geçersiz veya süresi dolmuş bağlantı. Tekrar şifre sıfırla."
        );
      }
    });
  }, []);

  const submit = async () => {
    setMsg(null);

    if (password.length < 6) {
      setMsg("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (password !== password2) {
      setMsg("Şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMsg("✅ Şifre güncellendi. Yönlendiriliyorsun...");
      setTimeout(() => router.replace("/dashboard"), 800);
    } catch (e: any) {
      setMsg(e?.message ?? "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
        <div className="mb-6">
          <Link
            href="/login"
            className="text-sm text-neutral-300 hover:text-white"
          >
            ← Giriş
          </Link>
          <h1 className="mt-3 text-xl font-semibold">Yeni şifre belirle</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Yeni şifreni gir ve kaydet.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs text-neutral-400">Yeni şifre</div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-neutral-400">
              Yeni şifre (tekrar)
            </div>
            <Input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {msg ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 text-sm text-neutral-200">
              {msg}
            </div>
          ) : null}

          <Button onClick={submit} disabled={loading} className="w-full">
            {loading ? "Kaydediliyor..." : "Şifreyi güncelle"}
          </Button>
        </div>
      </div>
    </main>
  );
}
