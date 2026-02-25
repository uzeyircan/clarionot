// background.js

/**
 * ✅ Amaç:
 * - Localhost'ta test ederken API_BASE = http://localhost:3000
 * - Prod'da kullanırken API_BASE = https://clarionot.com
 * - Token'ı ortama göre ayır (local token prod'u bozmasın)
 */

const PROD_BASE = "https://clarionot.com";
const LOCAL_BASE = "http://localhost:3000";

const API_PATH = "/api/clip";
const GROUPS_PATH = "/api/groups";

/**
 * Token key artık tek değil:
 * - localhost için: clarionot_token__local
 * - prod için:      clarionot_token__prod
 */
const TOKEN_KEY_PREFIX = "clarionot_token__";

function notify(title, message) {
  console.log(`[clarionot Clip] ${title}: ${message}`);
}

/**
 * ✅ Sekmenin URL'ine göre doğru API_BASE'i seç
 * - tabUrl localhost ise LOCAL_BASE
 * - değilse PROD_BASE
 */
function resolveApiBase(tabUrl) {
  try {
    if (!tabUrl) return PROD_BASE;
    const u = new URL(tabUrl);
    const isLocal =
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      // bazıları 0.0.0.0 ile açabiliyor
      u.hostname === "0.0.0.0";

    return isLocal ? LOCAL_BASE : PROD_BASE;
  } catch {
    // URL parse edilemezse prod'a düş (güvenli varsayılan)
    return PROD_BASE;
  }
}

/**
 * ✅ Seçilen API_BASE'e göre token key üret
 */
function tokenKeyForBase(apiBase) {
  return apiBase === LOCAL_BASE
    ? `${TOKEN_KEY_PREFIX}local`
    : `${TOKEN_KEY_PREFIX}prod`;
}

/**
 * ✅ Eski tek key (clarionot_token) kullandıysan migrate eder.
 * - Eskiden: clarionot_token
 * - Şimdi:  clarionot_token__local / clarionot_token__prod
 *
 * Mantık:
 * - Eğer yeni key boşsa ve eski key doluysa, eskiyi yeniye kopyala
 * - Eskiyi silmiyoruz (risk almayalım). İstersen sonra temizleriz.
 */
async function migrateOldTokenIfNeeded(apiBase) {
  const newKey = tokenKeyForBase(apiBase);
  const oldKey = "clarionot_token";

  const data = await chrome.storage.sync.get([newKey, oldKey]);

  const hasNew = !!data[newKey];
  const hasOld = !!data[oldKey];

  if (!hasNew && hasOld) {
    await chrome.storage.sync.set({ [newKey]: data[oldKey] });
    notify("Token migrate", `${oldKey} -> ${newKey}`);
  }
}

async function getToken(apiBase) {
  const key = tokenKeyForBase(apiBase);
  await migrateOldTokenIfNeeded(apiBase);

  const data = await chrome.storage.sync.get([key]);
  return data[key] || "";
}

async function clearToken(apiBase) {
  const key = tokenKeyForBase(apiBase);
  await chrome.storage.sync.remove([key]);
}

/**
 * ✅ API istekleri artık apiBase parametresiyle çalışıyor.
 * Böylece localde local API'ye, prod'da prod API'ye gider.
 */
async function clipRequest(apiBase, payload) {
  const token = await getToken(apiBase);
  if (!token) throw new Error("TOKEN_MISSING");

  const res = await fetch(`${apiBase}${API_PATH}`, {
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
    await clearToken(apiBase);
    throw new Error("TOKEN_INVALID");
  }

  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

async function fetchGroups(apiBase) {
  const token = await getToken(apiBase);
  if (!token) throw new Error("TOKEN_MISSING");

  const res = await fetch(`${apiBase}${GROUPS_PATH}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await res.json().catch(() => ({}));

  if (res.status === 401) {
    await clearToken(apiBase);
    throw new Error(json?.error || "TOKEN_INVALID");
  }

  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

  return Array.isArray(json?.groups) ? json.groups : [];
}

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
 * ✅ helper: tab'a mesaj gönder, receiver yoksa patlama
 */
function sendToTab(tabId, msg) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, msg, (resp) => {
      const lastErr = chrome.runtime.lastError;
      if (lastErr) {
        resolve({ ok: false, error: lastErr.message });
        return;
      }
      resolve(resp ?? { ok: true });
    });
  });
}

/**
 * ✅ Sağ tık menüsü tıklanınca:
 * 1) tabUrl'e bak -> apiBase seç
 * 2) token var mı? yoksa doğru connect sayfasını aç
 * 3) groups çek
 * 4) modal açmayı dene
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (!tab?.id) return;

    const tabUrl = tab.url || info.pageUrl || "";
    const apiBase = resolveApiBase(tabUrl);

    // 1) Token yoksa doğru connect'e git
    const token = await getToken(apiBase);
    if (!token) {
      chrome.tabs.create({ url: `${apiBase}/extension/connect` });
      return;
    }

    // 2) inferredType
    let inferredType = "link";
    if (info.menuItemId === "clarionot_save_selection") inferredType = "note";

    // 3) groups (dropdown)
    let groups = [];
    try {
      groups = await fetchGroups(apiBase);
    } catch {
      groups = [];
    }

    // 4) Modal açmayı dene
    const resp = await sendToTab(tab.id, {
      type: "CLARIONOT_OPEN_MODAL",
      payload: {
        inferredType,
        selection: info.selectionText || "",
        link: info.linkUrl || "",
        pageUrl: tabUrl,
        groups,
      },
    });

    // Receiver yoksa connect'e gitmek yanlış (token var).
    if (!resp?.ok) {
      notify("Modal açılamadı", resp?.error || "Receiving end does not exist.");
      return;
    }
  } catch (e) {
    const emsg = e?.message || String(e);

    // token yok/invalid ise connect'e yönlendir (hangi ortam? -> apiBase'i tab'dan çöz)
    if (emsg === "TOKEN_MISSING" || emsg === "TOKEN_INVALID") {
      const apiBase = resolveApiBase(tab?.url || "");
      chrome.tabs.create({ url: `${apiBase}/extension/connect` });
      return;
    }

    notify("Hata", emsg);
    console.error(e);
  }
});

/**
 * ✅ Background message listener:
 * - SAVE_TOKEN  (connect sayfasından gelir)
 * - CLARIONOT_GET_GROUPS (modal ister)
 * - CLARIONOT_SAVE_FROM_MODAL (modal kaydet der)
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const senderUrl = sender?.tab?.url || sender?.url || "";
  const apiBase = resolveApiBase(senderUrl);

  // ✅ bridge.js -> token kaydet
  if (msg?.type === "SAVE_TOKEN" && msg.token) {
    try {
      const key = tokenKeyForBase(apiBase);

      chrome.storage.sync.set({ [key]: msg.token }, () => {
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
        const groups = await fetchGroups(apiBase);
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
    return true;
  }

  // ✅ modal -> kaydet
  if (msg?.type === "CLARIONOT_SAVE_FROM_MODAL") {
    (async () => {
      try {
        const p = msg.payload || {};
        const inferredType = p.type || p.inferredType || "link";

        let apiPayload = null;

        if (inferredType === "note") {
          const content = String(
            p.content || p.note || p.selection || "",
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
            p.url || p.content || p.link || p.pageUrl || "",
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

        const out = await clipRequest(apiBase, apiPayload);
        sendResponse({ ok: true, id: out?.id });
      } catch (e) {
        const emsg = e?.message || String(e);

        if (emsg === "TOKEN_MISSING" || emsg === "TOKEN_INVALID") {
          await clearToken(apiBase);
          chrome.tabs.create({ url: `${apiBase}/extension/connect` });
          sendResponse({ ok: false, error: emsg });
          return;
        }

        notify("Hata", emsg);
        console.error(e);
        sendResponse({ ok: false, error: emsg });
      }
    })();

    return true;
  }

  return;
});
