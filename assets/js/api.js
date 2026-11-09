/* Ponte JS -> Python (Pyodide no Web Worker). Só transporte: nenhum cálculo. */
export class PyAPI {
  constructor(aoProgresso = () => {}) {
    this.worker = new Worker(new URL("./worker.js", import.meta.url));
    this.pendentes = new Map();
    this.proxId = 1;
    this.pronto = new Promise((ok, falha) => {
      this.worker.onmessage = (ev) => {
        const m = ev.data;
        if (m.tipo === "progresso") aoProgresso(m);
        else if (m.tipo === "pronto") ok(m);
        else if (m.tipo === "falha") falha(new Error(m.erro));
        else if (m.tipo === "resposta") {
          const p = this.pendentes.get(m.id);
          this.pendentes.delete(m.id);
          if (p) m.ok ? p.ok(m.dados) : p.falha(new Error(m.erro));
        }
      };
    });
  }

  chamar(fn, ...args) {
    const id = this.proxId++;
    return new Promise((ok, falha) => {
      this.pendentes.set(id, { ok, falha });
      this.worker.postMessage({ id, fn, args });
    });
  }
}

/* "Último pedido vence": respostas atrasadas de pedidos antigos são descartadas. */
export function ultimoVence(funcao) {
  let seq = 0;
  return async (...args) => {
    const meu = ++seq;
    const r = await funcao(...args);
    if (meu !== seq) throw Object.assign(new Error("obsoleto"), { obsoleto: true });
    return r;
  };
}

export function debounce(funcao, ms = 300) {
  let t;
  const d = (...args) => { clearTimeout(t); t = setTimeout(() => funcao(...args), ms); };
  d.agora = (...args) => { clearTimeout(t); funcao(...args); };
  return d;
}
