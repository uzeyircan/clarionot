// content/modal.js
(() => {
  if (window.__CLARIONOT_MODAL_LOADED__) return;
  window.__CLARIONOT_MODAL_LOADED__ = true;

  function openModal(payload = {}) {
    if (document.getElementById("clarionot-modal-root")) return;

    const clickX = Number(payload.clickX ?? 0);
    const clickY = Number(payload.clickY ?? 0);

    const root = document.createElement("div");
    root.id = "clarionot-modal-root";
    root.style.position = "fixed";
    root.style.inset = "0";
    root.style.zIndex = "2147483647";
    root.style.background = "rgba(0,0,0,0.55)";

    // overlay tıklayınca kapansın
    root.addEventListener("mousedown", (e) => {
      if (e.target === root) root.remove();
    });

    const box = document.createElement("div");
    box.id = "clarionot-modal-box";
    box.style.position = "fixed";
    box.style.width = "420px";
    box.style.maxWidth = "calc(100vw - 24px)";
    box.style.background = "#0a0a0a";
    box.style.color = "#fff";
    box.style.borderRadius = "14px";
    box.style.padding = "20px";
    box.style.fontFamily = "system-ui";
    box.style.boxShadow = "0 18px 60px rgba(0,0,0,0.55)";
    box.style.border = "1px solid rgba(255,255,255,0.08)";

    // default değerler
    const selection = (payload.selection || "").trim();
    const linkValue = payload.link || payload.pageUrl || "";

    box.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px">
        <h3 style="margin:0;font-size:16px">ClarioNot’a Kaydet</h3>
        <button id="cn-x" style="background:transparent;border:0;color:#aaa;font-size:18px;cursor:pointer">×</button>
      </div>

      <input id="cn-title" placeholder="Başlık"
        style="width:100%;margin-bottom:8px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#111;color:#fff" />

      <textarea id="cn-note" placeholder="Açıklama"
        style="width:100%;height:80px;margin-bottom:8px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#111;color:#fff"></textarea>

      ${
        selection
          ? `<textarea id="cn-selection" placeholder="Seçili metin"
              style="width:100%;height:80px;margin-bottom:8px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#111;color:#fff">${escapeHtml(
                selection
              )}</textarea>`
          : ""
      }

      <input id="cn-link" placeholder="Link"
        value="${escapeHtml(linkValue)}"
        style="width:100%;margin-bottom:12px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:#111;color:#fff" />

      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="cn-cancel"
          style="padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.14);background:transparent;color:#ddd;cursor:pointer">
          İptal
        </button>
        <button id="cn-save"
          style="padding:10px 12px;border-radius:10px;border:0;background:#fff;color:#111;font-weight:700;cursor:pointer">
          Kaydet
        </button>
      </div>
    `;

    root.appendChild(box);
    document.body.appendChild(root);

    // ✅ konumlandır: sağ tık noktasına yakın, taşmayacak şekilde
    requestAnimationFrame(() => {
      const rect = box.getBoundingClientRect();
      const margin = 12;

      // click yoksa tam ortala
      if (!clickX && !clickY) {
        box.style.left = `calc(50% - ${rect.width / 2}px)`;
        box.style.top = `calc(50% - ${rect.height / 2}px)`;
        return;
      }

      let left = clickX - rect.width / 2;
      let top = clickY - rect.height / 2;

      // clamp
      left = Math.max(
        margin,
        Math.min(left, window.innerWidth - rect.width - margin)
      );
      top = Math.max(
        margin,
        Math.min(top, window.innerHeight - rect.height - margin)
      );

      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
    });

    const $ = (sel) => box.querySelector(sel);

    $("#cn-x").onclick = () => root.remove();
    $("#cn-cancel").onclick = () => root.remove();

    $("#cn-save").onclick = () => {
      const title = ($("#cn-title").value || "").trim();
      const note = ($("#cn-note").value || "").trim();
      const url = ($("#cn-link").value || "").trim();

      const selectionEl = $("#cn-selection");
      const selectedText = selectionEl ? (selectionEl.value || "").trim() : "";

      // ✅ payload normalize: selection varsa note olarak kaydet, yoksa link
      const outPayload =
        selectedText && !url
          ? {
              type: "note",
              title,
              content: selectedText,
              note,
              tags: [],
              group_id: null,
            }
          : {
              type: "link",
              url,
              title,
              note,
              tags: [],
              group_id: null,
            };

      chrome.runtime.sendMessage({
        type: "CLARIONOT_SAVE_FROM_MODAL",
        payload: outPayload,
      });

      root.remove();
    };
  }

  // ✅ güvenli html escape
  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // 1) background mesajı ile aç
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "CLARIONOT_OPEN_MODAL") return;
    openModal(msg.payload || {});
  });

  // 2) bridge custom event ile aç (koordinat için)
  window.addEventListener("CLARIONOT_OPEN_MODAL", (e) => {
    openModal(e.detail || {});
  });
})();
