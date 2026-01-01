// content/bridge.js

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.origin !== window.location.origin) return;

  const { type, token } = event.data || {};
  if (type !== "clarionot_TOKEN" || !token) return;

  chrome.runtime.sendMessage({ type: "SAVE_TOKEN", token }, (resp) => {
    window.postMessage(
      { type: "clarionot_TOKEN_SAVED", ok: !!resp?.ok },
      window.location.origin
    );
  });
});
