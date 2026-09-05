"use client";

import Sheet from "@/components/dashboard/Sheet";

type ClipUsage =
  | { plan: "pro"; unlimited: true }
  | { plan: "free"; unlimited: false; used: number; limit: number; remaining: number };

type Props = {
  extConnected: boolean;
  extLiveHere: boolean;
  extChecking: boolean;
  clipUsage: ClipUsage | null;
  clipUsageLoading: boolean;
  clipUsageError: boolean;
  onReconnect: () => void;
};

function StatusLine({
  extChecking,
  extLiveHere,
  extConnected,
}: {
  extChecking: boolean;
  extLiveHere: boolean;
  extConnected: boolean;
}) {
  if (extChecking) return <div className="text-xs text-white/56">Kontrol ediliyor…</div>;
  if (extLiveHere) return <div className="text-xs text-cyan-100">✅ Bu tarayıcıda aktif</div>;
  if (extConnected)
    return <div className="text-xs text-amber-300">⚠️ Bağlı, bu tarayıcıda aktif değil</div>;
  return <div className="text-xs text-rose-300">❌ Eklenti bağlı değil</div>;
}

function DetailBlock({
  extConnected,
  extLiveHere,
  extChecking,
  clipUsage,
  clipUsageLoading,
  clipUsageError,
  onReconnect,
}: Props) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-white">
          Tarayıcı Eklentisi
          {!clipUsageLoading && !clipUsageError && clipUsage ? (
            clipUsage.unlimited ? (
              <span className="ml-1.5 text-xs font-normal text-cyan-200/70">(Sınırsız)</span>
            ) : (
              <span
                className={`ml-1.5 text-xs font-normal ${
                  clipUsage.remaining <= 5 ? "text-amber-300/80" : "text-cyan-200/70"
                }`}
              >
                (
                {clipUsage.remaining > 0
                  ? `${clipUsage.remaining} hak kaldı`
                  : "hakkın kalmadı"}
                )
              </span>
            )
          ) : null}
        </div>
      </div>

      <StatusLine extChecking={extChecking} extLiveHere={extLiveHere} extConnected={extConnected} />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {extChecking ? (
          <button
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold text-white/40"
          >
            Kontrol ediliyor…
          </button>
        ) : extLiveHere ? (
          <button
            type="button"
            onClick={onReconnect}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/82 transition hover:bg-white/[0.08]"
          >
            Yeniden bağla
          </button>
        ) : (
          <a
            href="/extension/connect"
            className="accent-gradient inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
          >
            Bağla
          </a>
        )}

        {!clipUsageLoading &&
        !clipUsageError &&
        clipUsage &&
        !clipUsage.unlimited &&
        clipUsage.remaining <= 0 ? (
          <a
            href="/pro"
            className="text-[11px] font-semibold text-cyan-100 underline decoration-cyan-200/30"
          >
            Sınırsız için Pro
          </a>
        ) : null}
      </div>

      {!extChecking && !extLiveHere ? (
        <p className="mt-2 text-[11px] text-white/46">
          Sağ tık → "ClarioNot'a Kaydet" ile tek tık kaydeder.
        </p>
      ) : null}
    </div>
  );
}

function usageLabel(props: Props): string | null {
  if (props.clipUsageLoading || props.clipUsageError || !props.clipUsage) return null;
  if (props.clipUsage.unlimited) return "Sınırsız";
  return props.clipUsage.remaining > 0
    ? `${props.clipUsage.remaining} hak`
    : "hakkın kalmadı";
}

/**
 * Compact single-row sidebar footer trigger. Only a status dot + short
 * summary are visible at rest — full connection/usage detail, reconnect
 * action and errors only appear once the row is clicked (see DetailBlock).
 */
export function ExtensionStatusSidebarFooter(
  props: Props & { open: boolean; onOpen: () => void; onClose: () => void },
) {
  const { open, onOpen, onClose, ...rest } = props;
  const dotClass = rest.extChecking
    ? "bg-white/40"
    : rest.extLiveHere
      ? "bg-cyan-300"
      : rest.extConnected
        ? "bg-amber-300"
        : "bg-rose-400";

  const statusText = rest.extChecking
    ? "Kontrol ediliyor…"
    : rest.extLiveHere
      ? "Tarayıcı eklentisi aktif"
      : rest.extConnected
        ? "Bağlı, bu tarayıcıda aktif değil"
        : "Eklenti bağlı değil";

  const usage = usageLabel(rest);

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label="Tarayıcı eklentisi durumu"
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-white/58 transition hover:bg-white/[0.06] hover:text-white/82"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">
          {statusText}
          {usage ? <span className="text-white/38"> · {usage}</span> : null}
        </span>
      </button>

      <Sheet open={open} onClose={onClose} title="Tarayıcı Eklentisi" desktopWidthClassName="lg:w-[380px]">
        <DetailBlock {...rest} />
      </Sheet>
    </>
  );
}
