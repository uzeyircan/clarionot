// content/bridge.js
(() => {
  const TOKEN_MESSAGE_TYPES = ["clarionot_TOKEN", "CLARIONOT_TOKEN"];
  const ACK_TYPE = "CLARIONOT_TOKEN_SAVED";

  function log(...args) {
    // yorum satırını kaldırıp debug edebilirsin
    // console.log("[clarionot bridge]", ...args);
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
        const ok = !!resp?.ok && !chrome.runtime.lastError;

        if (!ok) {
          log("SAVE_TOKEN failed", chrome.runtime.lastError);
          // burada ACK göndermeyelim; sayfa timeout ile "bridge çalışmadı" diyecek
          return;
        }

        // Sayfaya ACK dön (page.tsx bunu bekleyecek)
        window.postMessage({ type: ACK_TYPE }, window.location.origin);
        log("ACK sent");
      });
    } catch (e) {
      // sessiz geç
    }
  });
})();
