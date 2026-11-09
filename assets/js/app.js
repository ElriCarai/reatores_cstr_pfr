/* Ponto de entrada: abas, status do Python (Pyodide) e inicialização das abas. */
import { PyAPI } from "./api.js";
import { num } from "./formato.js";
import { iniciarPFR } from "./aba-pfr.js";
import { iniciarCSTR } from "./aba-cstr.js";
import { iniciarDeducoes } from "./aba-deducoes.js";
import { iniciarTextos } from "./aba-textos.js";
import { iniciarCodigo } from "./aba-codigo.js";
import { iniciarIA } from "./aba-ia.js";

/* ---------- abas (com #hash para links diretos) ---------- */
const botoes = [...document.querySelectorAll("nav.abas button")];
function abrir(nome, atualizarHash = true) {
  if (!document.getElementById(`aba-${nome}`)) nome = "pfr";
  for (const b of botoes) b.setAttribute("aria-selected", String(b.dataset.aba === nome));
  for (const s of document.querySelectorAll("section.aba")) s.hidden = s.id !== `aba-${nome}`;
  if (atualizarHash) history.replaceState(null, "", `#${nome}`);
  window.dispatchEvent(new Event("resize"));
}
botoes.forEach((b) => b.addEventListener("click", () => abrir(b.dataset.aba)));
abrir(location.hash.slice(1) || "pfr", false);

/* ---------- KaTeX ---------- */
export function renderizarMatematica(el = document.body) {
  if (window.renderMathInElement) {
    window.renderMathInElement(el, {
      delimiters: [
        { left: "\\[", right: "\\]", display: true },
        { left: "$$", right: "$$", display: true },
        { left: "\\(", right: "\\)", display: false },
        { left: "$", right: "$", display: false },
      ],
      throwOnError: false,
    });
  }
}
renderizarMatematica();

/* ---------- Python ---------- */
const status = document.getElementById("status-python");
const statusTexto = document.getElementById("status-texto");
const barra = document.getElementById("status-barra");
const api = new PyAPI((m) => {
  statusTexto.textContent = `${m.detalhe} (etapa ${m.etapa} de 4)`;
  barra.style.width = `${m.etapa * 25 - 10}%`;
});
api.pronto.then(
  (info) => {
    status.classList.add("pronto");
    status.innerHTML = `✓ Python pronto em ${num(info.segundos, 1)} s: os resultados vêm do <code>PFR.py</code> e do <code>CSTR.py</code>.`;
    setTimeout(() => { status.style.display = "none"; }, 6000);
  },
  (e) => {
    status.classList.add("falha");
    status.textContent = `Não foi possível iniciar o Python: ${e.message}. Abra o site por um servidor (ex.: python -m http.server), não direto pelo arquivo.`;
  },
);

iniciarPFR(api);
iniciarCSTR(api);
iniciarDeducoes();
iniciarTextos();
iniciarCodigo();
iniciarIA();
