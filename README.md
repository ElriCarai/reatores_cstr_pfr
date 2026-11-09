# Otimização de um PFR com reciclo — site da atividade

Site estático que apresenta a atividade de Cálculo de Reatores: a razão de reciclo ótima de um PFR de 400 L para a reação autocatalítica A → R, comparada com o arranjo de 4 CSTRs da questão inspiradora.

Todos os números exibidos vêm do código Python da atividade (`PFR.py` e `CSTR.py`), executado no próprio navegador com [Pyodide](https://pyodide.org). O JavaScript cuida só da interface, dos gráficos e das animações.

## Abas

| Aba | Conteúdo |
|---|---|
| PFR com reciclo | Parâmetros editáveis, R ótimo, X<sub>f</sub> máxima, C<sub>A</sub> final, vazão de reciclo, gráfico X<sub>f</sub> × R, animação, comparação com os CSTRs e tabela R × X<sub>f</sub> |
| Questão inspiradora — 4 CSTRs | Montador de arranjo (estágios em série, ramos em paralelo), esquema animado e corrente de saída de cada reator |
| Deduções | Transcrição das deduções manuscritas em quadro branco, com botão "Ver original" (zoom) |
| Fundamentação e metodologia | Textos de `textos/fundamentacao.md` e `textos/metodologia.md` |
| Código | `PFR.py`, `CSTR.py` e `site_api.py` exatamente como estão |
| Discussão dos resultados | Texto de `textos/discussao.md` |
| Uso de IA | Histórico da conversa com o Claude Code (`uso_de_ia/conversa.json`) |

## Testar localmente

O site precisa ser aberto por um servidor HTTP. Abrir o `index.html` direto (`file://`) não funciona, porque o navegador bloqueia o carregamento dos arquivos `.py`.

```bash
cd atividade_reatores
python -m http.server 8000
```

Abra <http://localhost:8000> no navegador. Na primeira visita, o Python (Pyodide + numpy + sympy, cerca de 20 MB) leva de 5 a 20 s para carregar, com um indicador no topo da página. Nas visitas seguintes, ele vem do cache.

É preciso ter internet: Pyodide, KaTeX, Chart.js, marked e a fonte manuscrita vêm de CDN.

### Conferir o código Python sem o site

```bash
python PFR.py        # imprime R_ótimo e X_f máxima e abre o gráfico (como antes)
python site_api.py   # imprime os resultados do adaptador (PFR e arranjo ótimo dos CSTRs)
```

Os dois precisam de `numpy`, `sympy` e `matplotlib`.

## Editar os textos (sem mexer no HTML)

| O quê | Arquivo |
|---|---|
| Discussão dos resultados | `textos/discussao.md` |
| Fundamentação teórica | `textos/fundamentacao.md` |
| Metodologia computacional | `textos/metodologia.md` |
| Transcrição das deduções | `deducoes/transcricao/pfr.md` e `deducoes/transcricao/cstr.md` |

Os arquivos são Markdown com LaTeX: `$$ ... $$` para equação em bloco e `$ ... $` no meio do texto. O comentário `<!-- ... -->` no topo de cada arquivo lista o que o PDF da atividade pede e não aparece no site. Basta salvar o arquivo e recarregar a página.

## Atualizar o histórico do uso de IA

Ao terminar o trabalho com o Claude Code, rode na pasta do projeto:

```bash
python ferramentas/exportar_conversa.py
```

Esse comando lê a sessão mais recente. Para escolher sessões específicas, passe os IDs: `python ferramentas/exportar_conversa.py <id> [<id> ...]`. O script grava `uso_de_ia/conversa.json` com as mensagens, um resumo das ações de ferramenta e o texto do `prompt.docx`. Ele remove e-mails, avisos internos do sistema e caminhos pessoais. Confira o JSON antes de publicar.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub (por exemplo, `atividade-reatores`).
2. Na pasta do projeto:
   ```bash
   git init
   git add index.html PFR.py CSTR.py site_api.py assets deducoes textos uso_de_ia ferramentas README.md MAPA_DO_SISTEMA.md
   git commit -m "Site da atividade de reatores"
   git branch -M main
   git remote add origin https://github.com/<seu-usuario>/atividade-reatores.git
   git push -u origin main
   ```
   O `git add` acima deixa de fora o `prompt.docx`, o PDF e o arquivo de lock do LibreOffice. Inclua-os se quiser que fiquem públicos.
3. No GitHub, abra **Settings → Pages**. Em **Source**, escolha **Deploy from a branch**, depois **main** e **/ (root)**, e salve.
4. Em um ou dois minutos o site fica em `https://<seu-usuario>.github.io/atividade-reatores/`.

Todos os caminhos do site são relativos, então ele funciona dentro da subpasta do GitHub Pages. O GitHub Pages diferencia maiúsculas de minúsculas: mantenha os nomes `PFR.py` e `CSTR.py` exatamente assim.

**Alternativa (Netlify):** arraste a pasta do projeto para <https://app.netlify.com/drop>.

## Estrutura

Veja [`MAPA_DO_SISTEMA.md`](MAPA_DO_SISTEMA.md).
