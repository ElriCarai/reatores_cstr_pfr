/* Markdown + LaTeX: protege as fórmulas ($…$ e $$…$$) antes do marked e as
 * renderiza com KaTeX depois. Usado nas abas lidas de arquivos .md. */
export function markdownParaHTML(texto) {
  const formulas = [];
  let s = texto.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => { formulas.push({ tex, bloco: true }); return `@@F${formulas.length - 1}@@`; });
  s = s.replace(/\$([^$\n]+?)\$/g, (_, tex) => { formulas.push({ tex, bloco: false }); return `@@F${formulas.length - 1}@@`; });
  const html = window.marked.parse(s);
  return html.replace(/@@F(\d+)@@/g, (_, i) =>
    window.katex.renderToString(formulas[i].tex, {
      displayMode: formulas[i].bloco, throwOnError: false, strict: "ignore",
    }));
}

/* Texto sem conteúdo além de comentários e títulos? */
export function semConteudo(texto) {
  return texto.replace(/<!--[\s\S]*?-->/g, "").split("\n")
    .every((l) => !l.trim() || /^#{1,6}\s/.test(l.trim()));
}

export async function carregarMarkdown(url, el, avisoVazio = "") {
  try {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) throw new Error(`${r.status}`);
    const texto = await r.text();
    el.innerHTML = markdownParaHTML(texto) +
      (avisoVazio && semConteudo(texto) ? `<p class="vazio">${avisoVazio}</p>` : "");
  } catch (e) {
    el.innerHTML = `<p class="aviso">Não foi possível carregar <code>${url}</code> (${e.message}).</p>`;
  }
}

/* Markdown para textos de conversa: HTML bruto é exibido como texto, sem fórmulas. */
let _chat = null;
const _esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function markdownSeguro(texto) {
  if (!_chat) {
    _chat = new window.marked.Marked();
    _chat.use({ renderer: { html: (h) => _esc(typeof h === "object" ? h.text : h) } });
  }
  return _chat.parse(texto);
}
