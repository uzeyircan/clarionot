const API_BASE = "https://clasio.netlify.app"; // prod domain
const API_PATH = "/api/clip";

function notify(title, message) {
  // Basit: console log. İstersen chrome.notifications ekleriz.
  console.log(`[Clario Clip] ${title}: ${message}`);
}

async function getSettings() {
  const data = await chrome.storage.sync.get(["clarioToken"]);
  return { token: data.clarioToken || "" };
}

async function clipRequest(payload) {
  const { token } = await getSettings();
  if (!token) throw new Error("Token yok. Extension Options’tan token gir.");

  const res = await fetch(`${API_BASE}${API_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
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

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "clario_root",
    title: "Clario’ya Kaydet",
    contexts: ["page", "link", "selection"],
  });

  chrome.contextMenus.create({
    id: "clario_save_link",
    parentId: "clario_root",
    title: "Link olarak kaydet",
    contexts: ["page", "link"],
  });

  chrome.contextMenus.create({
    id: "clario_save_note",
    parentId: "clario_root",
    title: "Not olarak kaydet (seçili metin)",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === "clario_save_link") {
      const url = info.linkUrl || info.pageUrl || "";
      if (!url) throw new Error("URL bulunamadı.");

      const payload = {
        type: "link",
        url,
        title: buildTitleFromUrl(url),
        note: "",
        tags: [],
      };

      const out = await clipRequest(payload);
      notify("Kaydedildi", `id: ${out.id}`);
      return;
    }

    if (info.menuItemId === "clario_save_note") {
      const text = (info.selectionText || "").trim();
      if (!text) throw new Error("Seçili metin yok.");

      const title = text.split("\n")[0].slice(0, 60);

      const payload = {
        type: "note",
        title,
        content: text,
        tags: [],
      };

      const out = await clipRequest(payload);
      notify("Not kaydedildi", `id: ${out.id}`);
      return;
    }
  } catch (e) {
    notify("Hata", e?.message || String(e));
    console.error(e);
  }
});
