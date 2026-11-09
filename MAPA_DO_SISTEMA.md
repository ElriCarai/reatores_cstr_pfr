# Mapa do sistema

## Estrutura

```
index.html                  página única com as 7 abas
PFR.py                      modelo do PFR com reciclo (código do aluno)
CSTR.py                     modelo do CSTR: reator, Corrente, split, mix (código do aluno)
site_api.py                 adaptador Python: chama PFR.py/CSTR.py e devolve dicts para o site
assets/
  css/style.css             estilo de todas as abas (responsivo)
  js/worker.js              Web Worker: carrega Pyodide, numpy, sympy e os três .py
  js/api.js                 ponte JS → Python (fila "último pedido vence", debounce)
  js/app.js                 ponto de entrada: abas, status do Python, inicialização
  js/aba-pfr.js             aba PFR: parâmetros, KPIs, gráfico, comparação, tabela
  js/aba-cstr.js            aba 4 CSTRs: montador de arranjo, KPIs, tabela
  js/animacao.js            animações em Canvas (PFR com reciclo e arranjo de CSTRs)
  js/aba-deducoes.js        quadro branco + modal "Ver original" com zoom
  js/aba-textos.js          abas lidas de .md (fundamentação, metodologia, discussão)
  js/aba-codigo.js          aba Código (mostra os .py com realce de sintaxe)
  js/aba-ia.js              aba Uso de IA (lê uso_de_ia/conversa.json)
  js/markdown.js            Markdown + KaTeX
  js/ui.js, js/formato.js   controles de parâmetro e formatação pt-BR (vírgula decimal)
deducoes/
  pfr.jpeg, cstr.jpeg       fotos originais das deduções
  transcricao/pfr.md        transcrição editável (Markdown + LaTeX)
  transcricao/cstr.md
textos/
  fundamentacao.md          editáveis pelo aluno
  metodologia.md
  discussao.md
uso_de_ia/conversa.json     histórico exportado da conversa com o Claude Code
ferramentas/exportar_conversa.py   gera o conversa.json a partir das sessões do Claude Code
```

## Onde cada cálculo vive

Nenhum número exibido é calculado em JavaScript. A única exceção é a interpolação visual das animações: as cores ao longo do tubo e a suavização entre estados.

| Número no site | Origem |
|---|---|
| R ótimo, X<sub>f</sub> máxima, C<sub>A</sub> final, vazão de reciclo | `PFR.calcular()`: expressão X<sub>f</sub>(R), `sympy.diff` + `sympy.nsolve` em dX<sub>f</sub>/dR = 0 |
| Curva e tabela X<sub>f</sub> × R | `PFR.calcular()`: `valores_R`, `valores_xj` (`lambdify` + `np.linspace`) |
| Chute automático do nsolve | `site_api.calcular_pfr()`: escolhe o ponto de partida (o R de maior X<sub>f</sub> na curva do próprio `PFR.py`) e chama `PFR.calcular()` de novo. O método não muda |
| τ = V/v<sub>0</sub>, τ total | `site_api.py` |
| x<sub>i</sub> na entrada do PFR (só para a cor da animação, não é exibido) | `site_api.calcular_pfr()`: x<sub>i</sub> = R·x<sub>j</sub>/(1+R), da dedução `pfr.jpeg` |
| Saída de cada CSTR | `CSTR.reator(xi, vo, k, Cao, V)` chamado por `site_api.reator_cstr()` |
| Correntes | instâncias de `CSTR.Corrente`; C<sub>A</sub> = C<sub>A0</sub>(1 − x) no `site_api.py` |
| Divisores e misturadores do arranjo | `site_api._dividir()` (v·f<sub>i</sub>) e `site_api._misturar()` (Σv<sub>i</sub>; x = Σv<sub>i</sub>x<sub>i</sub>/Σv<sub>i</sub>) |
| Validação do arranjo (4 reatores, soma das frações = 1) | `site_api.validar_arranjo()` |
| Coluna CSTR da comparação | `site_api.calcular_comparacao()`: arranjo ótimo de `cstr.jpeg` com os mesmos k, v<sub>0</sub>, C<sub>A0</sub> e V/4 |
| Parâmetros dos botões "Restaurar" | `site_api.PARAMS_PFR_ENUNCIADO` e `PARAMS_CSTR_ENUNCIADO`; arranjo em `site_api.arranjo_otimo()` |

## Fluxo de uma alteração de parâmetro

```
campo/slider (aba-pfr.js, aba-cstr.js)
  → debounce de 300 ms (imediato ao soltar)
  → api.js → worker.js → site_api.chamar(nome, args)   [Python, Pyodide]
  → PFR.calcular / CSTR.reator
  ← JSON
  → KPIs, gráfico, tabelas, animacao.js
```

Respostas atrasadas de pedidos antigos são descartadas ("último pedido vence"). Assim a animação nunca espera o Python.

## Alterações nos arquivos originais

- `PFR.py`: o script foi envolvido em `calcular(k, vo, Cao, V, R_ini, R_fim, n_pontos, R_chute)`, com os mesmos valores padrão, e `print` e o gráfico ficaram sob `if __name__ == "__main__":`. As linhas da matemática não mudaram, e `python PFR.py` dá o mesmo resultado e o mesmo gráfico.
- `CSTR.py`: sem alterações.
- No navegador, o `site_api.py` registra um módulo vazio no lugar de `matplotlib.pyplot`, que os dois arquivos importam mas só usam fora do site. Isso evita baixar o matplotlib.
