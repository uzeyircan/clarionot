const tokenEl = document.getElementById("token");
const msgEl = document.getElementById("msg");
const saveBtn = document.getElementById("save");

function show(type, text) {
  msgEl.className = type;
  msgEl.textContent = text;
}

async function load() {
  const data = await chrome.storage.sync.get(["clarioToken"]);
  tokenEl.value = data.clarioToken || "";
}

saveBtn.addEventListener("click", async () => {
  const t = tokenEl.value.trim();
  await chrome.storage.sync.set({ clarioToken: t });
  show("ok", "Kaydedildi ✅");
});

load().catch(console.error);
