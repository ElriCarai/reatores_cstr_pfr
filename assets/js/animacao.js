/* Animações em Canvas 2D (sem bibliotecas).
 * Exceção permitida pelo projeto: a interpolação VISUAL (cores ao longo do
 * tubo, suavização entre estados). Nenhum número exibido nasce aqui: os
 * rótulos mostram valores recebidos do Python. */
import { num } from "./formato.js";

const PARADAS = [[37, 99, 235], [155, 89, 182], [234, 88, 12]]; // A → R
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

export function corConversao(x, alfa = 1) {
  if (x === null || x === undefined || Number.isNaN(x)) return `rgba(148,163,184,${alfa})`;
  const t = clamp(x, 0, 1) * 2;
  const i = t < 1 ? 0 : 1;
  const f = t - i;
  const c = PARADAS[i].map((v, k) => Math.round(lerp(v, PARADAS[i + 1][k], f)));
  return `rgba(${c[0]},${c[1]},${c[2]},${alfa})`;
}

/* Caminho poligonal com posição por distância percorrida. */
class Caminho {
  constructor(pts) {
    this.pts = pts;
    this.seg = [];
    this.L = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      this.seg.push(l);
      this.L += l;
    }
  }
  pos(d) {
    d = clamp(d, 0, this.L);
    for (let i = 0; i < this.seg.length; i++) {
      if (d <= this.seg[i] || i === this.seg.length - 1) {
        const f = this.seg[i] ? d / this.seg[i] : 0;
        const a = this.pts[i], b = this.pts[i + 1];
        return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
      }
      d -= this.seg[i];
    }
    return this.pts[this.pts.length - 1];
  }
  tracar(ctx) {
    ctx.beginPath();
    ctx.moveTo(...this.pts[0]);
    for (const p of this.pts.slice(1)) ctx.lineTo(...p);
  }
}

class CenaBase {
  constructor(canvas, W, H) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.W = W;
    this.H = H;
    this.parts = [];
    this.acum = 0;
    this.visivel = true;
    this.t = 0;
    this.ajustar();
    new ResizeObserver(() => this.ajustar()).observe(canvas);
    new IntersectionObserver((e) => { this.visivel = e[0].isIntersecting; }).observe(canvas);
    let ultimo = performance.now();
    const quadro = (agora) => {
      const dt = Math.min((agora - ultimo) / 1000, 0.05);
      ultimo = agora;
      if (this.visivel && this.canvas.clientWidth > 0) {
        this.t += dt;
        this.passo(dt);
        this.desenhar();
      }
      requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  }
  setAltura(H) { if (H !== this.H) { this.H = H; this.ajustar(); } }
  ajustar() {
    const css = this.canvas.clientWidth || 600;
    const estreito = css < 600;
    if (estreito !== this.layoutEstreito) {
      this.layoutEstreito = estreito;
      if (this.aoMudarLayout) this.aoMudarLayout(estreito);
    }
    const alt = (css * this.H) / this.W;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.height = `${alt}px`;
    this.canvas.width = Math.round(css * dpr);
    this.canvas.height = Math.round(alt * dpr);
    this.esc = (css / this.W) * dpr;
  }
  inicioQuadro() {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(this.esc, 0, 0, this.esc, 0, 0);
    // Fonte em unidades lógicas, para ficar com ~12–13 px reais em qualquer largura
    const escalaCss = (this.canvas.clientWidth || this.W) / this.W;
    this.fonte = clamp(12.5 / escalaCss, 14, 34);
    this.estreito = this.fonte > 19;
    return c;
  }
  texto(t, x, y, { cor = "#475569", alinhar = "center", negrito = false, tam = 1 } = {}) {
    const c = this.ctx;
    c.fillStyle = cor;
    c.textAlign = alinhar;
    c.textBaseline = "middle";
    c.font = `${negrito ? 600 : 400} ${this.fonte * tam}px system-ui, sans-serif`;
    c.fillText(t, x, y);
  }
  aquecer(seg = 12) { for (let i = 0; i < seg * 20; i++) this.passo(0.05); }
}

/* ======================================================= PFR com reciclo */
export class CenaPFR extends CenaBase {
  constructor(canvas) {
    super(canvas, 1000, 340);
    this.alvo = null;      // último estado vindo do Python
    this.vis = null;       // estado suavizado (só visual)
    const yP = 235, yR = 85;
    this.xM = 190; this.xS = 830; this.xRe0 = 250; this.xRe1 = 750;
    this.yP = yP; this.yR = yR;
    this.cAlim = new Caminho([[20, yP], [this.xM, yP]]);
    this.cReator = new Caminho([[this.xM, yP], [this.xS, yP]]);
    this.cReciclo = new Caminho([[this.xS, yP], [this.xS, yR], [this.xM, yR], [this.xM, yP]]);
    this.cProduto = new Caminho([[this.xS, yP], [985, yP]]);
    this.ajustar();
  }

  aoMudarLayout(estreito) { this.H = estreito ? 400 : 340; }

  /* estado = { valido, vo, V, R, xi, xj, vr } (todos do Python) */
  setEstado(e) {
    const primeiro = !this.vis || !this.vis.valido;
    this.alvo = e;
    if (!this.vis) this.vis = { ...e };
    if (e.valido && primeiro) { this.vis = { ...e }; this.parts = []; this.aquecer(); }
  }

  passo(dt) {
    if (!this.alvo) return;
    const a = this.alvo, v = this.vis, f = 1 - Math.exp(-dt * 4);
    v.valido = a.valido;
    if (a.valido) for (const k of ["vo", "R", "xi", "xj", "V"]) v[k] = lerp(v[k], a[k], f);

    // emissão proporcional à vazão de alimentação
    if (v.valido) {
      this.acum += Math.min(v.vo * 7, 45) * dt;
      while (this.acum >= 1 && this.parts.length < 1200) {
        this.acum -= 1;
        this.parts.push({ fase: "alim", d: 0, x: 0, off: (Math.random() - 0.5) * 10 });
      }
    }
    const fracRec = v.R / (1 + v.R);
    // tempo visual dentro do PFR ~ V / ((1+R) v0), comprimido para a tela
    const tRes = clamp(0.8 + (3 * v.V) / ((1 + v.R) * v.vo) / 100, 0.9, 8);
    const velReator = this.cReator.L / tRes;
    const larg = this.xRe1 - this.xRe0;

    const vivos = [];
    for (const p of this.parts) {
      if (p.fase === "alim") {
        p.d += 210 * dt;
        p.x = 0;
        if (p.d >= this.cAlim.L) { p.fase = "reator"; p.d = 0; p.off = (Math.random() - 0.5) * 46; }
      } else if (p.fase === "reator") {
        p.d += velReator * dt;
        const [px] = this.cReator.pos(p.d);
        const u = clamp((px - this.xRe0) / larg, 0, 1);
        p.x = px < this.xRe0 ? v.xi : lerp(v.xi, v.xj, u);
        if (p.d >= this.cReator.L) {
          p.d = 0;
          p.off = (Math.random() - 0.5) * 8;
          p.fase = Math.random() < fracRec ? "reciclo" : "produto";
        }
      } else if (p.fase === "reciclo") {
        p.d += 260 * dt;
        p.x = v.xj;
        if (p.d >= this.cReciclo.L) { p.fase = "reator"; p.d = 0; p.off = (Math.random() - 0.5) * 46; }
      } else if (p.fase === "produto") {
        p.d += 210 * dt;
        p.x = v.xj;
        if (p.d >= this.cProduto.L) continue;
      }
      if (!v.valido && Math.random() < dt * 2) continue; // esvazia se inválido
      vivos.push(p);
    }
    this.parts = vivos;
  }

  desenhar() {
    const c = this.inicioQuadro();
    const v = this.vis, a = this.alvo;
    const valido = v && v.valido;
    const f = valido ? v.R / (1 + v.R) : 0;

    // tubulações
    c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = "#e2e8f0"; c.lineWidth = 16;
    this.cAlim.tracar(c); c.stroke();
    this.cProduto.tracar(c); c.stroke();
    c.beginPath(); c.moveTo(this.xM, this.yP); c.lineTo(this.xRe0, this.yP);
    c.moveTo(this.xRe1, this.yP); c.lineTo(this.xS, this.yP); c.stroke();
    // reciclo: espessura e intensidade acompanham R
    c.strokeStyle = valido ? corConversao(v.xj, 0.15 + 0.55 * f) : "#e2e8f0";
    c.lineWidth = 6 + 16 * f;
    this.cReciclo.tracar(c); c.stroke();

    // corpo do PFR
    const g = c.createLinearGradient(this.xRe0, 0, this.xRe1, 0);
    g.addColorStop(0, valido ? corConversao(v.xi, 0.22) : "#f1f5f9");
    g.addColorStop(1, valido ? corConversao(v.xj, 0.22) : "#f1f5f9");
    c.fillStyle = g; c.strokeStyle = "#94a3b8"; c.lineWidth = 2;
    c.beginPath(); c.roundRect(this.xRe0, this.yP - 32, this.xRe1 - this.xRe0, 64, 10); c.fill(); c.stroke();

    // nós de mistura e divisão
    for (const x of [this.xM, this.xS]) {
      c.fillStyle = "#fff"; c.strokeStyle = "#64748b"; c.lineWidth = 2;
      c.beginPath(); c.arc(x, this.yP, 9, 0, Math.PI * 2); c.fill(); c.stroke();
    }

    // partículas
    for (const p of this.parts) {
      const cam = p.fase === "alim" ? this.cAlim : p.fase === "reator" ? this.cReator
        : p.fase === "reciclo" ? this.cReciclo : this.cProduto;
      let [x, y] = cam.pos(p.d);
      if (p.fase === "reciclo") {
        if (Math.abs(y - this.yR) < 1) y += p.off; else x += p.off;
      } else if (p.fase === "reator" && x >= this.xRe0 && x <= this.xRe1) y += p.off;
      else y += p.off * 0.25;
      c.fillStyle = corConversao(p.x, 0.9);
      c.beginPath(); c.arc(x, y, 4.2, 0, Math.PI * 2); c.fill();
    }

    // rótulos (valores do Python)
    const yT = this.yP + 62;
    if (a && a.valido && this.estreito) {
      const L2 = this.fonte * 1.25;
      this.texto("Alimentação", 100, yT, { negrito: true });
      this.texto(`v₀ = ${num(a.vo, 2)} L/s`, 100, yT + L2);
      this.texto(`PFR ${num(a.V, 0)} L`, (this.xRe0 + this.xRe1) / 2, yT, { negrito: true });
      this.texto("Produto", 900, yT, { negrito: true });
      this.texto(`X_f = ${num(a.xj, 4)}`, 900, yT + L2);
      this.texto(`R = ${num(a.R, 4)} · v_R = ${num(a.vr, 3)} L/s`,
        (this.xM + this.xS) / 2, this.yR - 36, { negrito: true, cor: "#334155" });
    } else if (a && a.valido) {
      this.texto("Alimentação", 100, yT, { negrito: true });
      this.texto(`v₀ = ${num(a.vo, 2)} L/s · x = 0`, 100, yT + 24);
      this.texto(`PFR  V = ${num(a.V, 0)} L`, (this.xRe0 + this.xRe1) / 2, yT, { negrito: true });
      this.texto(`τ = V/v₀ = ${num(a.tau, 1)} s`, (this.xRe0 + this.xRe1) / 2, yT + 24);
      this.texto("Produto", 910, yT, { negrito: true });
      this.texto(`X_f = ${num(a.xj, 4)}`, 910, yT + 24);
      this.texto(`Reciclo  R = ${num(a.R, 4)}  ·  v_R = R·v₀ = ${num(a.vr, 3)} L/s`,
        (this.xM + this.xS) / 2, this.yR - 34, { negrito: true, cor: "#334155" });
    } else {
      this.texto(a && a.mensagem ? a.mensagem : "Aguardando o Python…",
        (this.xRe0 + this.xRe1) / 2, this.yP, { cor: "#64748b" });
    }
  }
}

/* ======================================================= Arranjo de CSTRs */
export class CenaCSTR extends CenaBase {
  constructor(canvas) {
    super(canvas, 1000, 300);
    this.chave = "";
    this.res = null;
    this.tanques = [];
    this.arranjo = null;
  }

  /* Em telas estreitas, usa uma largura lógica menor (tudo fica maior). */
  aoMudarLayout(estreito) {
    this.W = estreito ? 620 : 1000;
    if (this.arranjo) {
      this.montar(this.arranjo);
      this.aplicar(this.res);
      this.parts = [];
      if (this.res && this.res.ok) this.aquecer(15);
    }
  }

  /* arranjo: estrutura do montador; res: resposta do Python (ou null) */
  setDados(arranjo, res) {
    const chave = JSON.stringify(arranjo.estagios.map((e) => e.ramos.map((r) => r.reatores)));
    const valido = !!(res && res.ok);
    this.arranjo = arranjo;
    if (chave !== this.chave) {
      this.chave = chave;
      this.montar(arranjo);
      this.parts = [];
      this.res = res;
      this.aplicar(res);
      if (valido) this.aquecer(15);
    } else {
      const eraValido = !!(this.res && this.res.ok);
      this.res = res;
      this.aplicar(res);
      if (valido && !eraValido) { this.parts = []; this.aquecer(15); }
    }
  }

  montar(arranjo) {
    const est = arranjo.estagios;
    const NO = 0.55;
    const total = est.reduce((s, e) => s + Math.max(...e.ramos.map((r) => r.reatores)) + NO * 2, 0);
    const maxRamos = Math.max(...est.map((e) => e.ramos.length));
    const ESP = 125;
    const H = Math.max(250, maxRamos * ESP + 90);
    this.setAltura(H);
    const yC = H / 2 + 8;
    const unid = Math.min(200, (this.W - 75 - 170) / total);
    this.lado = clamp(unid * 0.5, 34, 66);
    let cursor = 75;
    this.yC = yC;
    this.estagios = [];
    this.tanques = [];
    for (const [i, e] of est.entries()) {
      const maxS = Math.max(...e.ramos.map((r) => r.reatores));
      const xDiv = cursor + (NO * unid) / 2;
      const x0 = cursor + NO * unid;
      const xMis = x0 + maxS * unid + (NO * unid) / 2;
      const ramos = e.ramos.map((r, j) => {
        const y = yC + (j - (e.ramos.length - 1) / 2) * ESP;
        const tq = [];
        for (let t = 0; t < r.reatores; t++) {
          const tanque = { cx: x0 + ((t + 0.5) * maxS * unid) / r.reatores, cy: y,
                           x: null, vo: null, ang: Math.random() * 6, id: `E${i + 1}R${j + 1}T${t + 1}` };
          tq.push(tanque);
          this.tanques.push(tanque);
        }
        return { y, tanques: tq, frac: null, vo: null };
      });
      this.estagios.push({ xDiv, xMis, ramos, xMist: null });
      cursor = x0 + maxS * unid + NO * unid;
    }
    this.xFim = this.W - 15;
  }

  aplicar(res) {
    const ok = res && res.estagios;
    for (const [i, e] of this.estagios.entries()) {
      const re = ok ? res.estagios[i] : null;
      e.xMist = re && re.mistura ? re.mistura.x : null;
      for (const [j, r] of e.ramos.entries()) {
        const rr = re && re.ramos[j];
        r.frac = rr ? rr.fracao : null;
        r.vo = rr ? rr.entrada.vo : null;
        for (const [t, tq] of r.tanques.entries()) {
          const rt = rr && rr.reatores[t];
          tq.x = rt && rt.fisico ? rt.saida.x : null;
          tq.vo = rt ? rt.entrada.vo : null;
          tq.V = rt ? rt.V : null;
        }
      }
    }
  }

  novaParticula() {
    const pernas = [];
    let x = this.lado / 2;
    let p0 = [15, this.yC];
    const mover = (b, xDepois) => { pernas.push({ tipo: "mover", a: p0, b, xDepois }); p0 = b; };
    for (const e of this.estagios) {
      let r = Math.random(), j = 0, acc = 0;
      for (; j < e.ramos.length - 1; j++) { acc += e.ramos[j].frac; if (r < acc) break; }
      const ramo = e.ramos[j];
      mover([e.xDiv, this.yC]);
      mover([e.xDiv, ramo.y]);
      for (const tq of ramo.tanques) {
        mover([tq.cx - this.lado / 2, ramo.y]);
        pernas.push({ tipo: "tanque", tq });
        p0 = [tq.cx + this.lado / 2, ramo.y];
      }
      mover([e.xMis, ramo.y]);
      mover([e.xMis, this.yC], "mistura");
      pernas[pernas.length - 1].est = e;
    }
    mover([this.xFim, this.yC]);
    return { pernas, i: 0, d: 0, t: 0, x: 0, fa: Math.random() * 6, fb: Math.random() * 6 };
  }

  passo(dt) {
    const ok = this.res && this.res.ok;
    for (const tq of this.tanques) tq.ang += dt * 3;
    if (ok) {
      this.acum += Math.min(this.res.params.vo * 9, 45) * dt;
      while (this.acum >= 1 && this.parts.length < 1500) { this.acum -= 1; this.parts.push(this.novaParticula()); }
    }
    const vivos = [];
    for (const p of this.parts) {
      const pe = p.pernas[p.i];
      if (!pe) continue;
      if (pe.tipo === "mover") {
        const L = Math.hypot(pe.b[0] - pe.a[0], pe.b[1] - pe.a[1]);
        p.d += 230 * dt;
        if (p.d >= L) {
          p.d = 0; p.i++;
          if (pe.xDepois === "mistura" && pe.est.xMist !== null) p.x = pe.est.xMist;
        }
      } else {
        const tau = pe.tq.V && pe.tq.vo ? pe.tq.V / pe.tq.vo : 60;
        const dur = clamp(0.5 + tau / 60, 0.6, 6);
        p.t += dt;
        if (pe.tq.x !== null) p.x = lerp(p.x, pe.tq.x, 1 - Math.exp(-dt * 6));
        if (p.t >= dur) { p.t = 0; p.i++; if (pe.tq.x !== null) p.x = pe.tq.x; }
      }
      if (p.i >= p.pernas.length) continue;
      if (!ok && Math.random() < dt * 2) continue;
      vivos.push(p);
    }
    this.parts = vivos;
  }

  posicao(p) {
    const pe = p.pernas[p.i];
    if (pe.tipo === "mover") {
      const L = Math.hypot(pe.b[0] - pe.a[0], pe.b[1] - pe.a[1]) || 1;
      const f = clamp(p.d / L, 0, 1);
      return [lerp(pe.a[0], pe.b[0], f), lerp(pe.a[1], pe.b[1], f)];
    }
    const s = this.lado / 2 - 7;
    return [pe.tq.cx + s * Math.sin(p.fa + this.t * 2.3), pe.tq.cy + s * Math.sin(p.fb + this.t * 1.7)];
  }

  desenhar() {
    const c = this.inicioQuadro();
    if (!this.estagios) return;
    const res = this.res, ok = res && res.ok;
    c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = "#e2e8f0"; c.lineWidth = 12;

    // tubulações
    c.beginPath();
    c.moveTo(15, this.yC);
    for (const e of this.estagios) {
      c.lineTo(e.xDiv, this.yC);
      for (const r of e.ramos) {
        c.moveTo(e.xDiv, this.yC); c.lineTo(e.xDiv, r.y); c.lineTo(e.xMis, r.y); c.lineTo(e.xMis, this.yC);
      }
      c.moveTo(e.xMis, this.yC);
    }
    c.lineTo(this.xFim, this.yC);
    c.stroke();

    // tanques
    const L = this.lado;
    for (const tq of this.tanques) {
      c.fillStyle = tq.x !== null ? corConversao(tq.x, 0.3) : "#f1f5f9";
      c.strokeStyle = tq.x !== null ? corConversao(tq.x, 0.9) : "#94a3b8";
      c.lineWidth = 2.5;
      c.beginPath(); c.roundRect(tq.cx - L / 2, tq.cy - L / 2, L, L, 8); c.fill(); c.stroke();
      // agitador
      c.strokeStyle = "rgba(51,65,85,.35)"; c.lineWidth = 2;
      c.beginPath();
      c.moveTo(tq.cx - Math.cos(tq.ang) * L * 0.28, tq.cy - Math.sin(tq.ang) * L * 0.08);
      c.lineTo(tq.cx + Math.cos(tq.ang) * L * 0.28, tq.cy + Math.sin(tq.ang) * L * 0.08);
      c.stroke();
    }
    // nós
    for (const e of this.estagios) {
      if (e.ramos.length < 2) continue;
      for (const [x, cor] of [[e.xDiv, "#fff"], [e.xMis, e.xMist !== null ? corConversao(e.xMist, 0.9) : "#fff"]]) {
        c.fillStyle = cor; c.strokeStyle = "#64748b"; c.lineWidth = 2;
        c.beginPath(); c.arc(x, this.yC, 8, 0, Math.PI * 2); c.fill(); c.stroke();
      }
    }

    // partículas
    for (const p of this.parts) {
      const [x, y] = this.posicao(p);
      c.fillStyle = corConversao(p.x, 0.9);
      c.beginPath(); c.arc(x, y, 3.6, 0, Math.PI * 2); c.fill();
    }

    // rótulos (valores do Python)
    const tam = 0.85;
    for (const tq of this.tanques) {
      if (tq.V) this.texto(`${num(tq.V, 0)} L`, tq.cx, tq.cy - L / 2 - 11, { tam });
      if (tq.x !== null) this.texto(`x = ${num(tq.x, 4)}`, tq.cx, tq.cy + L / 2 + 13, { tam, negrito: true });
    }
    for (const e of this.estagios) {
      for (const r of e.ramos) {
        if (r.vo !== null && e.ramos.length > 1 && !this.layoutEstreito) {
          this.texto(`${num(r.vo, 3)} L/s`, e.xDiv + 6, r.y - 14, { tam: tam * 0.92, alinhar: "left", cor: "#64748b" });
        }
      }
    }
    if (res && res.params) {
      this.texto(`v₀ = ${num(res.params.vo, 2)} L/s`, 15, this.yC - 20, { alinhar: "left", tam, cor: "#334155" });
    }
    if (ok) {
      const lh = this.fonte * tam * 1.25;
      this.texto(`x = ${num(res.x_global, 4)}`, this.xFim, this.yC - 14 - lh, { alinhar: "right", negrito: true, tam });
      this.texto(`C_A = ${num(res.Ca_final, 3)} mol/L`, this.xFim, this.yC - 14, { alinhar: "right", tam });
    }
  }
}
