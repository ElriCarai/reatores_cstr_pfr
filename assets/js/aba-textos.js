/* Abas lidas de arquivos .md editáveis (fundamentação, metodologia, discussão). */
import { carregarMarkdown } from "./markdown.js";

export function iniciarTextos() {
  document.querySelectorAll("[data-md]").forEach((el) =>
    carregarMarkdown(el.dataset.md, el,
      `Seção ainda não escrita. Edite <code>${el.dataset.md}</code> para preenchê-la.`));
}
