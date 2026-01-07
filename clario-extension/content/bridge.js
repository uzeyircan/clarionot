// content/bridge.js
(() => {
  const TOKEN_MESSAGE_TYPES = ["clarionot_TOKEN", "CLARIONOT_TOKEN"];
  const ACK_OK = "CLARIONOT_TOKEN_SAVED";
  const ACK_FAIL = "CLARIONOT_TOKEN_SAVE_FAILED";

  // ✅ son sağ tık koordinatı
  let lastRightClick = { x: 0, y: 0 };

  function log(...args) {
    console.log("[clarionot bridge]", ...args);
  }

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

      // modal.js zaten chrome.runtime.onMessage dinliyor,
      // o yüzden aynı mesajı tekrar göndermiyoruz.
      // Ama payload'a koordinat eklemek için custom event dispatch ediyoruz.
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

  // ✅ Token köprüsü (senin kodun)
  window.addEventListener("message", (event) => {
    try {
      // sadece aynı sayfadan gelen mesajları al
      if (event.source !== window) return;

      const data = event.data || {};
      if (!TOKEN_MESSAGE_TYPES.includes(data.type)) return;

      const token = data.token;
      if (!token) return;

      log("token received, forwarding to background...");

      // Background'a kaydet
      chrome.runtime.sendMessage({ type: "SAVE_TOKEN", token }, (resp) => {
        const lastErr = chrome.runtime.lastError;
        const ok = !!resp?.ok && !lastErr;

        if (!ok) {
          log("SAVE_TOKEN failed", lastErr || resp);
          // ✅ sayfaya FAIL dön (timeout beklemesin)
          window.postMessage(
            {
              type: ACK_FAIL,
              error: (lastErr && lastErr.message) || "SAVE_TOKEN failed",
            },
            window.location.origin
          );
          return;
        }

        // Sayfaya ACK dön (page.tsx bunu bekleyecek)
        window.postMessage({ type: ACK_OK }, window.location.origin);
        log("ACK sent");
      });
    } catch (e) {
      // sessiz geç
    }
  });
})();
