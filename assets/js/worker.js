/* Worker do Pyodide: carrega o Python do usuário (PFR.py, CSTR.py) e o
 * adaptador site_api.py, e responde a chamadas {id, fn, args}.
 * Todo número exibido no site sai daqui. Rodar em Worker evita travar a UI. */
const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";
importScripts(PYODIDE_URL + "pyodide.js");

// Raiz do site, relativa a este arquivo (assets/js/worker.js -> ../../)
const RAIZ = new URL("../../", self.location.href).href;
const ARQUIVOS_PY = ["PFR.py", "CSTR.py", "site_api.py"];

function progresso(etapa, detalhe) {
  self.postMessage({ tipo: "progresso", etapa, detalhe });
}

async function iniciar() {
  const t0 = performance.now();
  progresso(1, "Baixando o Python (Pyodide)…");
  const pyodide = await loadPyodide({ indexURL: PYODIDE_URL });

  progresso(2, "Carregando numpy e sympy…");
  await pyodide.loadPackage(["numpy", "sympy"]);

  progresso(3, "Carregando PFR.py, CSTR.py e site_api.py…");
  for (const nome of ARQUIVOS_PY) {
    const resp = await fetch(RAIZ + nome, { cache: "no-cache" });
    if (!resp.ok) throw new Error(`Não foi possível baixar ${nome} (${resp.status})`);
    pyodide.FS.writeFile(nome, await resp.text());
  }

  progresso(4, "Importando os módulos…");
  const api = pyodide.pyimport("site_api");
  const chamar = api.chamar;
  const segundos = (performance.now() - t0) / 1000;
  return { pyodide, chamar, segundos };
}

const pronto = iniciar();
pronto.then(
  (p) => self.postMessage({ tipo: "pronto", segundos: p.segundos }),
  (e) => self.postMessage({ tipo: "falha", erro: String(e && e.message || e) })
);

self.onmessage = async (ev) => {
  const { id, fn, args } = ev.data;
  try {
    const { chamar } = await pronto;
    const t0 = performance.now();
    const json = chamar(fn, JSON.stringify(args || []));
    self.postMessage({ tipo: "resposta", id, ok: true, dados: JSON.parse(json),
                       ms: performance.now() - t0 });
  } catch (e) {
    self.postMessage({ tipo: "resposta", id, ok: false, erro: String(e && e.message || e) });
  }
};
