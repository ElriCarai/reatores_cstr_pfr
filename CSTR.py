import sympy as sp
import numpy as np
import matplotlib.pyplot as plt

def reator(xi, vo, k, Cao, V):
    x = sp.Symbol('x')
    c = (x - xi) / (x * (1 - x))

    xj = sp.nsolve(c - (V * k * Cao / vo), x, 0.5)

    return xj
class Corrente:
    def __init__(self, n, vo, x, ca):
        self.n = n
        self.vo = vo
        self.x = x
        self.ca = ca

def split(n, vo):
    return vo / n

def mix(n, vi):
    return vi * n
