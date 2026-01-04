// content/bridge.js
(() => {
  const TOKEN_MESSAGE_TYPES = ["clarionot_TOKEN", "CLARIONOT_TOKEN"];
  const ACK_OK = "CLARIONOT_TOKEN_SAVED";
  const ACK_FAIL = "CLARIONOT_TOKEN_SAVE_FAILED";

  function log(...args) {
    console.log("[clarionot bridge]", ...args);
  }

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
