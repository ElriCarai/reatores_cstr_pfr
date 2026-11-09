/* Aba "Código": mostra os arquivos Python exatamente como estão no projeto. */
const ARQUIVOS = [
  { nome: "PFR.py", nota: "Código do PFR com reciclo. A única alteração foi estrutural: o script passou a ficar dentro de <code>calcular()</code>, e o <code>print</code> e o gráfico ficaram sob <code>if __name__ == \"__main__\":</code>. A matemática não mudou, e <code>python PFR.py</code> dá o mesmo resultado." },
  { nome: "CSTR.py", nota: "Código base dos CSTRs (função <code>reator</code>, classe <code>Corrente</code>, <code>split</code> e <code>mix</code>). Sem alterações." },
  { nome: "site_api.py", nota: "Adaptador entre o site e os dois arquivos acima. Converte os tipos e faz o balanço dos divisores e misturadores. Não reimplementa os modelos." },
];

const PALAVRAS = /\b(def|class|return|import|from|as|if|elif|else|for|in|while|try|except|with|not|and|or|is|None|True|False|lambda|pass|continue|break|raise|global)\b/;
const TOKEN = new RegExp([
  /("""[\s\S]*?"""|'''[\s\S]*?''')/.source,          // docstrings
  /(f?"(?:\\.|[^"\\\n])*"|f?'(?:\\.|[^'\\\n])*')/.source, // strings
  /(#[^\n]*)/.source,                                 // comentários
  `(${PALAVRAS.source})`,                             // palavras-chave
  /(\b\d+(?:\.\d+)?(?:e-?\d+)?\b)/.source,            // números
].join("|"), "g");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function realcar(codigo) {
  let html = "", ult = 0, m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(codigo))) {
    html += esc(codigo.slice(ult, m.index));
    const cls = m[1] ? "str" : m[2] ? "str" : m[3] ? "com" : m[4] ? "kw" : "num";
    html += `<span class="tk-${cls}">${esc(m[0])}</span>`;
    ult = m.index + m[0].length;
  }
  return html + esc(codigo.slice(ult));
}

export function iniciarCodigo() {
  const abas = document.getElementById("codigo-abas");
  const nota = document.getElementById("codigo-nota");
  const gutter = document.getElementById("codigo-linhas");
  const pre = document.getElementById("codigo-texto");
  const baixar = document.getElementById("codigo-baixar");

  async function mostrar(arq) {
    abas.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.arq === arq.nome)));
    nota.innerHTML = arq.nota;
    baixar.href = arq.nome;
    baixar.setAttribute("download", arq.nome);
    baixar.textContent = `Baixar ${arq.nome}`;
    try {
      const r = await fetch(arq.nome, { cache: "no-cache" });
      const txt = (await r.text()).replace(/\n$/, "");
      gutter.textContent = txt.split("\n").map((_, i) => i + 1).join("\n");
      pre.innerHTML = realcar(txt);
    } catch (e) {
      pre.textContent = `Não foi possível carregar ${arq.nome}.`;
    }
  }
  for (const arq of ARQUIVOS) {
    const b = document.createElement("button");
    b.className = "botao"; b.dataset.arq = arq.nome; b.textContent = arq.nome;
    b.addEventListener("click", () => mostrar(arq));
    abas.appendChild(b);
  }
  mostrar(ARQUIVOS[0]);
}
