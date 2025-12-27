"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  const submit = async () => {
    setMsg(null);
    setLoading(true);
    try {
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
      router.replace("/");
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
          <Link href="/" className="text-sm text-neutral-300 hover:text-white">
            ← clarionot
          </Link>
          <h1 className="mt-3 text-xl font-semibold">
            {mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Link ve notlarını kaydet, sonra anında bul.
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

          {msg ? (
            <div className="rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-200">
              {msg}
            </div>
          ) : null}

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
            Şifre minimum 6 karakter. (Supabase default)
          </div>
        </div>
      </div>
    </main>
  );
}
