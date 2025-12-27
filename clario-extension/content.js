// Sitedeki /extension/connect sayfası window.postMessage ile token gönderecek
window.addEventListener("message", async (event) => {
  if (event.source !== window) return;
  if (event.origin !== "https://clasio.netlify.app") return;

  const data = event.data;
  if (!data || data.type !== "CLARIO_TOKEN") return;

  const token = data.token;
  if (!token) return;

  chrome.runtime.sendMessage({ type: "SAVE_TOKEN", token }, (resp) => {
    // İstersen UI'ye “bağlandı” sinyali dönebilirsin
    console.log("Token saved:", resp);
  });
});
