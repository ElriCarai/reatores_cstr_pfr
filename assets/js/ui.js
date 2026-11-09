/* Controles de parâmetro (slider + campo de texto pt-BR). Só interface. */
import { lerNumero } from "./formato.js";

export function fmtEntrada(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  return Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 6, useGrouping: false });
}

/**
 * Cria um parâmetro editável.
 * def = { chave, rotulo (html), un, min, max, passo, inteiro?, positivo? }
 * aoMudar(imediato:boolean) é chamado a cada alteração (imediato=true ao soltar/confirmar).
 */
export function criarParametro(container, def, aoMudar) {
  const el = document.createElement("div");
  el.className = "param";
  const id = `p-${container.id}-${def.chave}`;
  el.innerHTML = `
    <label for="${id}"><span>${def.rotulo}</span><span class="un">${def.un || ""}</span></label>
    <div class="linha">
      <input type="range" min="${def.min}" max="${def.max}" step="${def.passo}" aria-label="${def.chave}" disabled>
      <input type="text" id="${id}" inputmode="decimal" disabled>
    </div>`;
  container.appendChild(el);
  const slider = el.querySelector('input[type="range"]');
  const campo = el.querySelector('input[type="text"]');
  let valor = NaN;

  function valido(v) {
    if (!Number.isFinite(v)) return false;
    if (def.inteiro && !Number.isInteger(v)) return false;
    if (def.positivo !== false && v <= 0) return false;
    return true;
  }

  slider.addEventListener("input", () => {
    valor = Number(slider.value);
    if (def.inteiro) valor = Math.round(valor);
    campo.value = fmtEntrada(valor);
    campo.classList.remove("invalido");
    aoMudar(false);
  });
  slider.addEventListener("change", () => aoMudar(true));
  campo.addEventListener("input", () => {
    const v = lerNumero(campo.value);
    campo.classList.toggle("invalido", !valido(v));
    if (valido(v)) { valor = v; slider.value = String(v); aoMudar(false); }
  });
  campo.addEventListener("change", () => { if (valido(valor)) aoMudar(true); });

  return {
    chave: def.chave,
    get: () => valor,
    ok: () => valido(valor),
    set(v) {
      valor = Number(v);
      slider.value = String(valor);
      campo.value = fmtEntrada(valor);
      campo.classList.remove("invalido");
    },
    habilitar(sim = true) { slider.disabled = campo.disabled = !sim; },
  };
}

export function preencherKPIs(raiz, dados, formatos) {
  raiz.querySelectorAll("[data-k]").forEach((el) => {
    const k = el.dataset.k;
    el.textContent = formatos[k] ? formatos[k](dados ? dados[k] : null) : "—";
  });
}
