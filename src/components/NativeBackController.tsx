"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { NATIVE_BACK_EVENT } from "@/lib/nativeBack";

// Screens where the hardware back button should minimize the app instead of
// walking further back into WebView history (e.g. bouncing into /login,
// which redirects straight back to /dashboard and looks like a freeze).
const ROOT_PATHS = new Set(["/", "/dashboard"]);

export default function NativeBackController() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;

    let cancelled = false;
    let handle: { remove: () => void } | undefined;

    App.addListener("backButton", ({ canGoBack }) => {
      // Let any open dashboard modal/dialog claim the back press first.
      const dialogEvent = new CustomEvent(NATIVE_BACK_EVENT, {
        cancelable: true,
      });
      const wasNotCancelled = window.dispatchEvent(dialogEvent);
      if (!wasNotCancelled || dialogEvent.defaultPrevented) return;

      const isRootScreen = ROOT_PATHS.has(pathnameRef.current ?? "/");
      if (!isRootScreen && canGoBack) {
        window.history.back();
        return;
      }

      void App.minimizeApp();
    }).then((listenerHandle) => {
      if (cancelled) {
        listenerHandle.remove();
      } else {
        handle = listenerHandle;
      }
    });

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, []);

  return null;
}
