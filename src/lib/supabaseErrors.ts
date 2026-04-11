const NETWORK_ERROR_MESSAGES = [
  "failed to fetch",
  "networkerror when attempting to fetch resource",
  "load failed",
];

export function getSupabaseAuthErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "";

  if (
    NETWORK_ERROR_MESSAGES.some((networkMessage) =>
      message.toLowerCase().includes(networkMessage)
    )
  ) {
    return [
      "Supabase'a ulasilamiyor.",
      ".env.local icindeki NEXT_PUBLIC_SUPABASE_URL degerinin Supabase Project Settings > API bolumundeki Project URL ile ayni oldugundan emin ol ve dev server'i yeniden baslat.",
    ].join(" ");
  }

  return message || "Bir hata olustu.";
}
