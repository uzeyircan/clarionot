const API_BASE = "https://clasio.netlify.app";
const TOKEN_KEY = "clario_token";

async function refresh() {
  const data = await chrome.storage.sync.get([TOKEN_KEY]);
  const token = data[TOKEN_KEY];

  const el = document.getElementById("status");
  if (token) {
    el.className = "ok";
    el.textContent = "✅ Bağlı";
  } else {
    el.className = "err";
    el.textContent = "❌ Bağlı değil";
  }
}

document.getElementById("connect").addEventListener("click", () => {
  chrome.tabs.create({ url: `${API_BASE}/extension/connect` });
});

document.getElementById("reset").addEventListener("click", async () => {
  await chrome.storage.sync.remove([TOKEN_KEY]);
  refresh();
});

refresh();
