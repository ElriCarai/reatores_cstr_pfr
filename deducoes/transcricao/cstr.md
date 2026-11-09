<!--
Transcrição de deducoes/cstr.jpeg (questão inspiradora — 4 CSTRs de 100 L).
Para corrigir: edite este arquivo. As equações usam LaTeX entre $$ … $$ (em bloco)
ou $ … $ (no texto). Blocos <div class="duvida"> marcam trechos ilegíveis ou
que pedem confirmação. As cores seguem o pincel do quadro (vermelho / azul).
-->

<div class="bloco preto">

## Reatores disponíveis

$A \to R$ — quatro reatores de **100 L**: $\boxed{100\text{ L}}\ \ \boxed{100\text{ L}}\ \ \boxed{100\text{ L}}\ \ \boxed{100\text{ L}}$

</div>

<div class="bloco vermelho">

## Dados

$$-r_A = k\,C_A C_R$$

$$V = \frac{F_{A0}\cdot x}{-r_A}$$

$$v_0 = 1{,}5\ \text{L/s}$$

$$k = 0{,}001\ \frac{\text{L}}{\text{mol}\cdot\text{s}}$$

$$C_{A0} = 10\ \text{mol/L}$$

</div>

<div class="bloco azul">

## Conversão de taxa máxima

$$-r_A = k\,C_{A0}(1-x)\,C_{A0}\,x$$

$$-r_A = k\,C_{A0}^2\,x\,(1-x)$$

$$-\frac{dr_A}{dx} = k\,C_{A0}^2\,\frac{x(1-x)}{dx}$$

$$-\frac{dr_A}{dx} = k\,C_{A0}^2\,(1 - 2x)$$

$$k\,C_{A0}^2\,(1 - 2x) = 0$$

$$1 - 2x = 0$$

$$x = \frac{1}{2} = 0{,}5$$

</div>

<div class="bloco vermelho texto">

→ Logo a velocidade da reação é máxima quando a taxa de conversão é equivalente a 0,5.

O que implica encontrarmos um arranjo de reatores que satisfaça essa condição.

Para isso, como o volume do reator é fixo, a concentração inicial de A também e o mesmo para concentração de 0,5, a única variável que conseguimos controlar é o F<sub>A0</sub>.

</div>

<div class="bloco azul">

## Vazão por reator

$$V = \frac{\overset{\curvearrowright\ \cancel{C_{A0}}\,v_0}{F_{A0}}\cdot \cancel{x}}{k\,C_{A0}^{\cancel{2}}\,\cancel{x}\,(1-x)}$$

$$V = \frac{v_0}{k\,C_{A0}\,(1-x)}$$

$$v_0 = V\,k\,C_{A0}\,(1-x)$$

$$v_0 = 0{,}5\ \text{L/s}$$

</div>

<div class="bloco vermelho texto">

→ Para chegar nessa vazão precisaríamos dividir nossa corrente inicial por 3, logo, a corrente entra em 3 reatores em paralelo.

</div>

<div class="bloco azul">

## Melhor configuração para maximizar a conversão

<div class="esquema">

$$
1{,}5\ \text{L/s}\ \longrightarrow
\begin{cases}
0{,}5\ \text{L/s} \to \boxed{100\text{ L}} \\
0{,}5\ \text{L/s} \to \boxed{100\text{ L}} \\
0{,}5\ \text{L/s} \to \boxed{100\text{ L}}
\end{cases}
\longrightarrow\ F_{Ai}\ \longrightarrow\ \boxed{100\text{ L}}\ \longrightarrow\ F_{Aj}
$$

</div>

</div>

<div class="bloco azul">

## Balanço no CSTR em série

$$F_{Ai} - F_{Aj} + V\cdot r_A = 0$$

$$V = \frac{F_{Ai} - F_{Aj}}{-r_A}$$

$$V = \frac{F_{A0}(1-x_i) - F_{A0}(1-x_j)}{-r_A}$$

$$V = \frac{\overset{\curvearrowright\ C_{A0}\,v_0}{F_{A0}}\,(x_j - x_i)}{k\,C_{A0}^{2}\,x_j\,(1-x_j)}$$

$$V = \frac{v_0\,(x_j - x_i)}{k\,C_{A0}\,x_j\,(1-x_j)}$$

$$\frac{V\cdot k\,C_{A0}}{v_0} = \frac{(x_j - x_i)}{x_j\,(1-x_j)}$$

<p class="vermelho-texto">Aplicando solver:</p>

$$x_j = 0{,}6514 \quad\longrightarrow\quad C_A = C_{A0}\,(1 - x_j)$$

$$C_A = 3{,}486\ \text{mol/L}$$

</div>
