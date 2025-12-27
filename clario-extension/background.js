const API_BASE = "https://clarionot.com"; // prod domain
const API_PATH = "/api/clip";
const TOKEN_KEY = "clarionot_token";

function notify(title, message) {
  console.log(`[clarionot Clip] ${title}: ${message}`);
}

async function getToken() {
  const data = await chrome.storage.sync.get([TOKEN_KEY]);
  return data[TOKEN_KEY] || "";
}

async function clipRequest(payload) {
  const token = await getToken();
  if (!token) throw new Error("TOKEN_MISSING");

  const res = await fetch(`${API_BASE}${API_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

// Menüleri kur: hem install hem tarayıcı açılışında
function setupMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "clarionot_save_link",
      title: "clarionot'ya Kaydet (Link)",
      contexts: ["link"],
    });

    chrome.contextMenus.create({
      id: "clarionot_save_page",
      title: "clarionot'ya Kaydet (Bu Sayfa)",
      contexts: ["page"],
    });

    chrome.contextMenus.create({
      id: "clarionot_save_selection",
      title: "clarionot'ya Kaydet (Not - Seçili Metin)",
      contexts: ["selection"],
    });
  });
}

chrome.runtime.onInstalled.addListener(setupMenus);
chrome.runtime.onStartup.addListener(setupMenus);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "SAVE_TOKEN" && msg.token) {
    chrome.storage.sync.set({ [TOKEN_KEY]: msg.token }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    let payload = null;

    if (info.menuItemId === "clarionot_save_link") {
      const url = info.linkUrl;
      if (!url) throw new Error("URL bulunamadı.");

      // ✅ title boş gönderiyoruz, backend üretecek
      payload = { type: "link", url, title: "", tags: [] };
    }

    if (info.menuItemId === "clarionot_save_page") {
      const url = tab?.url || info.pageUrl || "";
      if (!url) throw new Error("URL bulunamadı.");

      // ✅ title boş gönderiyoruz, backend üretecek
      payload = { type: "link", url, title: "", tags: [] };
    }

    if (info.menuItemId === "clarionot_save_selection") {
      const text = (info.selectionText || "").trim();
      if (!text) throw new Error("Seçili metin yok.");

      // ✅ title boş gönderiyoruz, backend ilk satırı title yapacak
      payload = { type: "note", title: "", content: text, tags: [] };
    }

    if (!payload) return;

    const out = await clipRequest(payload);
    notify("Kaydedildi", `id: ${out.id}`);
  } catch (e) {
    const msg = e?.message || String(e);

    if (msg === "TOKEN_MISSING") {
      chrome.tabs.create({ url: `${API_BASE}/extension/connect` });
      return;
    }

    notify("Hata", msg);
    console.error(e);
  }
});
