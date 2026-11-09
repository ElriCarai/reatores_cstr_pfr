/* Aba "Uso de IA": histórico da conversa exportado por
 * ferramentas/exportar_conversa.py (uso_de_ia/conversa.json). */
import { markdownSeguro } from "./markdown.js";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hora = (iso) => iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";

export async function iniciarIA() {
  const info = document.getElementById("ia-info");
  const lista = document.getElementById("ia-conversa");
  const chk = document.getElementById("ia-ferramentas");
  let dados;
  try {
    const r = await fetch("uso_de_ia/conversa.json", { cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    dados = await r.json();
  } catch (e) {
    info.innerHTML = `<p class="aviso">Histórico ainda não exportado. Rode <code>python ferramentas/exportar_conversa.py</code> na pasta do projeto.</p>`;
    return;
  }
  const msgs = dados.sessoes.flatMap((s) => s.mensagens);
  const nUsu = msgs.filter((m) => m.papel === "usuario").length;
  const nAcoes = msgs.reduce((s, m) => s + (m.ferramentas || []).length, 0);
  info.innerHTML = `
    <table class="tabela">
      <tr><td>Ferramenta</td><td>${esc(dados.ferramenta)}</td></tr>
      <tr><td>Exportado em</td><td>${hora(dados.exportado_em)}</td></tr>
      <tr><td>Sessões</td><td>${dados.sessoes.map((s) => `<code>${esc(s.id)}</code>`).join(", ")}</td></tr>
      <tr><td>Mensagens</td><td>${msgs.length} (${nUsu} do aluno, ${msgs.length - nUsu} do Claude) · ${nAcoes} ações de ferramenta</td></tr>
    </table>
    <p class="acoes" style="margin-top:.6rem"><a class="botao" href="uso_de_ia/conversa.json" download>Baixar histórico (JSON)</a></p>
    ${dados.prompt_docx ? `<details class="anexo"><summary>Prompt principal (<code>prompt.docx</code>)</summary><div class="md">${markdownSeguro(dados.prompt_docx)}</div></details>` : ""}`;

  lista.innerHTML = msgs.map((m) => {
    const quem = m.papel === "usuario" ? "Aluno" : "Claude";
    const rotulo = m.tipo === "resposta" ? " · resposta a uma pergunta do Claude" : m.tipo === "plano" ? " · aprovação do plano" : "";
    const img = m.imagens ? `<span class="suave"> · ${m.imagens} imagem(ns) anexada(s)</span>` : "";
    const anexo = m.anexo ? `<details class="anexo"><summary>Plano aprovado (Fase 0)</summary><div class="md">${markdownSeguro(m.anexo)}</div></details>` : "";
    const acoes = (m.ferramentas || []).length ? `
      <details class="acoes-ia"><summary>${m.ferramentas.length} ações de ferramenta</summary>
        <ul>${m.ferramentas.map((f) => `<li><code>${esc(f.nome)}</code> ${esc(f.descricao)}</li>`).join("")}</ul>
      </details>` : "";
    const corpo = m.texto ? `<div class="md">${markdownSeguro(m.texto)}</div>` : "";
    if (!corpo && !anexo && !acoes) return "";
    return `<article class="msg ${m.papel}">
      <header><b>${quem}</b>${rotulo}${img}<span class="suave">${hora(m.hora)}</span></header>
      ${corpo}${anexo}${acoes}</article>`;
  }).join("");

  const aplicar = () => lista.classList.toggle("sem-acoes", !chk.checked);
  chk.addEventListener("change", aplicar);
  aplicar();
}
