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
    const controller = new AbortController();
    // ✅ İstek askıda kalırsa (ağ/timeout) arayüz sonsuza kadar
    // "Yükleniyor..." göstermesin; belirli bir sürede hataya düş.
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/billing/price", {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

        if (alive) setPrice(json as ProPrice);
      } catch (e: any) {
        if (alive) {
          setError(
            e?.name === "AbortError"
              ? "Fiyat alınamadı (zaman aşımı)"
              : (e?.message ?? "Fiyat alınamadı"),
          );
        }
      } finally {
        clearTimeout(timeoutId);
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  return { price, loading, error };
}
