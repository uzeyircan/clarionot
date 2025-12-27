"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [plan, setPlan] = useState<"free" | "pro">("free");

  useEffect(() => {
    const computePlan = (session: any) => {
      const email = (session?.user?.email ?? "").toLowerCase();

      const proEmails = (process.env.NEXT_PUBLIC_PRO_EMAILS ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const isPro = email ? proEmails.includes(email) : false;
      setPlan(isPro ? "pro" : "free");
    };

    // İlk session kontrolü
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
      computePlan(data.session);
    });

    // Auth değişikliklerini dinle
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setLoggedIn(!!session);
        computePlan(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="flex items-center justify-between">
      <Link href="/" className="text-sm font-semibold tracking-wide">
        clarionot
      </Link>

      <div className="flex items-center gap-2">
        {/* PLAN BADGE (login olduysa göster) */}
        {loggedIn ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold border ${
              plan === "pro"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-neutral-500/15 text-neutral-400 border-neutral-500/30"
            }`}
          >
            {plan === "pro" ? "PRO" : "FREE"}
          </span>
        ) : null}

        {/* LOGIN / LOGOUT */}
        {loggedIn ? (
          <Button variant="ghost" onClick={logout}>
            Çıkış Yap
          </Button>
        ) : (
          <Button variant="ghost">
            <Link
              href="/login"
              className="text-sm text-neutral-300 hover:text-white"
            >
              Giriş Yap
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
