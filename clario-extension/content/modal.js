// content/modal.js
(() => {
  if (window.__CLARIONOT_MODAL_LOADED__) return;
  window.__CLARIONOT_MODAL_LOADED__ = true;

  const ROOT_ID = "clarionot-modal-root";
  console.log("[ClarioNot] content script loaded");

  // Tell the page we're alive.
  // NOTE: The app might add its message listener after this runs,
  // so we ALSO respond to CLARIONOT_PING below.
  const postReady = () => {
    try {
      window.postMessage(
        {
          source: "clarionot-extension",
          type: "EXTENSION_READY",
          version: chrome.runtime?.getManifest?.().version,
          ts: Date.now(),
        },
        window.location.origin,
      );
    } catch {
      // ignore
    }
  };

  postReady();

  // Dashboard uses a ping/pong check to decide "active in THIS tab".
  // Handle it here because this script runs on /dashboard.
  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    if (e.origin !== window.location.origin) return;

    const data = e.data ?? {};
    if (data?.type === "CLARIONOT_PING") {
      window.postMessage({ type: "CLARIONOT_PONG" }, window.location.origin);
      // Bonus: also re-announce readiness so the app can update UI.
      postReady();
    }
  });

  function escHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function parseTags(raw) {
    return String(raw || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  function removeExisting() {
    const existing = document.getElementById(ROOT_ID);
    if (existing) existing.remove();
  }

  function buildModalHtml(seed) {
    const defaultTitle = escHtml(seed.title || "");
    const defaultUrl = escHtml(seed.url || "");
    const defaultNote = escHtml(seed.note || "");
    const inferredType = escHtml(seed.inferredType || "link");

    return `
      <div id="${ROOT_ID}" style="
        position:fixed; inset:0; z-index:2147483647;
        background:rgba(0,0,0,0.55);
        display:flex; align-items:center; justify-content:center;
      ">
        <div style="
          width:440px; max-width:calc(100vw - 24px);
          background:#0a0a0a; color:#fff;
          border:1px solid rgba(255,255,255,0.12);
          border-radius:14px; padding:18px;
          font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;
          box-shadow:0 20px 60px rgba(0,0,0,0.6);
        ">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div style="font-weight:700; font-size:14px;">ClarioNot’a Kaydet</div>
            <button id="cn-x" style="
              border:0; background:transparent; color:#aaa;
              font-size:16px; cursor:pointer;
            ">✕</button>
          </div>

          <div style="margin-top:12px; font-size:12px; color:#9aa;">
            Tür: <b style="color:#ddd;">${
              inferredType === "note" ? "Not" : "Link"
            }</b>
          </div>

          <div style="margin-top:10px;">
            <div style="font-size:12px; color:#bbb; margin-bottom:6px;">Başlık</div>
            <input id="cn-title" value="${defaultTitle}" placeholder="Örn: React Hooks"
              style="width:100%; padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.12);
              background:#111; color:#fff; outline:none;" />
          </div>

          <div style="margin-top:10px;">
            <div style="font-size:12px; color:#bbb; margin-bottom:6px;">Açıklama / Not</div>
            <textarea id="cn-note" placeholder="Kısa açıklama..."
              style="width:100%; height:90px; padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.12);
              background:#111; color:#fff; outline:none; resize:vertical;"
            >${defaultNote}</textarea>
          </div>

          <div style="margin-top:10px;">
            <div style="font-size:12px; color:#bbb; margin-bottom:6px;">Link (opsiyonel)</div>
            <input id="cn-url" value="${defaultUrl}" placeholder="https://..."
              style="width:100%; padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.12);
              background:#111; color:#fff; outline:none;" />
            <div style="margin-top:6px; font-size:11px; color:#777;">
              Not kaydediyorsan link boş kalabilir.
            </div>
          </div>

          <div style="display:flex; gap:10px; margin-top:10px;">
            <div style="flex:1;">
              <div style="font-size:12px; color:#bbb; margin-bottom:6px;">Tags (virgülle)</div>
              <input id="cn-tags" placeholder="örn: react, ui, hooks"
                style="width:100%; padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.12);
                background:#111; color:#fff; outline:none;" />
            </div>
            <div style="width:170px;">
              <div style="font-size:12px; color:#bbb; margin-bottom:6px;">Group</div>
              <select id="cn-group"
                style="width:100%; padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.12);
                background:#111; color:#fff; outline:none;">
                <option value="">Inbox</option>
                <option value="" disabled>Yükleniyor…</option>
              </select>
            </div>
          </div>

          <div id="cn-error" style="margin-top:10px; font-size:12px; color:#ffb4b4; display:none;"></div>

          <div style="margin-top:14px; display:flex; gap:10px; justify-content:flex-end;">
            <button id="cn-cancel" style="
              padding:10px 12px; border-radius:10px;
              border:1px solid rgba(255,255,255,0.12);
              background:#0f0f0f; color:#ddd; cursor:pointer;
            ">İptal</button>
            <button id="cn-save" style="
              padding:10px 12px; border-radius:10px;
              border:1px solid rgba(255,255,255,0.12);
              background:#fff; color:#111; cursor:pointer; font-weight:700;
            ">Kaydet</button>
          </div>
        </div>
      </div>
    `;
  }

  async function populateGroups(selectEl) {
    try {
      const resp = await chrome.runtime.sendMessage({
        type: "CLARIONOT_GET_GROUPS",
      });
      selectEl.innerHTML = `<option value="">Inbox</option>`;

      if (!resp?.ok) {
        if (resp?.code === "TOKEN_MISSING" || resp?.code === "TOKEN_INVALID") {
          const opt = document.createElement("option");
          opt.value = "";
          opt.textContent = "Önce eklentiyi bağla";
          opt.disabled = true;
          selectEl.appendChild(opt);
          return;
        }

        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Gruplar alınamadı";
        opt.disabled = true;
        selectEl.appendChild(opt);
        return;
      }

      const groups = Array.isArray(resp.groups) ? resp.groups : [];
      for (const g of groups) {
        const opt = document.createElement("option");
        opt.value = String(g.id);
        opt.textContent = g.title || "Untitled";
        selectEl.appendChild(opt);
      }
    } catch {
      selectEl.innerHTML = `<option value="">Inbox</option><option disabled>Gruplar alınamadı</option>`;
    }
  }

  function showError(root, text) {
    const el = root.querySelector("#cn-error");
    if (!el) return;
    el.textContent = text;
    el.style.display = "block";
  }

  function openModal(payload) {
    removeExisting();

    const inferredType = payload?.inferredType || "link";
    const seedUrl = (payload?.link || payload?.pageUrl || "").trim();
    const seedNote = (payload?.selection || "").trim();

    const html = buildModalHtml({
      inferredType,
      url: inferredType === "link" ? seedUrl : "",
      note: seedNote,
    });

    document.body.insertAdjacentHTML("beforeend", html);

    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    const close = () => removeExisting();
    root.addEventListener("click", (e) => {
      if (e.target === root) close();
    });

    root.querySelector("#cn-x")?.addEventListener("click", close);
    root.querySelector("#cn-cancel")?.addEventListener("click", close);

    const groupSel = root.querySelector("#cn-group");
    if (groupSel) populateGroups(groupSel);

    root.querySelector("#cn-save")?.addEventListener("click", () => {
      const title = root.querySelector("#cn-title")?.value || "";
      const note = root.querySelector("#cn-note")?.value || "";
      const url = root.querySelector("#cn-url")?.value || "";
      const tagsRaw = root.querySelector("#cn-tags")?.value || "";
      const group_id = root.querySelector("#cn-group")?.value || "";

      const tags = parseTags(tagsRaw);

      const out = {
        inferredType,
        title,
        note,
        tags,
        group_id: group_id || null,
        url,
        selection: payload?.selection || "",
        pageUrl: payload?.pageUrl || "",
        link: payload?.link || "",
        content: inferredType === "note" ? note : url,
      };

      chrome.runtime.sendMessage({
        type: "CLARIONOT_SAVE_FROM_MODAL",
        payload: out,
      });
      close();
    });

    const input = root.querySelector("#cn-title");
    if (input && typeof input.focus === "function") input.focus();
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "CLARIONOT_OPEN_MODAL") return;
    openModal(msg.payload || {});
  });
})();
