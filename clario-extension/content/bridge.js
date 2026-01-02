// content/bridge.js
(() => {
  window.addEventListener("message", (event) => {
    // connect sayfası kendi origininde postMessage atıyor
    if (event.source !== window) return;
    if (!event.data || typeof event.data !== "object") return;

    const { type, token } = event.data;

    // ✅ Website -> extension köprüsü
    if (type === "clarionot_TOKEN" && token) {
      chrome.runtime.sendMessage({ type: "SAVE_TOKEN", token });
    }
  });
})();
