"""Adaptador entre o site e o código do usuário (PFR.py e CSTR.py).

Regra deste módulo: NÃO reimplementar a matemática dos modelos.
- PFR com reciclo: tudo vem de PFR.calcular(...).
- CSTR: cada reator chama CSTR.reator(...) e as correntes são CSTR.Corrente.
Aqui só ficam conversões de tipo (sympy/numpy -> float/list para JSON),
o balanço de massa dos divisores/misturadores do montador de arranjos
e grandezas derivadas simples (tau = V/vo, C_A = C_A0(1 - x)).

Todas as funções públicas recebem e devolvem tipos simples (dict, list,
float), para serem chamadas a partir do JavaScript via Pyodide.
"""

import json
import math
import sys
import types


# --- matplotlib -------------------------------------------------------------
# PFR.py e CSTR.py importam matplotlib.pyplot no topo, mas só o usam dentro de
# `if __name__ == "__main__":`. No navegador (Pyodide) o matplotlib não é
# carregado, para economizar download; registramos um módulo vazio no lugar.
try:  # pragma: no cover - depende do ambiente
    import matplotlib.pyplot  # noqa: F401
except ImportError:  # Pyodide sem matplotlib
    _mpl = types.ModuleType("matplotlib")
    _plt = types.ModuleType("matplotlib.pyplot")
    _mpl.pyplot = _plt
    sys.modules["matplotlib"] = _mpl
    sys.modules["matplotlib.pyplot"] = _plt

import PFR  # noqa: E402
import CSTR  # noqa: E402


# --- valores do enunciado (botões "Restaurar") ------------------------------
# Os valores padrão do PFR são os mesmos da assinatura de PFR.calcular.
PARAMS_PFR_ENUNCIADO = {
    "k": 0.001,      # L/(mol·s)
    "vo": 1.5,       # L/s
    "Cao": 10.0,     # mol/L
    "V": 400.0,      # L
    "R_ini": 0.1,
    "R_fim": 5.0,
    "n_pontos": 100,
    "R_chute": 1.0,
    "chute_auto": True,  # opção do site (não existe no PFR.py); ver calcular_pfr
}

PARAMS_CSTR_ENUNCIADO = {
    "k": 0.001,      # L/(mol·s)
    "vo": 1.5,       # L/s
    "Cao": 10.0,     # mol/L
    "V": 100.0,      # L (cada reator)
    "n_reatores": 4,
}

TOL_FRACAO = 1e-9


def _f(valor):
    """Converte sympy/numpy/int para float de Python; não finito -> None."""
    v = float(valor)
    return v if math.isfinite(v) else None


def _br(v, fmt=".4f"):
    """Número formatado com vírgula decimal (mensagens exibidas no site)."""
    return format(v, fmt).replace(".", ",")


def parametros_enunciado():
    return {"pfr": dict(PARAMS_PFR_ENUNCIADO), "cstr": dict(PARAMS_CSTR_ENUNCIADO)}


# --- PFR com reciclo --------------------------------------------------------
def _rodar_pfr(p):
    """Uma chamada de PFR.calcular com os parâmetros p (sem lógica de chute)."""
    try:
        R_max, xj_max, Ca, vr, valores_R, valores_xj = PFR.calcular(
            k=p["k"], vo=p["vo"], Cao=p["Cao"], V=p["V"],
            R_ini=p["R_ini"], R_fim=p["R_fim"],
            n_pontos=p["n_pontos"], R_chute=p["R_chute"],
        )
        R_ot = _f(R_max)
        xj = _f(xj_max)
    except Exception as e:  # nsolve sem convergência, divisão por zero etc.
        msg = str(e).splitlines()[0] if str(e) else ""
        return {"ok": False, "erro": f"{type(e).__name__}: {msg}", "params": dict(p)}

    avisos = []
    if R_ot is None or R_ot <= 0:
        avisos.append(f"O nsolve convergiu para R = {_br(R_ot, '.6g')} (não físico: R deve ser > 0). "
                      "Tente outro chute inicial." if R_ot is not None else
                      "O nsolve não devolveu um R finito.")
    if xj is None or not 0 <= xj <= 1:
        avisos.append(f"Conversão fora de [0, 1]: x_f = {_br(xj) if xj is not None else xj}.")

    fisico = not avisos
    return {
        "ok": True,
        "fisico": fisico,
        "avisos": avisos,
        "params": dict(p),
        "R_otimo": R_ot,
        "xj_max": xj,
        "Ca_final": _f(Ca),
        "vazao_reciclo": _f(vr),
        "tau": _f(p["V"] / p["vo"]),
        # Usado SÓ para a cor das partículas na animação (não é exibido):
        # x_i = R·x_j/(1+R), equação da dedução do usuário (deducoes/pfr.jpeg).
        "anim_xi": _f(R_ot * xj / (1 + R_ot)) if fisico else None,
        "curva": {
            "R": [_f(r) for r in valores_R],
            "xj": [_f(x) for x in valores_xj],
        },
    }


def _R_do_maximo_da_curva(res):
    """R da malha (valores_R do PFR.py) onde valores_xj é máximo."""
    pares = [(x, r) for r, x in zip(res["curva"]["R"], res["curva"]["xj"])
             if r is not None and x is not None and 0 <= x <= 1]
    return max(pares)[1] if pares else None


def calcular_pfr(params=None):
    """Chama PFR.calcular e devolve um dict pronto para JSON.

    Chute automático (params["chute_auto"] = True): o método continua sendo o
    nsolve do PFR.py; só o ponto de partida muda. Primeiro roda com o chute do
    campo. Se o resultado for físico e não estiver abaixo do máximo da própria
    curva valores_R × valores_xj, ele é mantido (assim, com os parâmetros do
    enunciado e chute 1, o resultado é idêntico ao de `python PFR.py`). Senão,
    o chute passa a ser o R da malha com maior X_f e o PFR.calcular roda de novo.
    """
    p = dict(PARAMS_PFR_ENUNCIADO)
    p.update(params or {})
    auto = bool(p.pop("chute_auto", False))
    p["n_pontos"] = int(p["n_pontos"])

    res = _rodar_pfr(p)
    res["chute_usado"] = p["R_chute"]
    res["chute_auto"] = auto
    res["chute_ajustado"] = False
    if not auto:
        return res

    if res["ok"] and res["fisico"]:
        R_malha = _R_do_maximo_da_curva(res)
        x_malha = max(x for x in res["curva"]["xj"] if x is not None)
        if res["xj_max"] >= x_malha - 1e-12:
            return res
    # Precisa de uma curva para escolher o chute: usa a da primeira tentativa
    # ou, se o nsolve falhou, tenta chutes espalhados na faixa de R.
    curva_de = res if res["ok"] else None
    if curva_de is None:
        n = 8
        for i in range(n):
            c = p["R_ini"] + (p["R_fim"] - p["R_ini"]) * (i + 0.5) / n
            t = _rodar_pfr(dict(p, R_chute=c))
            if t["ok"]:
                curva_de = t
                break
    if curva_de is None:
        res["erro"] = ("O nsolve do PFR.py não encontrou dX_f/dR = 0 com nenhum chute "
                       "na faixa de R. Possível causa: não há ótimo interior nessa faixa "
                       "(X_f só cresce ou só cai com R). Detalhe: " + res.get("erro", ""))
        return res
    R0 = _R_do_maximo_da_curva(curva_de)
    if R0 is None:
        return res
    novo = _rodar_pfr(dict(p, R_chute=R0))
    novo["chute_usado"] = R0
    novo["chute_auto"] = True
    novo["chute_ajustado"] = True
    novo["params"]["R_chute"] = p["R_chute"]
    return novo


def calcular_comparacao(params=None):
    """Aba PFR: PFR com reciclo + arranjo ótimo de cstr.jpeg com os mesmos
    k, v0 e C_A0, e volume total igual (cada CSTR = V/4)."""
    pfr = calcular_pfr(params)
    p = pfr["params"]
    n = PARAMS_CSTR_ENUNCIADO["n_reatores"]
    cstr = calcular_arranjo(arranjo_otimo(), {"k": p["k"], "vo": p["vo"],
                                              "Cao": p["Cao"], "V": p["V"] / n})
    return {"pfr": pfr, "cstr": cstr}


# --- CSTR -------------------------------------------------------------------
def _fisico(x):
    return x is not None and 0.0 <= x <= 1.0


def reator_cstr(corrente, V, k, Cao):
    """Recebe uma CSTR.Corrente, chama CSTR.reator e devolve a corrente de saída."""
    xj = _f(CSTR.reator(corrente.x, corrente.vo, k, Cao, V))
    return CSTR.Corrente(corrente.n, corrente.vo, xj, Cao * (1 - xj) if xj is not None else None)


def _dividir(corrente, fracoes):
    """Divisor: cada ramo recebe vo·f_i, com a mesma composição."""
    n = len(fracoes)
    return [CSTR.Corrente(n, corrente.vo * f, corrente.x, corrente.ca) for f in fracoes]


def _misturar(correntes, Cao):
    """Misturador: balanço de A com densidade constante e mesmo C_A0.
    vo = Σ vo_i ;  x = Σ(vo_i·x_i) / Σ vo_i ;  C_A = C_A0·(1 - x)."""
    vo = sum(c.vo for c in correntes)
    x = sum(c.vo * c.x for c in correntes) / vo
    return CSTR.Corrente(len(correntes), vo, x, Cao * (1 - x))


def _c2d(c):
    return {"vo": _f(c.vo), "x": _f(c.x) if c.x is not None else None,
            "ca": _f(c.ca) if c.ca is not None else None}


def arranjo_otimo():
    """Arranjo de deducoes/cstr.jpeg: 3 CSTRs em paralelo (0,5 L/s cada)
    -> mistura -> 1 CSTR em série."""
    return {
        "estagios": [
            {"ramos": [{"fracao": "1/3", "reatores": 1},
                       {"fracao": "1/3", "reatores": 1},
                       {"fracao": "1/3", "reatores": 1}]},
            {"ramos": [{"fracao": "1", "reatores": 1}]},
        ]
    }


def _frac(v):
    """Aceita número ou texto '1/3', '0,5', '0.5'."""
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace(",", ".")
    if "/" in s:
        a, b = s.split("/", 1)
        return float(a) / float(b)
    return float(s)


def validar_arranjo(arranjo, n_reatores=4):
    erros = []
    estagios = arranjo.get("estagios", [])
    if not estagios:
        erros.append("O arranjo precisa de pelo menos um estágio.")
    total = 0
    for i, est in enumerate(estagios, 1):
        ramos = est.get("ramos", [])
        if not 1 <= len(ramos) <= 4:
            erros.append(f"Estágio {i}: use de 1 a 4 ramos.")
        soma = 0.0
        for j, r in enumerate(ramos, 1):
            try:
                f = _frac(r["fracao"])
            except Exception:
                erros.append(f"Estágio {i}, ramo {j}: fração inválida.")
                continue
            if f <= 0:
                erros.append(f"Estágio {i}, ramo {j}: a fração deve ser > 0.")
            soma += f
            nr = int(r.get("reatores", 0))
            if nr < 1:
                erros.append(f"Estágio {i}, ramo {j}: pelo menos 1 reator.")
            total += nr
        if ramos and abs(soma - 1.0) > TOL_FRACAO:
            erros.append(f"Estágio {i}: a soma das frações é {_br(soma, '.6g')} (deve ser 1).")
    if total != n_reatores:
        erros.append(f"O arranjo usa {total} reatores; devem ser {n_reatores}.")
    return erros


def calcular_arranjo(arranjo=None, params=None):
    """Propaga as correntes pelo arranjo (estágios em série, ramos em paralelo,
    reatores em série dentro de cada ramo). Cada reator chama CSTR.reator."""
    p = dict(PARAMS_CSTR_ENUNCIADO)
    p.update(params or {})
    arranjo = arranjo or arranjo_otimo()
    erros = validar_arranjo(arranjo, int(p["n_reatores"]))
    if erros:
        return {"ok": False, "erros": erros, "params": p, "arranjo": arranjo}

    k, Cao, V = p["k"], p["Cao"], p["V"]
    corrente = CSTR.Corrente(1, p["vo"], 0.0, Cao)  # alimentação fresca
    alimentacao = _c2d(corrente)
    estagios_out = []
    avisos = []

    for i, est in enumerate(arranjo["estagios"], 1):
        fracoes = [_frac(r["fracao"]) for r in est["ramos"]]
        entradas = _dividir(corrente, fracoes)
        ramos_out = []
        saidas = []
        for j, (r, c) in enumerate(zip(est["ramos"], entradas), 1):
            reatores = []
            entrada_ramo = _c2d(c)
            for t in range(1, int(r["reatores"]) + 1):
                ent = _c2d(c)
                try:
                    c = reator_cstr(c, V, k, Cao)
                    sai = _c2d(c)
                    fis = _fisico(sai["x"])
                except Exception as e:
                    sai, fis = {"vo": ent["vo"], "x": None, "ca": None}, False
                    avisos.append(f"Estágio {i}, ramo {j}, reator {t}: o nsolve do CSTR.reator falhou ({type(e).__name__}).")
                if not fis and sai["x"] is not None:
                    avisos.append(
                        f"Estágio {i}, ramo {j}, reator {t}: o CSTR.reator devolveu x = {_br(sai['x'])}, "
                        "solução não física (fora de [0, 1])."
                    )
                reatores.append({"id": f"E{i}R{j}T{t}", "estagio": i, "ramo": j,
                                 "posicao": t, "V": V, "entrada": ent,
                                 "saida": sai, "fisico": fis})
                if not fis:
                    return {"ok": False, "erros": avisos, "params": p,
                            "arranjo": arranjo, "alimentacao": alimentacao,
                            "estagios": estagios_out + [{"ramos": ramos_out + [
                                {"fracao": fracoes[j - 1], "entrada": entrada_ramo,
                                 "reatores": reatores, "saida": sai}]}]}
            ramos_out.append({"fracao": fracoes[j - 1], "entrada": entrada_ramo,
                              "reatores": reatores, "saida": _c2d(c)})
            saidas.append(c)
        corrente = _misturar(saidas, Cao)
        estagios_out.append({"ramos": ramos_out, "mistura": _c2d(corrente)})

    final = _c2d(corrente)
    n = int(p["n_reatores"])
    return {
        "ok": True,
        "params": p,
        "arranjo": arranjo,
        "alimentacao": alimentacao,
        "estagios": estagios_out,
        "final": final,
        "x_global": final["x"],
        "Ca_final": final["ca"],
        "V_total": _f(n * V),
        "tau_total": _f(n * V / p["vo"]),
    }


# --- ponte JSON para o JavaScript -------------------------------------------
_FUNCOES = {
    "parametros_enunciado": parametros_enunciado,
    "calcular_pfr": calcular_pfr,
    "calcular_comparacao": calcular_comparacao,
    "arranjo_otimo": arranjo_otimo,
    "calcular_arranjo": calcular_arranjo,
}


def chamar(nome, args_json="[]"):
    """Chamado pelo worker: chamar('calcular_pfr', '[{...}]') -> JSON."""
    args = json.loads(args_json)
    return json.dumps(_FUNCOES[nome](*args))


if __name__ == "__main__":
    r = calcular_pfr()
    print("PFR:", {k: r[k] for k in ("R_otimo", "xj_max", "Ca_final", "vazao_reciclo", "tau")})
    a = calcular_arranjo()
    print("CSTR ótimo:", a["x_global"], a["Ca_final"])
