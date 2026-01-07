const API_BASE = "https://clarionot.com"; // prod domain
const API_PATH = "/api/clip";
const GROUPS_PATH = "/api/group";
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

  if (res.status === 401) {
    await clearToken();
    throw new Error("TOKEN_INVALID");
  }

  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

// ✅ Groups çek (modal'da dropdown için)
async function groupsRequest() {
  const token = await getToken();
  if (!token) throw new Error("TOKEN_MISSING");

  const res = await fetch(`${API_BASE}${GROUPS_PATH}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await res.json().catch(() => ({}));

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
        group_id: p.group_id ?? null,
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
        group_id: p.group_id ?? null,
      };
    }

    const out = await clipRequest(apiPayload);
    notify("Kaydedildi", `id: ${out.id}`);
  } catch (e) {
    const emsg = e?.message || String(e);

    if (emsg === "TOKEN_MISSING" || emsg === "TOKEN_INVALID") {
      chrome.tabs.create({ url: `${API_BASE}/extension/connect` });
      return;
    }

    notify("Hata", emsg);
    console.error(e);
  }
});

/**
 * ✅ Modal açıldığında group listesini ister.
 * Content script (modal.js) -> background -> API -> modal.js
 */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "CLARIONOT_GET_GROUPS") return;

  (async () => {
    try {
      const out = await groupsRequest(); // { groups: [...] }
      sendResponse({ ok: true, groups: out.groups || [] });
    } catch (e) {
      const emsg = e?.message || String(e);
      if (emsg === "TOKEN_MISSING" || emsg === "TOKEN_INVALID") {
        sendResponse({ ok: false, code: emsg });
      } else {
        sendResponse({ ok: false, code: "ERR", error: emsg });
      }
    }
  })();

  return true;
});
