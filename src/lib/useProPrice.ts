"use client";

import { useEffect, useState } from "react";

type ProPrice = {
  id: string;
  formatted: string;
  currency: string;
  interval: "day" | "week" | "month" | "year" | null;
  unit_amount: number;
  lookup_key?: string | null;
  product_name?: string | null;
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

        const res = await fetch("/api/billing/price", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

        if (alive) setPrice(json as ProPrice);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Fiyat alınamadı");
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
