"use client";

import { useEffect, useState } from "react";

type ProPrice = {
  id: string;
  active: boolean;
  currency: string;
  unit_amount: number | null;
  formatted: string | null;
  interval: "day" | "week" | "month" | "year" | null;
  product_name: string | null;
};

export function useProPrice() {
  const [price, setPrice] = useState<ProPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/billing/price", { method: "GET" });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

        if (alive) setPrice(json);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Price fetch failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { price, loading, error };
}
