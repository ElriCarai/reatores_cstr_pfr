/* Aba "PFR com reciclo": parâmetros → Python (site_api.calcular_comparacao)
 * → KPIs, gráfico, animação, comparação e tabela. Nenhum cálculo do modelo aqui. */
import { ultimoVence, debounce } from "./api.js";
import { num } from "./formato.js";
import { criarParametro, preencherKPIs, fmtEntrada } from "./ui.js";
import { CenaPFR } from "./animacao.js";

const PRINCIPAIS = [
  { chave: "k", rotulo: "Constante de velocidade <i>k</i>", un: "L/(mol·s)", min: 0.0001, max: 0.005, passo: 0.0001 },
  { chave: "vo", rotulo: "Vazão de alimentação <i>v</i><sub>0</sub>", un: "L/s", min: 0.1, max: 6, passo: 0.05 },
  { chave: "Cao", rotulo: "Concentração inicial <i>C</i><sub>A0</sub>", un: "mol/L", min: 1, max: 30, passo: 0.5 },
  { chave: "V", rotulo: "Volume do PFR <i>V</i>", un: "L", min: 50, max: 1500, passo: 10 },
];
const AVANCADOS = [
  { chave: "R_ini", rotulo: "R inicial do gráfico", un: "", min: 0.01, max: 5, passo: 0.01 },
  { chave: "R_fim", rotulo: "R final do gráfico", un: "", min: 0.5, max: 50, passo: 0.5 },
  { chave: "n_pontos", rotulo: "Número de pontos", un: "", min: 10, max: 500, passo: 10, inteiro: true },
  { chave: "R_chute", rotulo: "Chute inicial do <code>nsolve</code>", un: "", min: 0.01, max: 20, passo: 0.01 },
];

export async function iniciarPFR(api) {
  const $ = (s) => document.querySelector(s);
  const cena = new CenaPFR($("#pfr-cena"));
  const grafico = criarGrafico($("#pfr-grafico"));
  const aviso = $("#pfr-aviso");
  const kpis = $("#pfr-kpis");
  const chkAuto = $("#pfr-chute-auto");

  const disparar = debounce(() => recalcular(), 300);
  const aoMudar = (imediato) => (imediato ? disparar.agora() : disparar());
  const ctrls = [
    ...PRINCIPAIS.map((d) => criarParametro($("#pfr-params"), d, aoMudar)),
    ...AVANCADOS.map((d) => criarParametro($("#pfr-params-avancados"), d, aoMudar)),
  ];
  chkAuto.addEventListener("change", () => disparar.agora());

  const calcular = ultimoVence((p) => api.chamar("calcular_comparacao", p));

  await api.pronto;
  const { pfr: enunciado } = await api.chamar("parametros_enunciado");
  function restaurar() {
    for (const c of ctrls) c.set(enunciado[c.chave]);
    chkAuto.checked = !!enunciado.chute_auto;
    disparar.agora();
  }
  ctrls.forEach((c) => c.habilitar());
  $("#pfr-restaurar").disabled = false;
  $("#pfr-restaurar").addEventListener("click", restaurar);
  restaurar();

  async function recalcular() {
    const invalidos = ctrls.filter((c) => !c.ok());
    if (invalidos.length) {
      aviso.textContent = "Corrija os campos destacados (use números positivos; vírgula decimal).";
      return;
    }
    const p = Object.fromEntries(ctrls.map((c) => [c.chave, c.get()]));
    p.chute_auto = chkAuto.checked;
    kpis.classList.add("calculando");
    let res;
    try {
      res = await calcular(p);
    } catch (e) {
      if (e.obsoleto) return;
      aviso.textContent = `Erro ao chamar o Python: ${e.message}`;
      kpis.classList.remove("calculando");
      return;
    }
    kpis.classList.remove("calculando");
    mostrar(res);
  }

  function mostrar({ pfr, cstr }) {
    const valido = pfr.ok && pfr.fisico;
    const f4 = (v) => num(v, 4);
    preencherKPIs(kpis, valido ? pfr : null, {
      R_otimo: f4, xj_max: f4, Ca_final: f4, vazao_reciclo: f4,
    });

    const msgs = [];
    if (!pfr.ok) msgs.push(pfr.erro);
    if (pfr.ok && !pfr.fisico) msgs.push(...pfr.avisos);
    aviso.textContent = msgs.join(" ");

    const der = [];
    der.push(`τ = V/v₀ = ${num(pfr.tau, 2)} s`);
    if (pfr.chute_ajustado) der.push(`chute usado no nsolve: ${num(pfr.chute_usado, 4)} (automático, do máximo da curva)`);
    else der.push(`chute usado no nsolve: ${fmtEntrada(pfr.chute_usado)}`);
    $("#pfr-derivados").innerHTML = der.join("<br>");

    cena.setEstado(valido
      ? { valido: true, vo: pfr.params.vo, V: pfr.params.V, R: pfr.R_otimo, xi: pfr.anim_xi,
          xj: pfr.xj_max, vr: pfr.vazao_reciclo, tau: pfr.tau }
      : { valido: false, mensagem: "Sem R ótimo válido para estes parâmetros" });
    $("#pfr-anim-info").textContent = valido ? `operando no R ótimo` : "";

    atualizarGrafico(grafico, pfr.ok ? pfr : null, valido);
    preencherComparacao(pfr, cstr, valido);
    preencherTabela(pfr, valido);
  }

  function preencherComparacao(pfr, cstr, valido) {
    const P = valido ? pfr : {};
    const C = cstr && cstr.ok ? cstr : null;
    const linhas = [
      ["Conversão final", num(P.xj_max, 4), C ? num(C.x_global, 4) : "—"],
      ["<i>C</i><sub>A</sub> final (mol/L)", num(P.Ca_final, 4), C ? num(C.Ca_final, 4) : "—"],
      ["Volume total (L)", num(pfr.params.V, 1), C ? num(C.V_total, 1) : "—"],
      ["Vazão de alimentação (L/s)", num(pfr.params.vo, 3), C ? num(C.params.vo, 3) : "—"],
      ["τ total = V<sub>total</sub>/v<sub>0</sub> (s)", num(pfr.tau, 2), C ? num(C.tau_total, 2) : "—"],
      ["Razão de reciclo R", num(P.R_otimo, 4), "—"],
      ["Vazão de reciclo v<sub>R</sub> (L/s)", num(P.vazao_reciclo, 4), "—"],
      ["Conversão após os 3 CSTRs em paralelo", "—", C ? num(C.estagios[0].mistura.x, 4) : "—"],
    ];
    $("#pfr-comparacao tbody").innerHTML = linhas
      .map(([a, b, c]) => `<tr><td>${a}</td><td class="n">${b}</td><td class="n">${c}</td></tr>`).join("");
  }

  function preencherTabela(pfr, valido) {
    const corpo = $("#pfr-tabela tbody");
    if (!pfr.ok) { corpo.innerHTML = ""; $("#pfr-tabela-info").textContent = ""; return; }
    const linhas = [];
    if (valido) {
      linhas.push(`<tr class="otimo"><td class="n">ótimo</td><td class="n">${num(pfr.R_otimo, 4)}</td><td class="n">${num(pfr.xj_max, 4)}</td></tr>`);
    }
    pfr.curva.R.forEach((r, i) => {
      linhas.push(`<tr><td class="n">${i + 1}</td><td class="n">${num(r, 4)}</td><td class="n">${num(pfr.curva.xj[i], 4)}</td></tr>`);
    });
    corpo.innerHTML = linhas.join("");
    $("#pfr-tabela-info").textContent =
      `${pfr.curva.R.length} pontos (valores_R × valores_xj do PFR.py)`;
  }
}

function criarGrafico(canvas) {
  const Chart = window.Chart;
  const fmt = (v, c = 4) => num(v, c);
  return new Chart(canvas, {
    type: "scatter",
    data: {
      datasets: [
        { label: "X_f(R)", data: [], showLine: true, borderColor: "#1d4ed8", backgroundColor: "#1d4ed8",
          borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 4, pointHitRadius: 6, tension: 0 },
        { label: "R ótimo", data: [], borderColor: "#ea580c", backgroundColor: "#ea580c",
          pointRadius: 7, pointHoverRadius: 9, pointStyle: "circle" },
        { label: "R ótimo (linha)", data: [], showLine: true, borderColor: "rgba(234,88,12,.6)",
          borderDash: [6, 5], borderWidth: 1.5, pointRadius: 0, pointHitRadius: 0 },
      ],
    },
    options: {
      locale: "pt-BR",
      animation: false,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      plugins: {
        legend: { labels: { filter: (it) => it.datasetIndex < 2 } },
        tooltip: {
          filter: (it) => it.datasetIndex < 2,
          callbacks: {
            label: (ctx) => `${ctx.datasetIndex === 1 ? "Ótimo: " : ""}R = ${fmt(ctx.parsed.x)}  ·  X_f = ${fmt(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: { type: "linear", title: { display: true, text: "Razão de reciclo R" } },
        y: { title: { display: true, text: "Conversão de saída X_f" } },
      },
    },
  });
}

function atualizarGrafico(g, pfr, valido) {
  const pts = pfr ? pfr.curva.R.map((r, i) => ({ x: r, y: pfr.curva.xj[i] })).filter((p) => p.x !== null && p.y !== null) : [];
  g.data.datasets[0].data = pts;
  if (valido) {
    g.data.datasets[1].data = [{ x: pfr.R_otimo, y: pfr.xj_max }];
    const ys = pts.map((p) => p.y);
    g.data.datasets[2].data = [{ x: pfr.R_otimo, y: Math.min(...ys) }, { x: pfr.R_otimo, y: pfr.xj_max }];
  } else {
    g.data.datasets[1].data = [];
    g.data.datasets[2].data = [];
  }
  g.update("none");
}
