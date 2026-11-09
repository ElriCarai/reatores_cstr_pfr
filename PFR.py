#A -> R

import sympy as sp
import numpy as np
import matplotlib.pyplot as plt


def calcular(k=0.001, vo=1.5, Cao=10, V=400, R_ini=0.1, R_fim=5, n_pontos=100, R_chute=1):

    Fao = Cao * vo

    R = sp.Symbol('R')

    xj = 1 - (1/(R*(sp.exp((V*k*Cao)/(vo*(1+R)))-1)))

    der_xj = sp.diff(xj, R)

    R_max = sp.nsolve(der_xj, R, R_chute)

    xj_max = 1 - (1/(R_max*(sp.exp((V*k*Cao)/(vo*(1+R_max)))-1)))

    Ca = Cao*(1-xj_max)
    vr = R_max * vo

    func_graph = sp.lambdify(R, xj, "numpy")

    valores_R = np.linspace(R_ini, R_fim, n_pontos)
    valores_xj = func_graph(valores_R)

    return R_max, xj_max, Ca, vr, valores_R, valores_xj


if __name__ == "__main__":
    R_max, xj_max, Ca, vr, valores_R, valores_xj = calcular()
    print(R_max, xj_max)

    plt.plot(valores_R, valores_xj)
    plt.axvline(x=R_max, color='black', linestyle='--', label=f'Ponto Ótimo (R={R_max:.2f})')
    plt.xlabel("Razão de Reciclo (R)")
    plt.ylabel("Conversão (xj)")
    plt.grid(True)
    plt.legend()
    plt.show()
