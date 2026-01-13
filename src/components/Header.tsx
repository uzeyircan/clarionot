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
  const [checkingPlan, setCheckingPlan] = useState(true);

  const fetchPlan = async (uid: string) => {
    setCheckingPlan(true);
    try {
      const { data, error } = await supabase
        .from("user_plan")
        .select("plan,status")
        .eq("user_id", uid)
        .maybeSingle();

      if (error || !data) {
        setPlan("free");
        return;
      }

      const isPro =
        data.plan === "pro" &&
        (data.status === "active" || data.status === "trialing");

      setPlan(isPro ? "pro" : "free");
    } finally {
      setCheckingPlan(false);
    }
  };

  useEffect(() => {
    // İlk session
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      const uid = session?.user?.id ?? null;

      setLoggedIn(!!session);

      if (uid) fetchPlan(uid);
      else {
        setPlan("free");
        setCheckingPlan(false);
      }
    });

    // Auth değişimi
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const uid = session?.user?.id ?? null;

        setLoggedIn(!!session);

        if (uid) fetchPlan(uid);
        else {
          setPlan("free");
          setCheckingPlan(false);
        }
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
      <Link
        href="/"
        className="text-sm font-semibold tracking-wide flex items-center gap-2"
      >
        {/* Şimdilik text logo. Logo mark ekleyeceğiz */}
        ClarioNot
      </Link>

      <div className="flex items-center gap-2">
        {loggedIn ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold border ${
              plan === "pro"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-neutral-500/15 text-neutral-400 border-neutral-500/30"
            }`}
            title={checkingPlan ? "Plan kontrol ediliyor" : undefined}
          >
            {checkingPlan ? "..." : plan === "pro" ? "PRO" : "FREE"}
          </span>
        ) : null}

        <Link
          href="/pro"
          className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-100 hover:bg-neutral-800 transition"
        >
          Planlar
        </Link>

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
