"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

type NativeAppState = {
  isNativeApp: boolean;
  isPlatformResolved: boolean;
};

// isPlatformResolved is always false during SSR and on the very first
// client render (avoids hydration mismatches). Both fields flip together,
// in a single state update, inside the first effect pass after mount.
// Callers MUST gate on isPlatformResolved before trusting isNativeApp —
// reading isNativeApp alone is always `false` for one render/effect pass
// on a real device too, which is enough time for a native-only effect to
// fire once with a stale "web" reading if it isn't also checking
// isPlatformResolved.
export function useIsNativeApp(): NativeAppState {
  const [state, setState] = useState<NativeAppState>({
    isNativeApp: false,
    isPlatformResolved: false,
  });

  useEffect(() => {
    setState({
      isNativeApp: Capacitor.isNativePlatform(),
      isPlatformResolved: true,
    });
  }, []);

  return state;
}
