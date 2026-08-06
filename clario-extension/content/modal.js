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
  padding: 16px;
}
#${ROOT_ID} *{ box-sizing:border-box; }
.cn-modal{
  width: 520px;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - 32px);
  max-height: calc(100dvh - 32px);
  border-radius: 16px;
  background: rgba(15,15,15,0.95);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 24px 80px rgba(0,0,0,0.65);
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
  display:flex;
  flex-direction:column;
  overflow:hidden;
}
@media (max-width: 480px), (max-height: 700px){
  .cn-modal{
    max-height: calc(100vh - 16px);
    max-height: calc(100dvh - 16px);
  }
}
.cn-head{
  display:flex; align-items:center; justify-content:space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
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

.cn-body{
  padding: 14px 16px 16px;
  overflow-y: auto;
  min-height: 0;
  flex: 1 1 auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.22) transparent;
}
.cn-body::-webkit-scrollbar{ width: 8px; }
.cn-body::-webkit-scrollbar-track{ background: transparent; }
.cn-body::-webkit-scrollbar-thumb{
  background: rgba(255,255,255,0.18);
  border-radius: 8px;
}
.cn-body::-webkit-scrollbar-thumb:hover{ background: rgba(255,255,255,0.28); }

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

.cn-recall{
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  border-radius: 14px;
  padding: 12px;
}
.cn-recall-head{
  display:flex; align-items:center; justify-content:space-between;
  gap: 10px;
}
.cn-recall-title{
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.42);
}
.cn-recall-sub{
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255,255,255,0.56);
}
.cn-recall-list{
  margin-top: 10px;
  display: grid;
  gap: 8px;
  max-height: 300px;
  max-height: clamp(180px, 30vh, 300px);
  max-height: clamp(180px, 30dvh, 300px);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.22) transparent;
}
.cn-recall-list::-webkit-scrollbar{ width: 8px; }
.cn-recall-list::-webkit-scrollbar-track{ background: transparent; }
.cn-recall-list::-webkit-scrollbar-thumb{
  background: rgba(255,255,255,0.18);
  border-radius: 8px;
}
.cn-recall-list::-webkit-scrollbar-thumb:hover{ background: rgba(255,255,255,0.28); }
.cn-recall-item{
  display:block;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  background: rgba(0,0,0,0.18);
  padding: 10px;
  text-decoration: none;
}
.cn-recall-item:hover{ background: rgba(255,255,255,0.05); }
.cn-recall-meta{
  display:flex; flex-wrap:wrap; gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.38);
}
.cn-recall-name{
  margin-top: 6px;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.92);
}
.cn-recall-desc{
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(255,255,255,0.58);
}
.cn-recall-tags{
  display:flex; flex-wrap:wrap; gap: 6px;
  margin-top: 8px;
}
.cn-recall-tag{
  display:inline-flex; align-items:center;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.72);
  font-size: 10px;
  font-weight: 600;
}
.cn-recall-actions{
  display:flex; flex-wrap:wrap; gap: 8px;
  margin-top: 10px;
}
.cn-recall-btn{
  display:inline-flex; align-items:center;
  padding: 6px 9px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.82);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.cn-recall-btn:hover{
  background: rgba(255,255,255,0.08);
}
.cn-recall-empty, .cn-recall-loading{
  margin-top: 10px;
  font-size: 12px;
  color: rgba(255,255,255,0.48);
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
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
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

              <div class="cn-recall" id="cn-recall">
                <div class="cn-recall-head">
                  <div>
                    <div class="cn-recall-title">Context Recall</div>
                    <div class="cn-recall-sub">Bu sayfayla ilgili eski kayıtlar burada görünür.</div>
                  </div>
                </div>
                <div id="cn-recall-loading" class="cn-recall-loading">İlgili kayıtlar aranıyor...</div>
                <div id="cn-recall-list" class="cn-recall-list" style="display:none"></div>
                <div id="cn-recall-empty" class="cn-recall-empty" style="display:none">Bu sayfa için geri çağrılan eski kayıt yok.</div>
              </div>

              <div id="cn-error" class="cn-error"></div>
            </div>
          </div>

          <div class="cn-foot">
            <button id="cn-cancel" class="cn-btn">İptal</button>
            <button id="cn-save" class="cn-btn cn-btn-primary">Kaydet</button>
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

  async function populateContextRecall(root, payload) {
    const loadingEl = root.querySelector("#cn-recall-loading");
    const listEl = root.querySelector("#cn-recall-list");
    const emptyEl = root.querySelector("#cn-recall-empty");

    const showEmpty = (text) => {
      if (loadingEl) loadingEl.style.display = "none";
      if (listEl) {
        listEl.innerHTML = "";
        listEl.style.display = "none";
      }
      if (emptyEl) {
        emptyEl.textContent = text;
        emptyEl.style.display = "block";
      }
    };

    try {
      const resp = await chrome.runtime.sendMessage({
        type: "CLARIONOT_GET_CONTEXT_RECALL",
        payload: {
          pageUrl: payload?.pageUrl || payload?.link || "",
          title: tryPrefillTitle(payload?.inferredType || "link", payload),
          selection: payload?.selection || "",
        },
      });

      if (!resp?.ok) {
        showEmpty("İlgili kayıtlar şu anda alınamıyor.");
        return;
      }

      const recall = Array.isArray(resp.recall) ? resp.recall : [];
      const apiBase = String(resp.apiBase || "").trim();

      if (!recall.length) {
        showEmpty("Bu sayfa için geri çağrılan eski kayıt yok.");
        return;
      }

      const cards = recall
        .map((item) => {
          const tags = Array.isArray(item.tags) ? item.tags.slice(0, 3) : [];
          const summary = String(item.summary || "").trim();
          const allTags = Array.isArray(item.tags)
            ? item.tags
                .map((tag) => String(tag || "").trim())
                .filter(Boolean)
                .join(", ")
            : "";
          const metaBits = [
            item.type === "link" ? "Link" : "Not",
            item.age_days === 0 ? "Bugün" : `${item.age_days} gün`,
          ];

          if (item.matched_hostname && item.hostname) {
            metaBits.push(item.hostname);
          }

          return `
            <div class="cn-recall-item">
              <a href="${apiBase}/dashboard?focus=${item.id}&view=forgotten" target="_blank" rel="noreferrer">
                <div class="cn-recall-meta">${metaBits.map(escHtml).join(" · ")}</div>
                <div class="cn-recall-name">${escHtml(item.title || "Basliksiz kayit")}</div>
                ${
                  summary
                    ? `<div class="cn-recall-desc">${escHtml(summary)}</div>`
                    : ""
                }
                ${
                  tags.length
                    ? `<div class="cn-recall-tags">${tags
                        .map((tag) => `<span class="cn-recall-tag">#${escHtml(tag)}</span>`)
                        .join("")}</div>`
                    : ""
                }
              </a>
              <div class="cn-recall-actions">
                ${
                  allTags
                    ? `<button type="button" class="cn-recall-btn" data-recall-tags="${escHtml(allTags)}">Tag'leri al</button>`
                    : ""
                }
                ${
                  item.group_id
                    ? `<button type="button" class="cn-recall-btn" data-recall-group-id="${escHtml(item.group_id)}" data-recall-group-title="${escHtml(item.group_title || "Adsiz grup")}">Ayni gruba al</button>`
                    : ""
                }
              </div>
            </div>
          `;
        })
        .join("");

      if (loadingEl) loadingEl.style.display = "none";
      if (emptyEl) emptyEl.style.display = "none";
      if (listEl) {
        listEl.innerHTML = cards;
        listEl.style.display = "grid";
        listEl.onclick = (event) => {
          const target =
            event.target instanceof Element ? event.target.closest(".cn-recall-btn") : null;
          if (!target) return;

          const tagsValue = String(target.getAttribute("data-recall-tags") || "").trim();
          if (tagsValue) {
            event.preventDefault();
            const tagsInput = root.querySelector("#cn-tags");
            if (!tagsInput) return;
            tagsInput.value = tagsValue;
            toast("Etiketler alindi.");
            return;
          }

          const groupId = String(target.getAttribute("data-recall-group-id") || "").trim();
          if (!groupId) return;

          event.preventDefault();
          const groupTitle =
            String(target.getAttribute("data-recall-group-title") || "").trim() || "Grup";
          const groupSelect = root.querySelector("#cn-group");
          if (!groupSelect) return;

          let option = Array.from(groupSelect.options).find((entry) => entry.value === groupId);
          if (!option) {
            option = document.createElement("option");
            option.value = groupId;
            option.textContent = groupTitle;
            groupSelect.appendChild(option);
          }

          groupSelect.value = groupId;
          toast("Grup secildi.");
        };
      }
    } catch {
      showEmpty("İlgili kayıtlar şu anda alınamıyor.");
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

    // lock background page scroll while modal is open
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const prevHtmlOverflow = htmlEl.style.overflow;
    const prevBodyOverflow = bodyEl.style.overflow;
    htmlEl.style.overflow = "hidden";
    bodyEl.style.overflow = "hidden";
    const unlockScroll = () => {
      htmlEl.style.overflow = prevHtmlOverflow;
      bodyEl.style.overflow = prevBodyOverflow;
    };

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
      unlockScroll();
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
    populateContextRecall(root, payload);

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
