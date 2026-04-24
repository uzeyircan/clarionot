"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const AUTO_PROMPT_STORAGE_PREFIX = "clarionot:push-autoprompt:v1:";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function persistSubscription(
  accessToken: string,
  subscription: PushSubscription,
) {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      platform: "web",
      deviceLabel: navigator.platform || "Browser",
      userAgent: navigator.userAgent,
    }),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(json?.error || "Push subscription could not be saved.");
  }
}

async function persistPushSettings(userId: string) {
  await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    { onConflict: "user_id" },
  );
}

export default function PushController() {
  const pathname = usePathname();

  useEffect(() => {
    const shouldAutoPrompt =
      pathname?.startsWith("/dashboard") || pathname?.startsWith("/settings");

    if (!shouldAutoPrompt) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (!("serviceWorker" in navigator)) return;
    if (!("PushManager" in window)) return;
    if (Notification.permission !== "default") return;

    const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    if (!publicKey) return;

    let cancelled = false;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const userId = session?.user?.id;
      const accessToken = session?.access_token;

      if (!userId || !accessToken || cancelled) return;

      const storageKey = `${AUTO_PROMPT_STORAGE_PREFIX}${userId}`;
      if (localStorage.getItem(storageKey)) return;
      localStorage.setItem(storageKey, "1");

      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted" || cancelled) return;

        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        const subscription =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          }));

        if (cancelled) return;

        await persistSubscription(accessToken, subscription);
        await persistPushSettings(userId);
      } catch {
        // Browser-level prompt failures or permission throttling fall back to Settings.
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
