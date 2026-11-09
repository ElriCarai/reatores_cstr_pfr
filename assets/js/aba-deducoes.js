/* Aba "Deduções": transcrições (deducoes/transcricao/*.md) em quadro branco
 * + modal "Ver original" com zoom e arraste. */
import { carregarMarkdown } from "./markdown.js";

export function iniciarDeducoes() {
  document.querySelectorAll("[data-transcricao]").forEach((el) =>
    carregarMarkdown(el.dataset.transcricao, el));

  const modal = document.getElementById("modal-original");
  const img = modal.querySelector("img");
  const area = modal.querySelector(".zoom-area");
  const rotulo = modal.querySelector("[data-zoom-valor]");
  let esc = 1, tx = 0, ty = 0;
  const aplicar = () => {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${esc})`;
    rotulo.textContent = `${Math.round(esc * 100)}%`;
  };
  const zoom = (f, cx = area.clientWidth / 2, cy = area.clientHeight / 2) => {
    const novo = Math.min(8, Math.max(0.5, esc * f));
    const k = novo / esc;
    tx = cx - k * (cx - tx); ty = cy - k * (cy - ty);
    esc = novo; aplicar();
  };
  const ajustarTela = () => {
    const kx = area.clientWidth / img.naturalWidth, ky = area.clientHeight / img.naturalHeight;
    esc = Math.min(kx, ky); tx = (area.clientWidth - img.naturalWidth * esc) / 2; ty = 0; aplicar();
  };

  document.querySelectorAll("[data-original]").forEach((b) => b.addEventListener("click", () => {
    img.src = b.dataset.original;
    modal.querySelector("h3").textContent = b.dataset.titulo || "Original";
    modal.showModal();
    if (img.complete) ajustarTela(); else img.onload = ajustarTela;
  }));
  modal.querySelector("[data-zoom='+']").addEventListener("click", () => zoom(1.4));
  modal.querySelector("[data-zoom='-']").addEventListener("click", () => zoom(1 / 1.4));
  modal.querySelector("[data-zoom='0']").addEventListener("click", ajustarTela);
  modal.querySelector("[data-fechar]").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });

  area.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = area.getBoundingClientRect();
    zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  area.addEventListener("dblclick", (e) => {
    const r = area.getBoundingClientRect();
    zoom(2, e.clientX - r.left, e.clientY - r.top);
  });
  // arrastar (mouse e toque) e pinça com dois dedos
  const toques = new Map();
  let distIni = 0;
  area.addEventListener("pointerdown", (e) => { area.setPointerCapture(e.pointerId); toques.set(e.pointerId, [e.clientX, e.clientY]); });
  area.addEventListener("pointermove", (e) => {
    if (!toques.has(e.pointerId)) return;
    const [x0, y0] = toques.get(e.pointerId);
    if (toques.size === 1) { tx += e.clientX - x0; ty += e.clientY - y0; aplicar(); }
    toques.set(e.pointerId, [e.clientX, e.clientY]);
    if (toques.size === 2) {
      const [a, b] = [...toques.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const r = area.getBoundingClientRect();
      if (distIni) zoom(d / distIni, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
      distIni = d;
    }
  });
  const soltar = (e) => { toques.delete(e.pointerId); if (toques.size < 2) distIni = 0; };
  area.addEventListener("pointerup", soltar);
  area.addEventListener("pointercancel", soltar);
}
