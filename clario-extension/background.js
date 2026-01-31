// background.js

const API_PATH = "/api/clip";
const GROUPS_PATH = "/api/groups";
const TOKEN_KEY = "clarionot_token";

function notify(title, message) {
  console.log(`[clarionot Clip] ${title}: ${message}`);
}

// ✅ Tab URL’sine göre doğru API base seç
function resolveApiBase(tabUrl) {
  const u = String(tabUrl || "");

  // Local
  if (
    u.startsWith("http://localhost:3000") ||
    u.startsWith("http://localhost")
  ) {
    return "http://localhost:3000";
  }

  // Prod (www dahil)
  if (
    u.startsWith("https://clarionot.com") ||
    u.startsWith("https://www.clarionot.com")
  ) {
    return "https://clarionot.com";
  }

  // Safety default: prod
  return "https://clarionot.com";
}

async function getToken() {
  const data = await chrome.storage.sync.get([TOKEN_KEY]);
  return data[TOKEN_KEY] || "";
}

async function clearToken() {
  await chrome.storage.sync.remove([TOKEN_KEY]);
}

async function clipRequest(apiBase, payload) {
  const token = await getToken();
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

  if (res.status === 401) {
    await clearToken();
    throw new Error("TOKEN_INVALID");
  }

  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

async function fetchGroups(apiBase) {
  const token = await getToken();
  if (!token) throw new Error("TOKEN_MISSING");

  const res = await fetch(`${apiBase}${GROUPS_PATH}`, {
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

// ✅ helper: tab'a mesaj gönder, receiver yoksa patlama
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

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (!tab?.id) return;

    const apiBase = resolveApiBase(tab.url);

    // 1) Token yoksa connect’e git
    const token = await getToken();
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
        pageUrl: tab.url || info.pageUrl || "",
        groups,
      },
    });

    // ✅ Receiver yoksa connect’e gitmek YANLIŞ.
    // Token var; sadece o sayfada content script match etmiyor olabilir.
    if (!resp?.ok) {
      notify("Modal açılamadı", resp?.error || "Receiving end does not exist.");
      return;
    }
  } catch (e) {
    const emsg = e?.message || String(e);

    // burada apiBase bilmediğimiz için prod'a yönlendiriyoruz (safety)
    if (emsg === "TOKEN_MISSING" || emsg === "TOKEN_INVALID") {
      chrome.tabs.create({ url: `https://clarionot.com/extension/connect` });
      return;
    }

    notify("Hata", emsg);
    console.error(e);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // sender’dan doğru origin/base çıkar (modal ve connect page için kritik)
  const senderUrl = sender?.tab?.url || sender?.url || "";

  const apiBase = resolveApiBase(senderUrl);

  // ✅ bridge.js -> token kaydet
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
      return true;
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
