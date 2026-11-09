/* Aba "Questão inspiradora — 4 CSTRs": montador de arranjo → Python
 * (site_api.calcular_arranjo, que chama CSTR.reator em cada reator). */
import { ultimoVence, debounce } from "./api.js";
import { num } from "./formato.js";
import { criarParametro, preencherKPIs } from "./ui.js";
import { CenaCSTR } from "./animacao.js";

const PARAMS = [
  { chave: "k", rotulo: "Constante de velocidade <i>k</i>", un: "L/(mol·s)", min: 0.0001, max: 0.005, passo: 0.0001 },
  { chave: "vo", rotulo: "Vazão de alimentação <i>v</i><sub>0</sub>", un: "L/s", min: 0.1, max: 6, passo: 0.05 },
  { chave: "Cao", rotulo: "Concentração inicial <i>C</i><sub>A0</sub>", un: "mol/L", min: 1, max: 30, passo: 0.5 },
  { chave: "V", rotulo: "Volume de cada reator <i>V</i>", un: "L", min: 10, max: 500, passo: 5 },
];

const PRESETS = {
  serie: { estagios: [{ ramos: [{ fracao: "1", reatores: 4 }] }] },
  paralelo: { estagios: [{ ramos: [1, 2, 3, 4].map(() => ({ fracao: "1/4", reatores: 1 })) }] },
  "2x2": { estagios: [{ ramos: [{ fracao: "1/2", reatores: 2 }, { fracao: "1/2", reatores: 2 }] }] },
};

const copia = (o) => JSON.parse(JSON.stringify(o));

export async function iniciarCSTR(api) {
  const $ = (s) => document.querySelector(s);
  const cena = new CenaCSTR($("#cstr-cena"));
  const aviso = $("#cstr-aviso");
  const kpis = $("#cstr-kpis");
  const editor = $("#cstr-estagios");

  let arranjo = { estagios: [{ ramos: [{ fracao: "1", reatores: 4 }] }] };
  let ultimoRes = null;
  let N_REATORES = 4;

  const disparar = debounce(() => recalcular(), 250);
  const aoMudar = (imediato) => (imediato ? disparar.agora() : disparar());
  const ctrls = PARAMS.map((d) => criarParametro($("#cstr-params"), d, aoMudar));
  const calcular = ultimoVence((a, p) => api.chamar("calcular_arranjo", a, p));

  renderEditor();
  cena.setDados(arranjo, null);

  await api.pronto;
  const { cstr: enunciado } = await api.chamar("parametros_enunciado");
  const otimo = await api.chamar("arranjo_otimo");
  N_REATORES = enunciado.n_reatores;

  const restaurarParams = () => { for (const c of ctrls) c.set(enunciado[c.chave]); disparar.agora(); };
  const definirArranjo = (a) => { arranjo = copia(a); renderEditor(); cena.setDados(arranjo, null); disparar.agora(); };

  ctrls.forEach((c) => c.habilitar());
  for (const id of ["#cstr-restaurar-params", "#cstr-restaurar-arranjo"]) $(id).disabled = false;
  $("#cstr-restaurar-params").addEventListener("click", restaurarParams);
  $("#cstr-restaurar-arranjo").addEventListener("click", () => definirArranjo(otimo));
  document.querySelectorAll("[data-preset]").forEach((b) =>
    b.addEventListener("click", () => definirArranjo(PRESETS[b.dataset.preset])));
  $("#cstr-add-estagio").addEventListener("click", () => {
    arranjo.estagios.push({ ramos: [{ fracao: "1", reatores: 1 }] });
    mudouEstrutura();
  });

  for (const c of ctrls) c.set(enunciado[c.chave]);
  definirArranjo(otimo);

  /* ---------------- montador ---------------- */
  function mudouEstrutura() { renderEditor(); cena.setDados(arranjo, null); disparar.agora(); }

  function renderEditor() {
    editor.innerHTML = "";
    arranjo.estagios.forEach((est, i) => {
      const box = document.createElement("div");
      box.className = "estagio";
      box.innerHTML = `
        <div class="estagio-topo"><span>Estágio ${i + 1}</span>
          <span class="acoes">
            <button class="botao mini" data-a="add-ramo" ${est.ramos.length >= 4 ? "disabled" : ""}>+ ramo</button>
            ${arranjo.estagios.length > 1 ? '<button class="botao mini" data-a="del-est" title="Remover estágio">remover</button>' : ""}
          </span></div>`;
      est.ramos.forEach((r, j) => {
        const lin = document.createElement("div");
        lin.className = "ramo";
        lin.innerHTML = `
          <span>Ramo ${j + 1}</span>
          <label style="display:flex;gap:.3rem;align-items:center">fração <input type="text" inputmode="decimal" value="${r.fracao}" aria-label="Fração do ramo ${j + 1}"></label>
          <span class="contador" title="Reatores em série neste ramo">
            <button class="botao mini" data-a="menos" aria-label="Menos um reator">−</button>
            <span>${r.reatores}</span>
            <button class="botao mini" data-a="mais" aria-label="Mais um reator">+</button>
          </span>
          ${est.ramos.length > 1 ? '<button class="botao mini" data-a="del-ramo" aria-label="Remover ramo">×</button>' : "<span></span>"}`;
        lin.querySelector("input").addEventListener("input", (ev) => { r.fracao = ev.target.value; disparar(); });
        lin.querySelector('[data-a="menos"]').addEventListener("click", () => {
          if (r.reatores > 1) { r.reatores--; mudouEstrutura(); }
        });
        lin.querySelector('[data-a="mais"]').addEventListener("click", () => { r.reatores++; mudouEstrutura(); });
        const del = lin.querySelector('[data-a="del-ramo"]');
        if (del) del.addEventListener("click", () => { est.ramos.splice(j, 1); mudouEstrutura(); });
        box.appendChild(lin);
      });
      box.querySelector('[data-a="add-ramo"]').addEventListener("click", () => {
        est.ramos.push({ fracao: "0", reatores: 1 });
        mudouEstrutura();
      });
      const delE = box.querySelector('[data-a="del-est"]');
      if (delE) delE.addEventListener("click", () => { arranjo.estagios.splice(i, 1); mudouEstrutura(); });
      editor.appendChild(box);
    });
    const usados = arranjo.estagios.reduce((s, e) => s + e.ramos.reduce((t, r) => t + r.reatores, 0), 0);
    const uso = $("#cstr-uso");
    uso.textContent = `Reatores no arranjo: ${usados} de ${N_REATORES}`;
    uso.classList.toggle("errado", usados !== N_REATORES);
  }

  /* ---------------- cálculo e exibição ---------------- */
  async function recalcular() {
    if (ctrls.some((c) => !c.ok())) {
      aviso.textContent = "Corrija os parâmetros destacados (números positivos; vírgula decimal).";
      return;
    }
    const p = Object.fromEntries(ctrls.map((c) => [c.chave, c.get()]));
    const a = copia(arranjo);
    kpis.classList.add("calculando");
    let res;
    try {
      res = await calcular(a, p);
    } catch (e) {
      if (e.obsoleto) return;
      aviso.textContent = `Erro ao chamar o Python: ${e.message}`;
      kpis.classList.remove("calculando");
      return;
    }
    kpis.classList.remove("calculando");
    ultimoRes = res;
    mostrar(a, res);
  }

  function mostrar(a, res) {
    aviso.textContent = res.ok ? "" : (res.erros || []).join(" ");
    const f4 = (v) => num(v, 4);
    preencherKPIs(kpis, res.ok ? { ...res, vo_final: res.final.vo } : null, {
      Ca_final: f4, x_global: f4, vo_final: (v) => num(v, 3), tau_total: (v) => num(v, 1),
    });
    cena.setDados(a, res);
    preencherTabela(res);
  }

  function preencherTabela(res) {
    const corpo = $("#cstr-tabela tbody");
    if (!res.estagios) { corpo.innerHTML = ""; return; }
    const lin = [];
    const fx = (v) => num(v, 4);
    res.estagios.forEach((e, i) => {
      e.ramos.forEach((r, j) => {
        r.reatores.forEach((t) => {
          const nome = `Estágio ${i + 1} · ramo ${j + 1} · reator ${t.posicao}`;
          lin.push(`<tr${t.fisico ? "" : ' style="color:var(--alerta)"'}><td>${nome}</td>
            <td class="n">${num(t.entrada.vo, 4)}</td><td class="n">${fx(t.entrada.x)}</td>
            <td class="n">${fx(t.saida.x)}</td><td class="n">${fx(t.saida.ca)}</td></tr>`);
        });
      });
      if (e.mistura && e.ramos.length > 1) {
        lin.push(`<tr style="background:#f8fafc"><td><b>Mistura — saída do estágio ${i + 1}</b></td>
          <td class="n">${num(e.mistura.vo, 4)}</td><td class="n">—</td>
          <td class="n"><b>${fx(e.mistura.x)}</b></td><td class="n"><b>${fx(e.mistura.ca)}</b></td></tr>`);
      }
    });
    corpo.innerHTML = lin.join("");
  }

  return { get resultado() { return ultimoRes; } };
}
