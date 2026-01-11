const API_BASE = "https://clarionot.com"; // prod domain
const API_PATH = "/api/clip";
const GROUPS_PATH = "/api/groups";
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

// ✅ Groups çek (modal dropdown için)
async function fetchGroups() {
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
    throw new Error(json?.error || "TOKEN_INVALID");
  }

  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

  // beklenen format: { groups: [{id,title}, ...] }
  return Array.isArray(json?.groups) ? json.groups : [];
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

/**
 * ✅ SADECE 1 tane onClicked listener:
 * - Direkt kaydetmeyi kaldırdık (modal)
 * - Sağ tık -> grupları çek -> modal aç
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (!tab?.id) return;

    // Token yoksa connect’e
    const token = await getToken();
    if (!token) {
      chrome.tabs.create({ url: `${API_BASE}/extension/connect` });
      return;
    }

    // Hangi menüden geldiğine göre type belirleyelim
    let inferredType = "link";
    if (info.menuItemId === "clarionot_save_selection") inferredType = "note";

    // ✅ Grupları çek (dropdown için)
    let groups = [];
    try {
      groups = await fetchGroups();
    } catch {
      groups = [];
    }

    chrome.tabs.sendMessage(tab.id, {
      type: "CLARIONOT_OPEN_MODAL",
      payload: {
        inferredType,
        selection: info.selectionText || "",
        link: info.linkUrl || "",
        pageUrl: tab.url || info.pageUrl || "",
        groups,
      },
    });
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
 * ✅ Tek onMessage listener (daha sağlam)
 * - SAVE_TOKEN
 * - CLARIONOT_SAVE_FROM_MODAL
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // ✅ bridge.js -> token kaydet (GARANTİLİ response + lastError)
  if (msg?.type === "SAVE_TOKEN" && msg.token) {
    try {
      chrome.storage.sync.set({ [TOKEN_KEY]: msg.token }, () => {
        const lastErr = chrome.runtime.lastError;
        if (lastErr) {
          sendResponse({ ok: false, error: lastErr.message });
        } else {
          sendResponse({ ok: true });
        }
      });
      return true; // async response
    } catch (e) {
      sendResponse({ ok: false, error: e?.message || String(e) });
      return;
    }
  }

  // ✅ modal -> groups isteği
  if (msg?.type === "CLARIONOT_GET_GROUPS") {
    (async () => {
      try {
        const groups = await fetchGroups();
        sendResponse({ ok: true, groups });
      } catch (e) {
        const emsg = e?.message || String(e);

        if (emsg === "TOKEN_MISSING" || emsg === "TOKEN_INVALID") {
          sendResponse({ ok: false, code: emsg });
          return;
        }

        sendResponse({ ok: false, code: "GROUPS_FETCH_FAILED", error: emsg });
      }
    })();

    return true; // async sendResponse
  }

  // ✅ modal -> kaydet
  if (msg?.type === "CLARIONOT_SAVE_FROM_MODAL") {
    (async () => {
      try {
        const p = msg.payload || {};

        // Modal bazen type gönderiyor bazen inferredType
        const inferredType = p.type || p.inferredType || "link";

        let apiPayload = null;

        if (inferredType === "note") {
          const content = String(
            p.content || p.note || p.selection || ""
          ).trim();
          if (!content) throw new Error("Not içeriği boş.");

          apiPayload = {
            type: "note",
            title: String(p.title || "").trim(),
            content,
            tags: Array.isArray(p.tags) ? p.tags : [],
            group_id: p.group_id ?? null,
          };
        } else {
          const url = String(
            p.url || p.content || p.link || p.pageUrl || ""
          ).trim();
          if (!url) throw new Error("URL bulunamadı.");

          apiPayload = {
            type: "link",
            title: String(p.title || "").trim(),
            url,
            tags: Array.isArray(p.tags) ? p.tags : [],
            group_id: p.group_id ?? null,
            note: String(p.note || "").trim(),
          };
        }

        console.log("[CLARIONOT] apiPayload", apiPayload);
        const out = await clipRequest(apiPayload);
        notify("Kaydedildi", `id: ${out?.id || "-"}`);

        sendResponse({ ok: true, id: out?.id });
      } catch (e) {
        const emsg = e?.message || String(e);

        if (emsg === "TOKEN_MISSING" || emsg === "TOKEN_INVALID") {
          chrome.tabs.create({ url: `${API_BASE}/extension/connect` });
          sendResponse({ ok: false, error: emsg });
          return;
        }

        notify("Hata", emsg);
        console.error(e);
        sendResponse({ ok: false, error: emsg });
      }
    })();

    return true; // async sendResponse
  }

  return;
});
