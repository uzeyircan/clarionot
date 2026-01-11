"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setMsg(null);
    setLoading(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/update-password`,
      });

      if (error) throw error;

      setMsg("✅ Mail gönderildi. Gelen kutunu ve spam klasörünü kontrol et.");
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
          <h1 className="mt-3 text-xl font-semibold">Şifre sıfırlama</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Email adresini yaz, sana sıfırlama bağlantısı gönderelim.
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

          {msg ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 text-sm text-neutral-200">
              {msg}
            </div>
          ) : null}

          <Button
            onClick={submit}
            disabled={loading || !email}
            className="w-full"
          >
            {loading ? "Gönderiliyor..." : "Sıfırlama linki gönder"}
          </Button>
        </div>
      </div>
    </main>
  );
}
