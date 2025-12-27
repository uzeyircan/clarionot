const API_BASE = "https://clasio.netlify.app"; // prod domain
const API_PATH = "/api/clip";
const TOKEN_KEY = "clario_token";
async function resolveTitleFromPage(tabId, url) {
  if (!tabId) return "";

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      args: [url],
      func: (linkUrl) => {
        try {
          // Aynı URL’yi taşıyan a elementini bul
          const a = [...document.querySelectorAll("a[href]")].find((el) => {
            const href = el.getAttribute("href") || "";
            // relative link olabilir
            const full = new URL(href, location.href).toString();
            return full === linkUrl;
          });

          const anchorText = a?.textContent?.trim() || "";
          if (anchorText) return anchorText;

          // Anchor bulunamazsa sayfa title dene
          const pageTitle = document.title?.trim() || "";
          return pageTitle;
        } catch {
          return document.title?.trim() || "";
        }
      },
    });

    return (result || "").trim();
  } catch {
    return "";
  }
}

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

      // 1) önce sayfadan gerçek başlığı al
      let title = await resolveTitleFromPage(tab?.id, url);

      // 2) hâlâ yoksa hostname
      if (!title) title = buildTitleFromUrl(url);

      payload = { type: "link", url, title, tags: [] };
    }

    if (info.menuItemId === "clario_save_page") {
      const url = tab?.url || info.pageUrl || "";
      if (!url) throw new Error("URL bulunamadı.");
      payload = { type: "link", url, title: buildTitleFromUrl(url), tags: [] };
    }

    if (info.menuItemId === "clario_save_selection") {
      const text = (info.selectionText || "").trim();
      if (!text) throw new Error("Seçili metin yok.");

      // İlk satır / ilk cümle
      const firstLine = text.split("\n").find(Boolean) || "";
      const title = firstLine.slice(0, 80) || "Not";

      payload = { type: "note", title, content: text, tags: [] };
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
