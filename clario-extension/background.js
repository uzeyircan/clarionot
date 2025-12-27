const API_BASE = "https://clasio.netlify.app"; // prod domain
const API_PATH = "/api/clip";
const TOKEN_KEY = "clario_token";

function notify(title, message) {
  console.log(`[Clario Clip] ${title}: ${message}`);
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

function buildTitleFromUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace("www.", "");
  } catch {
    return "Başlıksız link";
  }
}

// Menüleri kur: hem install hem tarayıcı açılışında
function setupMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "clario_save_link",
      title: "Clario'ya Kaydet (Link)",
      contexts: ["link"],
    });

    chrome.contextMenus.create({
      id: "clario_save_page",
      title: "Clario'ya Kaydet (Bu Sayfa)",
      contexts: ["page"],
    });

    chrome.contextMenus.create({
      id: "clario_save_selection",
      title: "Clario'ya Kaydet (Not - Seçili Metin)",
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

    if (info.menuItemId === "clario_save_link") {
      const url = info.linkUrl;
      if (!url) throw new Error("URL bulunamadı.");
      payload = { type: "link", url, title: buildTitleFromUrl(url), tags: [] };
    }

    if (info.menuItemId === "clario_save_page") {
      const url = tab?.url || info.pageUrl || "";
      if (!url) throw new Error("URL bulunamadı.");
      payload = { type: "link", url, title: buildTitleFromUrl(url), tags: [] };
    }

    if (info.menuItemId === "clario_save_selection") {
      const text = (info.selectionText || "").trim();
      if (!text) throw new Error("Seçili metin yok.");
      payload = {
        type: "note",
        content: text,
        title: text.slice(0, 60),
        tags: [],
      };
    }

    if (!payload) return;

    const out = await clipRequest(payload);
    notify("Kaydedildi", `id: ${out.id}`);
  } catch (e) {
    const msg = e?.message || String(e);

    // Token yoksa connect sayfasını aç
    if (msg === "TOKEN_MISSING") {
      chrome.tabs.create({ url: `${API_BASE}/extension/connect` });
      return;
    }

    notify("Hata", msg);
    console.error(e);
  }
});
