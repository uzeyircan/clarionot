"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { supabase as defaultSupabase } from "@/lib/supabase";
import { getSupabaseAuthErrorMessage } from "@/lib/supabaseErrors";
import DnaBackdrop from "@/components/DnaBackdrop";

function createAuthClient(remember: boolean) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: remember ? window.localStorage : window.sessionStorage,
    },
  });
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // mevcut client ile session varsa direkt dashboard
    defaultSupabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  const submit = async () => {
    setMsg(null);
    setLoading(true);

    try {
      // ✅ Bu login işlemi için storage seçimine göre client oluştur
      const supabase = createAuthClient(remember);

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }

      // ✅ Not: sen dashboard’a yönlendirme yerine "/" yapmışsın, dokunmuyorum.
      router.replace("/");
    } catch (e) {
      setMsg(getSupabaseAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#131313] px-5 py-10 text-[#e5e2e1]">
      <DnaBackdrop className="fixed opacity-25" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(107,251,154,0.09),transparent_42%),linear-gradient(to_bottom,transparent,#131313_82%)]" />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-xl border border-[#3d4a3e]/30 bg-[#201f1f]/72 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl lg:grid-cols-[0.92fr_1.08fr]">
        <section className="border-b border-[#3d4a3e]/25 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-sm font-semibold tracking-[0.22em] text-white/78 hover:text-white"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-sm font-black">
              c
            </span>
            clarionot
          </Link>

          <p className="mt-10 text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
            {mode === "login" ? "Giriş" : "Yeni hesap"}
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
            Kaydettiğin fikirler seni bekliyor.
          </h1>
          <p className="mt-5 text-sm leading-6 text-[#bccabb]">
            Linkleri, notları, grupları ve hatırlatma akışını tek sakin
            çalışma alanında yönet.
          </p>

          <div className="mt-8 grid gap-3 text-sm text-[#bccabb]">
            {["Manuel not ve link kaydı", "Etiket ve grup düzeni", "Pro ile sağ tıkla kaydetme"].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-lg border border-[#3d4a3e]/25 bg-[#0e0e0e]/55 px-4 py-3"
                >
                  {item}
                </div>
              ),
            )}
          </div>
        </section>

        <section className="p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight">
              {mode === "login" ? "Giriş yap" : "Kayıt ol"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#bccabb]">
              Devam etmek için e-posta ve şifreni gir.
            </p>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs text-neutral-400">Email</div>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@mail.com"
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-neutral-400">Şifre</div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {/* ✅ Oturum açık kalsın */}
          <label className="flex items-center gap-2 text-sm text-neutral-300 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-white"
            />
            Oturum açık kalsın
          </label>

          {msg ? (
            <div className="rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-200">
              {msg}
            </div>
          ) : null}
          <div className="flex justify-end">
            <Link
              href="/reset-password"
              className="text-xs text-neutral-300 hover:text-white underline"
            >
              Şifremi unuttum
            </Link>
          </div>

          <Button
            onClick={submit}
            disabled={loading || !email || password.length < 6}
            className="w-full"
          >
            {loading
              ? "Bekleniyor..."
              : mode === "login"
                ? "Giriş Yap"
                : "Kayıt Ol"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
          >
            {mode === "login"
              ? "Hesabın yok mu? Kayıt ol"
              : "Zaten hesabın var mı? Giriş yap"}
          </Button>

          <div className="text-xs text-neutral-500">
            Şifre minimum 6 karakter.
          </div>
        </div>
        </section>
      </div>
    </main>
  );
}
