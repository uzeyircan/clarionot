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

async function clearToken() {
  await chrome.storage.sync.remove([TOKEN_KEY]);
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

  // Token geçersizse temizleyip yeniden bağlatacağız
  if (res.status === 401) {
    await clearToken();
    throw new Error("TOKEN_INVALID");
  }

  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

// Menüleri kur: hem install hem tarayıcı açılışında
function setupMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "clarionot_save_link",
      title: "clarionot'a Kaydet (Link)",
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

// ✅ bridge.js buraya type:"SAVE_TOKEN" gönderir.
// Bazı yerlerde type:"clarionot_TOKEN" görülebiliyor; ikisini de kabul ediyoruz.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (
    (msg?.type === "SAVE_TOKEN" || msg?.type === "clarionot_TOKEN") &&
    msg.token
  ) {
    chrome.storage.sync.set({ [TOKEN_KEY]: msg.token }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});

/**
 * ✅ SADECE 1 tane onClicked listener:
 * - Direkt kaydetmeyi KALDIRDIK (çünkü modal istiyorsun)
 * - Sağ tık -> modal aç
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  // Hangi menüden geldiğine göre type belirleyelim
  let inferredType = "link";
  if (info.menuItemId === "clarionot_save_selection") inferredType = "note";

  chrome.tabs.sendMessage(tab.id, {
    type: "CLARIONOT_OPEN_MODAL",
    payload: {
      inferredType,
      selection: info.selectionText || "",
      link: info.linkUrl || "",
      pageUrl: tab.url || info.pageUrl || "",
    },
  });
});

/**
 * ✅ Modal kaydet dediğinde buraya gelir.
 * Burada payload'ı API formatına çevirip clipRequest ile gönderiyoruz.
 */
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type !== "CLARIONOT_SAVE_FROM_MODAL") return;

  try {
    const p = msg.payload || {};

    // Modal tarafı type göndermese bile dayanıklı olsun
    const type =
      p.type ||
      p.inferredType ||
      (p.url || p.link || p.pageUrl ? "link" : "note");

    let apiPayload = null;

    if (type === "link") {
      const url = (p.url || p.link || p.pageUrl || p.content || "").trim();
      if (!url) throw new Error("URL bulunamadı.");

      apiPayload = {
        type: "link",
        url,
        title: (p.title || "").trim(),
        tags: Array.isArray(p.tags) ? p.tags : [],
        // note alanını API desteklemiyorsa backend ignore eder (zarar vermez)
        note: (p.note || "").trim(),
      };
    } else {
      const text = (p.content || p.selection || "").trim();
      if (!text) throw new Error("Not içeriği boş.");

      apiPayload = {
        type: "note",
        title: (p.title || "").trim(),
        content: text,
        tags: Array.isArray(p.tags) ? p.tags : [],
      };
    }

    const out = await clipRequest(apiPayload);
    notify("Kaydedildi", `id: ${out.id}`);
  } catch (e) {
    const emsg = e?.message || String(e);

    // Token yoksa veya geçersizse connect'e götür
    if (emsg === "TOKEN_MISSING" || emsg === "TOKEN_INVALID") {
      chrome.tabs.create({ url: `${API_BASE}/extension/connect` });
      return;
    }

    notify("Hata", emsg);
    console.error(e);
  }
});
