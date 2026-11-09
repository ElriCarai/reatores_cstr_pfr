"""Exporta o histórico da conversa com o Claude Code para a aba "Uso de IA".

Uso (na pasta do projeto):
    python ferramentas/exportar_conversa.py              # sessão mais recente
    python ferramentas/exportar_conversa.py <id-da-sessão> [<outro-id> ...]

Lê os arquivos .jsonl que o Claude Code grava em
~/.claude/projects/<pasta-do-projeto>/ e gera uso_de_ia/conversa.json com:
- as mensagens digitadas pelo usuário e as respostas em texto do Claude;
- um resumo das ações de ferramenta (nome + descrição), sem o conteúdo bruto;
- o texto do prompt.docx (o prompt principal da sessão).

Por privacidade, remove e-mails, avisos internos do sistema (<system-reminder>)
e troca o caminho da pasta pessoal por "~". Só usa a biblioteca padrão.
Rode de novo ao final do trabalho para incluir as últimas mensagens.
"""

import json
import re
import sys
import zipfile
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "uso_de_ia" / "conversa.json"
HOME = str(Path.home())

RE_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
RE_BLOCOS_INTERNOS = re.compile(
    r"<(system-reminder|local-command-caveat|local-command-stdout|command-message|"
    r"command-args|pasted_content[^>]*)>.*?</\1>",
    re.S,
)
RE_TAGS_RESTANTES = re.compile(r"</?(command-name|pasted_content)[^>]*>")


def pasta_sessoes():
    nome = re.sub(r"[^A-Za-z0-9]", "-", str(RAIZ))
    return Path.home() / ".claude" / "projects" / nome


def limpar(texto):
    texto = RE_BLOCOS_INTERNOS.sub("", texto)
    texto = RE_TAGS_RESTANTES.sub("", texto)
    texto = RE_EMAIL.sub("[e-mail removido]", texto)
    texto = texto.replace(HOME, "~")
    return texto.strip()


def descrever_ferramenta(bloco):
    nome = bloco.get("name", "ferramenta")
    entrada = bloco.get("input") or {}
    desc = (entrada.get("description") or entrada.get("file_path") or entrada.get("query")
            or entrada.get("skill") or entrada.get("question") or "")
    if nome == "AskUserQuestion":
        perguntas = entrada.get("questions") or []
        desc = " / ".join(q.get("question", "") for q in perguntas)
    return {"nome": nome, "descricao": limpar(str(desc))[:300]}


def _texto_resultado(bloco):
    c = bloco.get("content")
    if isinstance(c, list):
        c = "\n".join(x.get("text", "") for x in c if isinstance(x, dict))
    return c or ""


def formatar_resposta(res):
    """'The user answered: "pergunta"="resposta". Read the answers…' -> pergunta e resposta."""
    corpo = re.sub(r"^The user answered:\s*", "", res)
    corpo = re.split(r"\.\s*Read the answers carefully", corpo)[0]
    pares = re.findall(r'"(.+?)"="(.*?)"(?=,\s*"|$)', corpo, re.S)
    if not pares:
        return corpo
    return "\n\n".join(f"**Pergunta:** {p}\n\n**Resposta:** {r}" for p, r in pares)


def ler_sessao(caminho):
    mensagens = []
    nomes_ferramenta = {}  # tool_use_id -> nome
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        try:
            o = json.loads(linha)
        except json.JSONDecodeError:
            continue
        tipo = o.get("type")
        if tipo not in ("user", "assistant") or o.get("isMeta") or o.get("isSidechain"):
            continue
        conteudo = (o.get("message") or {}).get("content")
        hora = o.get("timestamp", "")
        if tipo == "user":
            partes, imagens = [], 0
            if isinstance(conteudo, str):
                partes.append(conteudo)
            else:
                for b in conteudo or []:
                    if b.get("type") == "text":
                        partes.append(b.get("text", ""))
                    elif b.get("type") == "image":
                        imagens += 1
                    elif b.get("type") == "tool_result":
                        # Respostas do usuário a perguntas e aprovação do plano
                        nome = nomes_ferramenta.get(b.get("tool_use_id"))
                        res = limpar(_texto_resultado(b))
                        if nome == "AskUserQuestion" and res:
                            mensagens.append({"papel": "usuario", "hora": hora, "tipo": "resposta",
                                              "texto": formatar_resposta(res), "imagens": 0})
                        elif nome == "ExitPlanMode" and res:
                            plano = res.split("## Approved Plan:", 1)
                            aprovado = "approved" in res.lower()
                            mensagens.append({
                                "papel": "usuario", "hora": hora, "tipo": "plano",
                                "texto": "Plano aprovado." if aprovado else res[:500],
                                "anexo": plano[1].strip() if len(plano) > 1 else "",
                                "imagens": 0})
            texto = limpar("\n".join(partes))
            if not texto and not imagens:
                continue  # resultado de ferramenta ou mensagem interna
            if texto.startswith("/") and "\n" not in texto and len(texto) < 40:
                continue  # comandos locais como /clear
            mensagens.append({"papel": "usuario", "hora": hora, "texto": texto,
                              "imagens": imagens})
        else:
            textos, ferramentas = [], []
            for b in conteudo or []:
                if b.get("type") == "text" and b.get("text", "").strip():
                    textos.append(limpar(b["text"]))
                elif b.get("type") == "tool_use":
                    nomes_ferramenta[b.get("id")] = b.get("name")
                    ferramentas.append(descrever_ferramenta(b))
            if not textos and not ferramentas:
                continue
            ultima = mensagens[-1] if mensagens else None
            if ultima and ultima["papel"] == "claude":  # agrupa o turno do Claude
                ultima["texto"] = "\n\n".join(t for t in [ultima["texto"], *textos] if t)
                ultima["ferramentas"].extend(ferramentas)
            else:
                mensagens.append({"papel": "claude", "hora": hora,
                                  "texto": "\n\n".join(textos), "ferramentas": ferramentas})
    return mensagens


def texto_docx(caminho):
    if not caminho.exists():
        return ""
    with zipfile.ZipFile(caminho) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    xml = re.sub(r"</w:p>", "\n", xml)
    texto = re.sub(r"<[^>]+>", "", xml)
    for a, b in (("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&apos;", "'"), ("&amp;", "&")):
        texto = texto.replace(a, b)
    return limpar(texto)


def main():
    pasta = pasta_sessoes()
    if len(sys.argv) > 1:
        arquivos = [pasta / f"{s}.jsonl" for s in sys.argv[1:]]
    else:
        todos = sorted(pasta.glob("*.jsonl"), key=lambda p: p.stat().st_mtime)
        if not todos:
            sys.exit(f"Nenhuma sessão encontrada em {pasta}")
        arquivos = [todos[-1]]

    sessoes = []
    for arq in arquivos:
        if not arq.exists():
            sys.exit(f"Sessão não encontrada: {arq}")
        sessoes.append({"id": arq.stem, "mensagens": ler_sessao(arq)})

    dados = {
        "ferramenta": "Claude Code (CLI da Anthropic), modelo Claude Opus 5.5",
        "exportado_em": datetime.now().astimezone().isoformat(timespec="seconds"),
        "prompt_docx": texto_docx(RAIZ / "prompt.docx"),
        "sessoes": sessoes,
    }
    SAIDA.parent.mkdir(exist_ok=True)
    SAIDA.write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
    n = sum(len(s["mensagens"]) for s in sessoes)
    print(f"{n} mensagens exportadas para {SAIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
