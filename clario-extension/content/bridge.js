// content/bridge.js
(() => {
  const READY = {
    source: "clarionot-extension",
    type: "EXTENSION_READY",
    version: chrome.runtime?.getManifest?.().version,
    ts: Date.now(),
  };

  const PING = "CLARIONOT_PING";
  const PONG = "CLARIONOT_PONG";

  const TOKEN_MESSAGE_TYPES = ["clarionot_TOKEN", "CLARIONOT_TOKEN"];
  const ACK_OK = "CLARIONOT_TOKEN_SAVED";
  const ACK_FAIL = "CLARIONOT_TOKEN_SAVE_FAILED";

  // ✅ son sağ tık koordinatı
  let lastRightClick = { x: 0, y: 0 };

  function log(...args) {
    console.log("[clarionot bridge]", ...args);
  }

  const postReady = () => {
    try {
      window.postMessage(READY, window.location.origin);
    } catch {
      // ignore
    }
  };

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
    true,
  );

  // ---------------------------------------
  // ✅ Helper: save token (shared)
  // ---------------------------------------
  const saveToken = (token) =>
    new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: "SAVE_TOKEN", token }, (resp) => {
          const lastErr = chrome.runtime.lastError;
          const ok = !!resp?.ok && !lastErr;

          if (!ok) {
            const errMsg =
              (lastErr && lastErr.message) ||
              (typeof resp?.error === "string" ? resp.error : "") ||
              "SAVE_TOKEN failed";
            resolve({ ok: false, error: errMsg });
            return;
          }

          resolve({ ok: true });
        });
      } catch (e) {
        resolve({ ok: false, error: e?.message || String(e) });
      }
    });

  // ---------------------------------------
  // ✅ 1) Token: URL param fallback (kritik)
  // ---------------------------------------
  // Eğer connect sayfa token’ı query param ile dönüyorsa kaçırma.
  // Örn: /extension/connect?token=xxxxx
  try {
    const url = new URL(window.location.href);
    const tokenFromQuery =
      url.searchParams.get("token") ||
      url.searchParams.get("access_token") ||
      "";

    if (tokenFromQuery && typeof tokenFromQuery === "string") {
      log("token found in URL, saving...");
      saveToken(tokenFromQuery).then((r) => {
        if (!r.ok) {
          log("SAVE_TOKEN failed (from URL)", r.error);
          window.postMessage(
            { type: ACK_FAIL, error: r.error },
            window.location.origin,
          );
          return;
        }

        window.postMessage({ type: ACK_OK }, window.location.origin);
        log("ACK sent (from URL)");
      });
    }
  } catch {
    // ignore
  }

  // ---------------------------------------
  // ✅ 2) Modal: background -> content
  // ---------------------------------------
  // ÖNEMLİ: modal.js chrome.runtime.onMessage dinliyor.
  // Sen CustomEvent atıyordun, modal hiç açılmıyordu.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    try {
      if (msg?.type !== "CLARIONOT_OPEN_MODAL") return;

      const payload = msg.payload || {};

      // ✅ modal.js'in anlayacağı şekilde, yine chrome.runtime üzerinden
      // aynı tab'daki content script'lere forward et.
      // (modal.js content/modal.js zaten runtime.onMessage dinliyor)
      chrome.runtime.sendMessage(
        {
          type: "CLARIONOT_OPEN_MODAL",
          payload: {
            ...payload,
            clickX: lastRightClick.x,
            clickY: lastRightClick.y,
          },
        },
        () => {
          // ignore response, avoid lastError spam
          void chrome.runtime.lastError;
        },
      );

      sendResponse?.({ ok: true });
      return true;
    } catch {
      // sessiz geç
    }
  });

  // ---------------------------------------
  // ✅ 3) Token: web -> extension (postMessage)
  // ---------------------------------------
  window.addEventListener("message", (event) => {
    try {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;

      const data = event.data || {};
      if (!TOKEN_MESSAGE_TYPES.includes(data.type)) return;

      const token = data.token;
      if (!token || typeof token !== "string") return;

      log("token received via postMessage, saving...");

      saveToken(token).then((r) => {
        if (!r.ok) {
          log("SAVE_TOKEN failed", r.error);
          window.postMessage(
            { type: ACK_FAIL, error: r.error },
            window.location.origin,
          );
          return;
        }

        window.postMessage({ type: ACK_OK }, window.location.origin);
        log("ACK sent");
      });
    } catch {
      // sessiz geç
    }
  });
})();
