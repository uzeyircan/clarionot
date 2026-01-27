// content/bridge.js
(() => {
  // Let the web app detect the extension on /extension/connect as well.
  const READY = {
    source: "clarionot-extension",
    type: "EXTENSION_READY",
    version: chrome.runtime?.getManifest?.().version,
    ts: Date.now(),
  };
  const PING = "CLARIONOT_PING";
  const PONG = "CLARIONOT_PONG";

  const postReady = () => {
    try {
      window.postMessage(READY, window.location.origin);
    } catch {
      // ignore
    }
  };

  const TOKEN_MESSAGE_TYPES = ["clarionot_TOKEN", "CLARIONOT_TOKEN"];
  const ACK_OK = "CLARIONOT_TOKEN_SAVED";
  const ACK_FAIL = "CLARIONOT_TOKEN_SAVE_FAILED";

  // ✅ son sağ tık koordinatı
  let lastRightClick = { x: 0, y: 0 };

  function log(...args) {
    console.log("[clarionot bridge]", ...args);
  }

  // Best-effort announce.
  postReady();

  // Answer ping from the app ("is extension live in this tab?").
  window.addEventListener("message", (event) => {
    try {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;

      const data = event.data || {};
      if (data?.type !== PING) return;

      window.postMessage({ type: PONG }, window.location.origin);
      // Also re-announce ready (handy if the app missed it).
      postReady();
    } catch {
      // ignore
    }
  });

  // ✅ sağ tık koordinatını yakala
  document.addEventListener(
    "contextmenu",
    (e) => {
      lastRightClick = { x: e.clientX, y: e.clientY };
    },
    true
  );

  // ✅ background -> content: modal açma mesajını yakala ve koordinat ekle
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    try {
      if (msg?.type !== "CLARIONOT_OPEN_MODAL") return;

      const payload = msg.payload || {};

      window.dispatchEvent(
        new CustomEvent("CLARIONOT_OPEN_MODAL", {
          detail: {
            ...payload,
            clickX: lastRightClick.x,
            clickY: lastRightClick.y,
          },
        })
      );

      sendResponse?.({ ok: true });
      return true;
    } catch {
      // sessiz geç
    }
  });

  // ✅ Token köprüsü (web -> extension)
  window.addEventListener("message", (event) => {
    try {
      // sadece aynı sayfadan ve aynı origin'den gelen mesajları al
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;

      const data = event.data || {};
      if (!TOKEN_MESSAGE_TYPES.includes(data.type)) return;

      const token = data.token;
      if (!token || typeof token !== "string") return;

      log("token received, forwarding to background...");

      chrome.runtime.sendMessage({ type: "SAVE_TOKEN", token }, (resp) => {
        const lastErr = chrome.runtime.lastError;
        const ok = !!resp?.ok && !lastErr;

        if (!ok) {
          const errMsg =
            (lastErr && lastErr.message) ||
            (typeof resp?.error === "string" ? resp.error : "") ||
            "SAVE_TOKEN failed";

          log("SAVE_TOKEN failed", lastErr || resp);

          // ✅ sayfaya FAIL dön (timeout beklemesin)
          window.postMessage(
            { type: ACK_FAIL, error: errMsg },
            window.location.origin
          );
          return;
        }

        // ✅ Sayfaya ACK dön (page.tsx bunu bekleyecek)
        window.postMessage({ type: ACK_OK }, window.location.origin);
        log("ACK sent");
      });
    } catch {
      // sessiz geç
    }
  });
})();
