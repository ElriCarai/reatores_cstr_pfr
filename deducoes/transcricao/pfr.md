<!--
Transcrição de deducoes/pfr.jpeg (PFR com reciclo).
Para corrigir: edite este arquivo. As equações usam LaTeX entre $$ … $$ (em bloco)
ou $ … $ (no texto). Blocos <div class="duvida"> marcam trechos ilegíveis ou
que pedem confirmação. As cores seguem o pincel do quadro (vermelho / azul).
-->

<div class="bloco vermelho">

## Esquema e definições

<div class="esquema">

$$
\underset{x_0}{F_{A0}} \;\longrightarrow\; \bigoplus \;\longrightarrow\; \underset{x_i}{F_{Ai}} \;\longrightarrow\; \boxed{\quad\text{PFR}\quad} \;\longrightarrow\; \underset{x_j}{F_{Aj}} \;\longrightarrow\; \underset{x_j}{F_A}
\qquad \text{reciclo: } \underset{x_j}{F_{AR}}
\qquad A \to R
$$

</div>

$$F_{Ai} = F_{A0} + F_{AR}$$

$$F_{Aj} = F_A + F_{AR}$$

$$R = \frac{F_{AR}}{F_A}$$

$$F_A = F_{A0}(1-x)$$

$$F_R = F_{A0}\,x$$

</div>

<div class="bloco azul">

## Cinética e equação de projeto

$$-r_A = k\,C_A C_R$$

$$-r_A = k\,C_{A0}(1-x)\,C_{A0}\,x$$

$$-r_A = k\,C_{A0}^2\,x\,(1-x)$$

$$V = F_{A0}\int \frac{dx}{-r_A}$$

</div>

<div class="bloco azul">

## Relação entre $x_i$, $x_j$ e $R$

$$F_{Ai} = F_{A0i}\,(1-x_i)$$

$$F_{Ai} = \Big(F_A + F_R\Big)(1-x_j) \qquad \curvearrowright\; A \to R$$

$$F_{Ai} = \Big(F_{AR} + F_{A0} + F_{RR}\Big)(1-x_i)$$

$$F_{Ai} = \Big(F_A R + F_{A0} + F_R R\Big)(1-x_i)$$

$$F_{Ai} = \Big(R\,F_{A0}(1-x_j) + F_{A0} + \;F_{A0}\,x_j\,R\Big)(1-x_i)$$

$$F_{Ai} = F_{A0}\Big(1 + R\big(1 - \cancel{x_j} + \cancel{x_j}\big)\Big)(1-x_i)$$

$$F_{Ai} = F_{A0}(1+R)\,(1-x_i)$$

$$F_{A0} + F_{AR} = F_{A0}(1+R)(1-x_i)$$

$$F_{AR} = F_{A0}\big((1+R)(1-x_i) - 1\big)$$

$$\frac{F_{AR}}{F_A} = \frac{F_{A0}\big((1+R)(1-x_i) - 1\big)}{F_A}$$

$$R = \frac{\cancel{F_{A0}}\big((1+R)(1-x_i) - 1\big)}{\cancel{F_{A0}}\,(1-x_j)}$$

$$R = \frac{(1+R)(1-x_i) - 1}{(1-x_j)}$$

$$R = \frac{\cancel{1} - x_i + R - R\,x_i \cancel{-1}}{(1-x_j)}$$

$$R = \frac{R(1-x_i)}{(1-x_j)} - \frac{x_i}{(1-x_j)}$$

$$\rightarrow\; R\left(1 - \frac{(1-x_i)}{(1-x_j)}\right) = -\frac{x_i}{(1-x_j)}$$

$$R = \frac{-x_i}{\cancel{(1-x_j)}} \cdot \frac{\cancel{(1-x_j)}}{(1-x_j) - (1-x_i)}$$

$$R = \frac{-x_i}{-x_j + x_i}$$

$$R = \frac{x_i}{x_j - x_i} \qquad /\!/ \qquad x_i = \frac{R\,x_j}{1+R}$$

</div>

<div class="bloco vermelho">

## Integração da equação de projeto

$$V = F_{A0i}\int \frac{dx}{r_A}$$

$$V = \frac{v_0\,(1+R)}{C_{A0}\,k}\int \frac{dx}{x(1-x)}$$

</div>

<div class="bloco azul">

## Integral por frações parciais

$$\int \frac{1}{x(1-x)}\,dx$$

$$\frac{1}{x(1-x)} = \frac{A}{x} + \frac{B}{1-x}$$

$$1 = A(1-x) + B\,x$$

$$1 = A + x\,(B - A)$$

$$A = 1\,;\quad B = 1$$

$$\int \frac{1}{x}\,dx + \int \frac{1}{1-x}\,dx$$

$$\ln(x) - \ln(1-x)$$

$$\ln\!\left(\frac{x}{1-x}\right)\Bigg|_{x_1}^{x_2}$$

$$\ln\!\left(\frac{x_2}{1-x_2}\right) - \ln\!\left(\frac{x_1}{1-x_1}\right)$$

$$\ln\!\left(\frac{x_2(1-x_1)}{x_1(1-x_2)}\right)$$

</div>

<div class="bloco vermelho">

## Volume do PFR e isolamento de $x_j$

$$V = \frac{v_0\,(1+R)}{k\,C_{A0}}\cdot \ln\!\left(\frac{x_2(1-x_1)}{x_1(1-x_2)}\right)$$

$$V = \frac{v_0\,(1+R)}{k\,C_{A0}}\cdot \ln\!\left(\frac{x_j(1-x_i)}{x_i(1-x_j)}\right)$$

$$V = \frac{v_0\,(1+R)}{k\,C_{A0}}\, \ln\!\left(\frac{x_j\left(1 - \dfrac{R\,x_j}{1+R}\right)}{\dfrac{R\,x_j}{1+R}\,(1-x_j)}\right)$$

$$\frac{x_j\left(1 - \dfrac{R\,x_j}{1+R}\right)}{\dfrac{R\,x_j}{1+R}\,(1-x_j)} = e^{\frac{V\,k\,C_{A0}}{v_0\,(1+R)}}$$

$$e^{\frac{V\,k\,C_{A0}}{v_0\,(1+R)}}\cdot\frac{(1-x_j)}{x_j} = \frac{1+R}{R\,x_j} - 1$$

$$e^{\frac{V\,k\,C_{A0}}{v_0\,(1+R)}}\,\frac{(1-x_j)}{\cancel{x_j}} = \frac{(1+R) - R\,x_j}{R\,\cancel{x_j}}$$

$$\rightarrow\; e^{\frac{V\,k\,C_{A0}}{v_0\,(1+R)}}\,(1-x_j) = \frac{1 + R\,(1-x_j)}{R}$$

$$e^{\frac{V\,k\,C_{A0}}{v_0\,(1+R)}}\cdot(1-x_j) = \frac{1}{R} + (1-x_j)$$

$$(1-x_j)\cdot\left(e^{\frac{V\,k\,C_{A0}}{v_0\,(1+R)}} - 1\right) = \frac{1}{R}$$

$$x_j = 1 - \frac{1}{R\left(e^{\frac{V\,k\,C_{A0}}{v_0\,(1+R)}} - 1\right)}$$

</div>
