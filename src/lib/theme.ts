export type ThemeAccent =
  | "mint"
  | "teal"
  | "violet"
  | "rose"
  | "amber"
  | "mono";

export type ThemePreset = {
  id: ThemeAccent;
  label: string;
  primary: string;
  secondary: string;
  contrast: string;
  soft: string;
};

export const THEME_STORAGE_KEY = "clarionot:theme-accent:v1";

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "mint",
    label: "Su yeşili",
    primary: "#6bfb9a",
    secondary: "#44e2cd",
    contrast: "#052e16",
    soft: "rgba(107, 251, 154, 0.12)",
  },
  {
    id: "teal",
    label: "Turkuaz",
    primary: "#5eead4",
    secondary: "#38bdf8",
    contrast: "#042f2e",
    soft: "rgba(94, 234, 212, 0.12)",
  },
  {
    id: "violet",
    label: "Mor",
    primary: "#c4b5fd",
    secondary: "#f0abfc",
    contrast: "#2e1065",
    soft: "rgba(196, 181, 253, 0.12)",
  },
  {
    id: "rose",
    label: "Gül",
    primary: "#fda4af",
    secondary: "#fb7185",
    contrast: "#4c0519",
    soft: "rgba(253, 164, 175, 0.12)",
  },
  {
    id: "amber",
    label: "Amber",
    primary: "#fcd34d",
    secondary: "#fb923c",
    contrast: "#451a03",
    soft: "rgba(252, 211, 77, 0.12)",
  },
  {
    id: "mono",
    label: "Beyaz + gri",
    primary: "#f5f5f5",
    secondary: "#a3a3a3",
    contrast: "#111111",
    soft: "rgba(245, 245, 245, 0.1)",
  },
];

export const DEFAULT_THEME_ACCENT: ThemeAccent = "mint";

export function getThemePreset(id: string | null | undefined) {
  return (
    THEME_PRESETS.find((preset) => preset.id === id) ??
    THEME_PRESETS.find((preset) => preset.id === DEFAULT_THEME_ACCENT)!
  );
}

export function applyThemeAccent(id: string | null | undefined) {
  if (typeof document === "undefined") return;

  const preset = getThemePreset(id);
  const root = document.documentElement;

  root.style.setProperty("--clarionot-accent", preset.primary);
  root.style.setProperty("--clarionot-accent-2", preset.secondary);
  root.style.setProperty("--clarionot-accent-contrast", preset.contrast);
  root.style.setProperty("--clarionot-accent-soft", preset.soft);
  root.dataset.themeAccent = preset.id;
}
