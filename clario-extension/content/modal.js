// content/modal.js
(() => {
  if (window.__CLARIONOT_MODAL_LOADED__) return;
  window.__CLARIONOT_MODAL_LOADED__ = true;

  const HOST_ID = "clarionot-modal-host";
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
    // sadece aynı sayfanın kendi mesajları
    if (e.source !== window) return;

    const data = e.data ?? {};
    if (data?.type === "CLARIONOT_PING") {
      // targetOrigin'i '*' yapıyoruz ki dashboard'un origin check’i yüzünden kaçmasın
      window.postMessage({ type: "CLARIONOT_PONG" }, "*");

      // UI'yı güncellemesi için tekrar READY de bas
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

  // =======
  // Shadow DOM modal (CSS isolated from websites like YouTube)
  // =======

  function removeExisting() {
    const existing = document.getElementById(HOST_ID);
    if (existing) existing.remove();
    // also unlock scroll if we locked
    try {
      document.documentElement.style.removeProperty("overflow");
    } catch {}
  }

  function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (host) return host;

    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.position = "fixed";
    host.style.inset = "0";
    host.style.zIndex = "2147483647";
    host.style.display = "none"; // open -> block
    host.style.pointerEvents = "auto";
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }

      .backdrop {
        position: fixed; inset: 0;
        background: rgba(0,0,0,.55);
        backdrop-filter: blur(7px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
      }

      .card {
        width: min(540px, 100%);
        background: #0b0b0f;
        color: rgba(255,255,255,.92);
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 16px;
        box-shadow: 0 30px 90px rgba(0,0,0,.65);
        overflow: hidden;
      }

      .head {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }

      .title {
        font-size: 14px;
        font-weight: 800;
        color: rgba(255,255,255,.92);
        letter-spacing: .2px;
      }

      .close {
        appearance: none;
        border: 0;
        background: transparent;
        color: rgba(255,255,255,.7);
        width: 34px; height: 34px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 16px;
      }
      .close:hover { background: rgba(255,255,255,.08); color: rgba(255,255,255,.95); }

      .body {
        padding: 16px;
        display: grid;
        gap: 12px;
      }

      .row { display: grid; gap: 6px; }
      .label { font-size: 12px; color: rgba(255,255,255,.62); }

      .input, .textarea, .select {
        width: 100%;
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.10);
        color: rgba(255,255,255,.92);
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 13px;
        outline: none;
      }

      .textarea { min-height: 96px; resize: vertical; }

      .input:focus, .textarea:focus, .select:focus {
        border-color: rgba(16,185,129,.55);
        box-shadow: 0 0 0 4px rgba(16,185,129,.18);
      }

      .hint {
        font-size: 12px;
        color: rgba(255,255,255,.50);
      }

      .grid2 {
        display: grid;
        grid-template-columns: 1fr 200px;
        gap: 10px;
      }
      @media (max-width: 520px) {
        .grid2 { grid-template-columns: 1fr; }
      }

      .error {
        display: none;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(244,63,94,.12);
        border: 1px solid rgba(244,63,94,.25);
        color: rgba(255,255,255,.90);
        font-size: 12px;
      }

      .foot {
        padding: 14px 16px;
        border-top: 1px solid rgba(255,255,255,.08);
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }

      .btn {
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.06);
        color: rgba(255,255,255,.90);
        padding: 9px 12px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        user-select: none;
      }
      .btn:hover { background: rgba(255,255,255,.10); }
      .btnPrimary {
        border-color: rgba(16,185,129,.35);
        background: rgba(16,185,129,.18);
      }
      .btnPrimary:hover { background: rgba(16,185,129,.25); }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(245, 158, 11, .12);
        border: 1px solid rgba(245, 158, 11, .25);
        color: rgba(255,255,255,.88);
        font-size: 12px;
      }
    `;
    shadow.appendChild(style);

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="backdrop" data-cn="backdrop" role="dialog" aria-modal="true">
        <div class="card">
          <div class="head">
            <div class="title">ClarioNot’a Kaydet</div>
            <button class="close" data-cn="close" aria-label="Kapat">✕</button>
          </div>

          <div class="body">
            <div class="row">
              <div class="label">Tür</div>
              <select class="select" data-cn="type">
                <option value="link">Link</option>
                <option value="note">Not</option>
              </select>
            </div>

            <div class="row">
              <div class="label">Başlık</div>
              <input class="input" data-cn="title" placeholder="Örn: React Hooks" />
            </div>

            <div class="row">
              <div class="label">Açıklama / Not</div>
              <textarea class="textarea" data-cn="note" placeholder="Kısa açıklama…"></textarea>
            </div>

            <div class="row" data-cn="urlSection">
              <div class="label">Link (opsiyonel)</div>
              <input class="input" data-cn="url" placeholder="https://..." />
              <div class="hint">Not kaydediyorsan link boş kalabilir.</div>
            </div>

            <div class="grid2">
              <div class="row">
                <div class="label">Tags (virgülle)</div>
                <input class="input" data-cn="tags" placeholder="örn: react, ui, hooks" />
              </div>
              <div class="row">
                <div class="label">Group</div>
                <select class="select" data-cn="group">
                  <option value="">Inbox</option>
                  <option value="" disabled>Yükleniyor…</option>
                </select>
              </div>
            </div>

            <div class="error" data-cn="error"></div>
          </div>

          <div class="foot">
            <button class="btn" data-cn="cancel">İptal</button>
            <button class="btn btnPrimary" data-cn="save">Kaydet</button>
          </div>
        </div>
      </div>
    `;
    shadow.appendChild(wrap);

    return host;
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

  function showError(shadowRoot, text) {
    const el = shadowRoot.querySelector('[data-cn="error"]');
    if (!el) return;
    el.textContent = text;
    el.style.display = "block";
  }

  function openModal(payload) {
    // reset everything
    removeExisting();

    const host = ensureHost();
    const shadow = host.shadowRoot;
    if (!shadow) return;

    // lock scroll (optional but feels premium)
    try {
      document.documentElement.style.overflow = "hidden";
    } catch {}

    const inferredType = payload?.inferredType || "link";
    const seedUrl = (payload?.link || payload?.pageUrl || "").trim();
    const seedNote = (payload?.selection || "").trim();

    // elements
    const backdrop = shadow.querySelector('[data-cn="backdrop"]');
    const btnClose = shadow.querySelector('[data-cn="close"]');
    const btnCancel = shadow.querySelector('[data-cn="cancel"]');
    const btnSave = shadow.querySelector('[data-cn="save"]');

    const typeSel = shadow.querySelector('[data-cn="type"]');
    const titleEl = shadow.querySelector('[data-cn="title"]');
    const noteEl = shadow.querySelector('[data-cn="note"]');
    const urlEl = shadow.querySelector('[data-cn="url"]');
    const tagsEl = shadow.querySelector('[data-cn="tags"]');
    const groupSel = shadow.querySelector('[data-cn="group"]');
    const urlSection = shadow.querySelector('[data-cn="urlSection"]');

    // seed values
    if (typeSel) typeSel.value = inferredType === "note" ? "note" : "link";
    if (titleEl) titleEl.value = "";
    if (noteEl) noteEl.value = seedNote || "";
    if (urlEl) urlEl.value = inferredType === "link" ? seedUrl : "";
    if (tagsEl) tagsEl.value = "";

    // show/hide url section based on type
    const syncTypeUI = () => {
      const v = typeSel?.value || inferredType;
      if (!urlSection) return;
      urlSection.style.display = v === "note" ? "none" : "grid";
    };
    if (typeSel) typeSel.addEventListener("change", syncTypeUI);
    syncTypeUI();

    // populate groups
    if (groupSel) populateGroups(groupSel);

    const close = () => {
      // cleanup listeners that are attached to window
      window.removeEventListener("keydown", onKeyDown, true);
      host.style.display = "none";
      removeExisting();
    };

    // backdrop click closes only when clicking the backdrop itself
    if (backdrop) {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) close();
      });
    }

    if (btnClose) btnClose.addEventListener("click", close);
    if (btnCancel) btnCancel.addEventListener("click", close);

    function onKeyDown(e) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown, true);

    if (btnSave) {
      btnSave.addEventListener("click", async () => {
        const type = typeSel?.value || inferredType;

        const title = titleEl?.value || "";
        const note = noteEl?.value || "";
        const url = urlEl?.value || "";
        const tagsRaw = tagsEl?.value || "";
        const group_id = groupSel?.value || "";

        const tags = parseTags(tagsRaw);

        // minimal validation (optional but helps)
        if (type === "note") {
          if (!String(note).trim()) {
            showError(shadow, "Not içeriği boş olamaz.");
            return;
          }
        } else {
          // allow empty title, but url should exist or fallback exists
          const finalUrl =
            String(url).trim() ||
            String(payload?.link || payload?.pageUrl || "").trim();
          if (!finalUrl) {
            showError(shadow, "URL bulunamadı.");
            return;
          }
        }

        const out = {
          inferredType: type,
          title,
          note,
          tags,
          group_id: group_id || null,
          url,
          selection: payload?.selection || "",
          pageUrl: payload?.pageUrl || "",
          link: payload?.link || "",
          content: type === "note" ? note : url,
        };

        try {
          await chrome.runtime.sendMessage({
            type: "CLARIONOT_SAVE_FROM_MODAL",
            payload: out,
          });
          close();
        } catch (e) {
          // If message fails, keep modal open and show error
          showError(shadow, e?.message || "Kaydetme başarısız.");
        }
      });
    }

    // finally show
    host.style.display = "block";

    // focus
    if (titleEl && typeof titleEl.focus === "function") titleEl.focus();
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "CLARIONOT_OPEN_MODAL") return;
    openModal(msg.payload || {});
  });
})();
