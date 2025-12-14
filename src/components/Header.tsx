"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // İlk session kontrolü
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
    });

    // Auth değişikliklerini dinle
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setLoggedIn(!!session);
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
      <Link href="#" className="text-sm font-semibold tracking-wide">
        Clario
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
    </header>
  );
}
