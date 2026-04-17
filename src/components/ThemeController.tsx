"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  applyThemeAccent,
  DEFAULT_THEME_ACCENT,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

export default function ThemeController() {
  useEffect(() => {
    const applyStoredTheme = () => {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      applyThemeAccent(stored ?? DEFAULT_THEME_ACCENT);
    };

    applyStoredTheme();

    const loadRemoteTheme = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) return;

      const { data: settings, error } = await supabase
        .from("user_settings")
        .select("theme_accent")
        .eq("user_id", uid)
        .maybeSingle();

      if (error) return;

      const remoteAccent = (settings as any)?.theme_accent;
      if (!remoteAccent) return;

      localStorage.setItem(THEME_STORAGE_KEY, remoteAccent);
      applyThemeAccent(remoteAccent);
    };

    loadRemoteTheme();

    const onThemeChange = (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      if (next) applyThemeAccent(next);
    };

    window.addEventListener("clarionot:theme-change", onThemeChange);
    window.addEventListener("storage", applyStoredTheme);

    return () => {
      window.removeEventListener("clarionot:theme-change", onThemeChange);
      window.removeEventListener("storage", applyStoredTheme);
    };
  }, []);

  return null;
}
