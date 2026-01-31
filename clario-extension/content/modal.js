// content/modal.js
(() => {
  if (window.__CLARIONOT_MODAL_LOADED__) return;
  window.__CLARIONOT_MODAL_LOADED__ = true;

  const ROOT_ID = "clarionot-modal-root";
  const STYLE_ID = "clarionot-modal-style";

  console.log("[ClarioNot] content script loaded");

  // Tell the page we're alive (for dashboard badge).
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

  // Dashboard uses ping/pong to decide "active in THIS tab".
  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    if (e.origin !== window.location.origin) return;

    const data = e.data ?? {};
    if (data?.type === "CLARIONOT_PING") {
      window.postMessage({ type: "CLARIONOT_PONG" }, window.location.origin);
      postReady(); // re-announce
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

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const css = `
#${ROOT_ID}{
  position:fixed; inset:0; z-index:2147483647;
  display:flex; align-items:center; justify-content:center;
  background: rgba(0,0,0,0.58);
  backdrop-filter: blur(6px);
}
#${ROOT_ID} *{ box-sizing:border-box; }
.cn-modal{
  width: 520px;
  max-width: calc(100vw - 24px);
  border-radius: 16px;
  background: rgba(15,15,15,0.95);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 24px 80px rgba(0,0,0,0.65);
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
  overflow:hidden;
}
.cn-head{
  display:flex; align-items:center; justify-content:space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.cn-title{
  font-weight: 700;
  font-size: 13px;
  letter-spacing: .2px;
}
.cn-x{
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.75);
  width: 30px; height: 30px;
  border-radius: 10px;
  cursor:pointer;
}
.cn-x:hover{ background: rgba(255,255,255,0.08); color:#fff; }

.cn-body{ padding: 14px 16px 16px; }

.cn-chiprow{
  display:flex; align-items:center; justify-content:space-between;
  margin-bottom: 10px;
  gap: 10px;
}
.cn-chip{
  display:inline-flex; align-items:center; gap: 8px;
  font-size: 11px;
  color: rgba(255,255,255,0.70);
}
.cn-pill{
  display:inline-flex; align-items:center;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.85);
  font-weight: 600;
}

.cn-grid{
  display:grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
.cn-row2{
  display:grid;
  grid-template-columns: 1fr 190px;
  gap: 10px;
}
@media (max-width: 520px){
  .cn-row2{ grid-template-columns: 1fr; }
}

.cn-label{
  font-size: 11px;
  color: rgba(255,255,255,0.70);
  margin: 0 0 6px;
}
.cn-input, .cn-textarea, .cn-select{
  width:100%;
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  color: #fff;
  outline:none;
}
.cn-textarea{ min-height: 92px; resize: vertical; }
.cn-input::placeholder, .cn-textarea::placeholder{ color: rgba(255,255,255,0.30); }

.cn-input:focus, .cn-textarea:focus, .cn-select:focus{
  border-color: rgba(16,185,129,0.45);
  box-shadow: 0 0 0 3px rgba(16,185,129,0.18);
}

.cn-help{
  font-size: 11px;
  color: rgba(255,255,255,0.38);
  margin-top: 6px;
}

.cn-error{
  display:none;
  margin-top: 10px;
  font-size: 12px;
  color: rgba(255,170,170,0.95);
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,80,80,0.20);
  background: rgba(255,0,0,0.08);
}

.cn-foot{
  display:flex;
  gap: 10px;
  justify-content:flex-end;
  padding-top: 12px;
}
.cn-btn{
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.90);
  cursor:pointer;
  font-weight: 600;
}
.cn-btn:hover{ background: rgba(255,255,255,0.08); color:#fff; }
.cn-btn-primary{
  background: #fff;
  color: #111;
  border-color: rgba(0,0,0,0.10);
  font-weight: 800;
}
.cn-btn-primary:hover{ filter: brightness(0.96); }

.cn-btn[disabled]{
  opacity: 0.55;
  cursor: not-allowed;
}

.cn-toast{
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 2147483647;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(16,185,129,0.25);
  background: rgba(0,0,0,0.65);
  color: rgba(236,253,245,0.95);
  font-size: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.55);
}
    `.trim();

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.documentElement.appendChild(style);
  }

  function toast(text) {
    try {
      const el = document.createElement("div");
      el.className = "cn-toast";
      el.textContent = text;
      document.body.appendChild(el);
      window.setTimeout(() => el.remove(), 1400);
    } catch {
      // ignore
    }
  }

  function buildModalHtml(seed) {
    const inferredType = escHtml(seed.inferredType || "link");
    const defaultTitle = escHtml(seed.title || "");
    const defaultUrl = escHtml(seed.url || "");
    const defaultNote = escHtml(seed.note || "");

    return `
      <div id="${ROOT_ID}" role="dialog" aria-modal="true">
        <div class="cn-modal">
          <div class="cn-head">
            <div class="cn-title">ClarioNot’a Kaydet</div>
            <button class="cn-x" id="cn-x" title="Kapat (Esc)">✕</button>
          </div>

          <div class="cn-body">
            <div class="cn-chiprow">
              <div class="cn-chip">
                Tür:
                <span class="cn-pill" id="cn-type-pill">${
                  inferredType === "note" ? "Not" : "Link"
                }</span>
              </div>
              <div class="cn-chip" style="opacity:.75">
                <span class="cn-pill">⌘/Ctrl + Enter = Kaydet</span>
              </div>
            </div>

            <div class="cn-grid">
              <div>
                <div class="cn-label">Başlık</div>
                <input id="cn-title" class="cn-input" value="${defaultTitle}" placeholder="Örn: React Hooks" />
              </div>

              <div>
                <div class="cn-label">Açıklama / Not</div>
                <textarea id="cn-note" class="cn-textarea" placeholder="Kısa açıklama...">${defaultNote}</textarea>
              </div>

              <div id="cn-url-wrap">
                <div class="cn-label">Link (opsiyonel)</div>
                <input id="cn-url" class="cn-input" value="${defaultUrl}" placeholder="https://..." />
                <div class="cn-help">Not kaydediyorsan link boş kalabilir.</div>
              </div>

              <div class="cn-row2">
                <div>
                  <div class="cn-label">Tags (virgülle)</div>
                  <input id="cn-tags" class="cn-input" placeholder="örn: react, ui, hooks" />
                </div>

                <div>
                  <div class="cn-label">Group</div>
                  <select id="cn-group" class="cn-select">
                    <option value="">Inbox</option>
                    <option value="" disabled>Yükleniyor…</option>
                  </select>
                </div>
              </div>

              <div id="cn-error" class="cn-error"></div>

              <div class="cn-foot">
                <button id="cn-cancel" class="cn-btn">İptal</button>
                <button id="cn-save" class="cn-btn cn-btn-primary">Kaydet</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function populateGroups(selectEl, payloadGroups) {
    const setFallback = (text) => {
      selectEl.innerHTML = `<option value="">Inbox</option>`;
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = text;
      opt.disabled = true;
      selectEl.appendChild(opt);
    };

    try {
      // 1) If background already passed groups, use it.
      if (Array.isArray(payloadGroups)) {
        selectEl.innerHTML = `<option value="">Inbox</option>`;
        for (const g of payloadGroups) {
          const opt = document.createElement("option");
          opt.value = String(g.id);
          opt.textContent = g.title || "Untitled";
          selectEl.appendChild(opt);
        }
        return;
      }

      // 2) Otherwise ask background.
      const resp = await chrome.runtime.sendMessage({
        type: "CLARIONOT_GET_GROUPS",
      });
      selectEl.innerHTML = `<option value="">Inbox</option>`;

      if (!resp?.ok) {
        if (resp?.code === "TOKEN_MISSING" || resp?.code === "TOKEN_INVALID") {
          setFallback("Önce eklentiyi bağla");
          return;
        }
        setFallback("Gruplar alınamadı");
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
      setFallback("Gruplar alınamadı");
    }
  }

  function setError(root, text) {
    const el = root.querySelector("#cn-error");
    if (!el) return;
    el.textContent = text;
    el.style.display = "block";
  }

  function clearError(root) {
    const el = root.querySelector("#cn-error");
    if (!el) return;
    el.textContent = "";
    el.style.display = "none";
  }

  function tryPrefillTitle(inferredType, payload) {
    const sel = String(payload?.selection || "").trim();
    if (sel) {
      const clean = sel.replace(/\s+/g, " ").slice(0, 80);
      return inferredType === "note" ? clean : clean;
    }
    const t = String(document?.title || "").trim();
    if (t) return t.slice(0, 120);
    return "";
  }

  function openModal(payload) {
    ensureStyles();
    removeExisting();

    const inferredType = payload?.inferredType || "link";

    const seedUrl = String(payload?.link || payload?.pageUrl || "").trim();
    const seedNote = String(payload?.selection || "").trim();

    const seedTitle = tryPrefillTitle(inferredType, payload);

    const html = buildModalHtml({
      inferredType,
      title: seedTitle,
      url: inferredType === "link" ? seedUrl : "",
      note: seedNote,
    });

    document.body.insertAdjacentHTML("beforeend", html);

    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    const close = () => removeExisting();

    // overlay click
    root.addEventListener("click", (e) => {
      if (e.target === root) close();
    });

    // esc close + Ctrl/Cmd+Enter save
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        root.querySelector("#cn-save")?.click?.();
      }
    };
    document.addEventListener("keydown", onKey, { capture: true });

    const cleanup = () => {
      document.removeEventListener("keydown", onKey, { capture: true });
    };

    // make sure cleanup runs
    const origRemove = removeExisting;
    removeExisting = () => {
      cleanup();
      origRemove();
      removeExisting = origRemove;
    };

    root.querySelector("#cn-x")?.addEventListener("click", close);
    root.querySelector("#cn-cancel")?.addEventListener("click", close);

    // URL visibility for note
    const urlWrap = root.querySelector("#cn-url-wrap");
    if (urlWrap && inferredType === "note") {
      urlWrap.style.display = "none";
    }

    // groups
    const groupSel = root.querySelector("#cn-group");
    if (groupSel) populateGroups(groupSel, payload?.groups);

    const btnSave = root.querySelector("#cn-save");
    const btnCancel = root.querySelector("#cn-cancel");

    const setLoading = (on) => {
      if (btnSave) btnSave.disabled = !!on;
      if (btnCancel) btnCancel.disabled = !!on;
      if (btnSave) btnSave.textContent = on ? "Kaydediliyor…" : "Kaydet";
    };

    const doSave = async () => {
      clearError(root);
      setLoading(true);

      const title = root.querySelector("#cn-title")?.value || "";
      const note = root.querySelector("#cn-note")?.value || "";
      const url = root.querySelector("#cn-url")?.value || "";
      const tagsRaw = root.querySelector("#cn-tags")?.value || "";
      const group_id = root.querySelector("#cn-group")?.value || "";

      const tags = parseTags(tagsRaw);

      // Basic validation
      if (inferredType === "note") {
        if (!String(note).trim() && !String(title).trim()) {
          setLoading(false);
          setError(root, "Not için en az başlık ya da içerik gir.");
          return;
        }
      } else {
        const u = String(url).trim();
        if (!u && !String(title).trim()) {
          setLoading(false);
          setError(root, "Link için en az URL ya da başlık gir.");
          return;
        }
      }

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

      try {
        const resp = await chrome.runtime.sendMessage({
          type: "CLARIONOT_SAVE_FROM_MODAL",
          payload: out,
        });

        if (!resp?.ok) {
          setLoading(false);
          setError(root, resp?.error || "Kaydedilemedi.");
          return;
        }

        toast("Kaydedildi ✅");
        window.setTimeout(() => close(), 450);
      } catch (e) {
        const emsg = e?.message || String(e);
        setLoading(false);
        setError(root, emsg || "Kaydedilemedi.");
      }
    };

    btnSave?.addEventListener("click", doSave);

    // Tags: Enter -> add comma
    const tagsInput = root.querySelector("#cn-tags");
    tagsInput?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const v = String(tagsInput.value || "").trim();
      if (!v) return;
      if (!v.endsWith(",")) tagsInput.value = v + ", ";
    });

    // autofocus
    const input = root.querySelector("#cn-title");
    if (input && typeof input.focus === "function") input.focus();
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "CLARIONOT_OPEN_MODAL") {
      openModal(msg.payload || {});
      return;
    }

    // ✅ background -> "saved" sinyali
    if (msg?.type === "CLARIONOT_SAVED") {
      toast("Kaydedildi ✅");
      try {
        window.postMessage(
          { type: "CLARIONOT_SAVED_UI" },
          window.location.origin,
        );
      } catch {}
      return;
    }
  });
})();
