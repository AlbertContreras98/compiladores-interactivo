// ===== Motor de gramáticas: parseo, Primeros/Siguientes/Predicción, LL(1), LR(0), SLR(1), LALR(1) =====
(function (root) {
  const EPS = 'ε', END = '#';

  // ---------- Tokenizador de partes derechas ----------
  // Separa por espacios; dentro de cada trozo separa puntuación y, si se conocen los símbolos,
  // trocea "AB" en "A" "B" por coincidencia más larga.
  function splitChunk(chunk, known) {
    if (!chunk) return [];
    if (known && known.has(chunk)) return [chunk];
    const out = [];
    let i = 0;
    while (i < chunk.length) {
      // coincidencia más larga con símbolos conocidos
      let best = '';
      if (known) for (const k of known) if (k.length > best.length && chunk.startsWith(k, i)) best = k;
      if (best) { out.push(best); i += best.length; continue; }
      const c = chunk[i];
      if (/[A-Za-z0-9_]/.test(c)) {
        let j = i; while (j < chunk.length && /[A-Za-z0-9_']/.test(chunk[j])) j++;
        out.push(chunk.slice(i, j)); i = j;
      } else { out.push(c); i++; }
    }
    return out;
  }

  function normArrow(line) {
    return line.replace(/::=|-+>|→|⟶|=>/g, '→');
  }

  // Parsea texto de gramática. Formato: "A → α | β" (una o varias líneas por no terminal).
  // ε se puede escribir como ε, eps, epsilon, λ o dejando la alternativa vacía.
  function parse(text, opts = {}) {
    const lines = text.split(/\n/).map(l => l.trim()).filter(l => l && !l.startsWith('//'));
    const raw = [];
    let lastLhs = null;
    for (let line of lines) {
      line = normArrow(line);
      let lhs, rhsPart;
      if (line.includes('→')) {
        const k = line.indexOf('→');
        lhs = line.slice(0, k).trim();
        rhsPart = line.slice(k + 1);
      } else if (line.startsWith('|') && lastLhs) {
        lhs = lastLhs; rhsPart = line.slice(1);
      } else throw new Error('Línea sin flecha: "' + line + '"');
      if (!lhs || /\s/.test(lhs)) throw new Error('Parte izquierda no válida: "' + lhs + '"');
      lastLhs = lhs;
      raw.push({ lhs, alts: rhsPart.split('|') });
    }
    if (!raw.length) throw new Error('Gramática vacía');
    const nts = [];
    for (const r of raw) if (!nts.includes(r.lhs)) nts.push(r.lhs);
    const known = new Set([...(opts.known || []), ...nts]);
    const rules = [];
    const ts = [];
    for (const r of raw) {
      for (let alt of r.alts) {
        alt = alt.trim();
        let syms = [];
        for (const ch of alt.split(/\s+/)) {
          if (!ch) continue;
          if (/^(ε|eps|epsilon|λ|lambda)$/i.test(ch)) continue;
          syms.push(...splitChunk(ch, known));
        }
        syms = syms.filter(s => s !== EPS);
        rules.push({ lhs: r.lhs, rhs: syms });
        for (const s of syms) if (!nts.includes(s) && !ts.includes(s)) ts.push(s);
      }
    }
    return make(rules, nts, ts, nts[0]);
  }

  function make(rules, nts, ts, start) {
    const g = { rules, nts, ts, start };
    g.isNT = s => nts.includes(s);
    return g;
  }

  function ruleStr(r) { return r.lhs + ' → ' + (r.rhs.length ? r.rhs.join(' ') : EPS); }
  function toText(g) {
    return g.nts.map(A => A + ' → ' + g.rules.filter(r => r.lhs === A).map(r => r.rhs.length ? r.rhs.join(' ') : EPS).join(' | ')).join('\n');
  }

  // ---------- Primeros / Siguientes / Predicción ----------
  function firstSets(g) {
    const F = {};
    for (const A of g.nts) F[A] = new Set();
    let changed = true;
    while (changed) {
      changed = false;
      for (const r of g.rules) {
        const s = firstOfSeqWith(r.rhs, F, g);
        for (const x of s) if (!F[r.lhs].has(x)) { F[r.lhs].add(x); changed = true; }
      }
    }
    return F;
  }
  function firstOfSeqWith(seq, F, g) {
    const out = new Set();
    for (const X of seq) {
      if (!g.isNT(X)) { out.add(X); return out; }
      for (const a of F[X]) if (a !== EPS) out.add(a);
      if (!F[X].has(EPS)) return out;
    }
    out.add(EPS);
    return out;
  }
  function followSets(g, F) {
    F = F || firstSets(g);
    const S = {};
    for (const A of g.nts) S[A] = new Set();
    S[g.start].add(END);
    let changed = true;
    while (changed) {
      changed = false;
      for (const r of g.rules) {
        for (let i = 0; i < r.rhs.length; i++) {
          const B = r.rhs[i];
          if (!g.isNT(B)) continue;
          const fb = firstOfSeqWith(r.rhs.slice(i + 1), F, g);
          for (const a of fb) if (a !== EPS && !S[B].has(a)) { S[B].add(a); changed = true; }
          if (fb.has(EPS)) for (const a of S[r.lhs]) if (!S[B].has(a)) { S[B].add(a); changed = true; }
        }
      }
    }
    return S;
  }
  function predSets(g, F, S) {
    F = F || firstSets(g); S = S || followSets(g, F);
    return g.rules.map(r => {
      const f = firstOfSeqWith(r.rhs, F, g);
      const p = new Set([...f].filter(x => x !== EPS));
      if (f.has(EPS)) for (const a of S[r.lhs]) p.add(a);
      return p;
    });
  }
  function analyze(g) {
    const F = firstSets(g), S = followSets(g, F), P = predSets(g, F, S);
    const cols = [...g.ts, END];
    const table = {};
    for (const A of g.nts) { table[A] = {}; for (const a of cols) table[A][a] = []; }
    g.rules.forEach((r, i) => { for (const a of P[i]) table[r.lhs][a].push(i); });
    let ll1 = true; const conflicts = [];
    for (const A of g.nts) for (const a of cols) if (table[A][a].length > 1) { ll1 = false; conflicts.push({ A, a, rules: table[A][a] }); }
    return { F, S, P, table, cols, ll1, conflicts };
  }

  // ---------- Recursividad por la izquierda y factorización ----------
  function leftRecursion(g) {
    const F = firstSets(g);
    const nullable = A => F[A].has(EPS);
    // grafo A -> B si A → α B ... con α anulable
    const edges = {};
    for (const A of g.nts) edges[A] = new Set();
    for (const r of g.rules) {
      for (const X of r.rhs) {
        if (!g.isNT(X)) break;
        edges[r.lhs].add(X);
        if (!nullable(X)) break;
      }
    }
    const direct = g.nts.filter(A => g.rules.some(r => r.lhs === A && r.rhs[0] === A));
    const indirect = [];
    for (const A of g.nts) {
      // ¿A alcanza A por un camino que no sea solo el lazo directo?
      const seen = new Set(); const stack = [...edges[A]].filter(B => B !== A);
      while (stack.length) {
        const B = stack.pop(); if (seen.has(B)) continue; seen.add(B);
        for (const C of edges[B]) stack.push(C);
      }
      if (seen.has(A)) indirect.push(A);
    }
    return { direct, indirect, any: direct.length > 0 || indirect.length > 0 };
  }
  // Eliminación de recursividad inmediata: A → Aα | β  ==>  A → βA' ; A' → αA' | ε
  function eliminateDirectLR(g) {
    const rules = []; const nts = [];
    for (const A of g.nts) {
      const mine = g.rules.filter(r => r.lhs === A);
      const rec = mine.filter(r => r.rhs[0] === A);
      if (!rec.length) { nts.push(A); rules.push(...mine.map(r => ({ lhs: A, rhs: r.rhs.slice() }))); continue; }
      let Ap = A + "'"; while (g.nts.includes(Ap) || nts.includes(Ap)) Ap += "'";
      nts.push(A, Ap);
      for (const r of mine.filter(r => r.rhs[0] !== A)) rules.push({ lhs: A, rhs: [...r.rhs, Ap] });
      for (const r of rec) rules.push({ lhs: Ap, rhs: [...r.rhs.slice(1), Ap] });
      rules.push({ lhs: Ap, rhs: [] });
    }
    // reordenar: reglas agrupadas según nts
    const ordered = []; for (const A of nts) ordered.push(...rules.filter(r => r.lhs === A));
    return make(ordered, nts, g.ts.slice(), g.start);
  }
  function needsFactoring(g) {
    const out = [];
    for (const A of g.nts) {
      const mine = g.rules.filter(r => r.lhs === A && r.rhs.length);
      const firsts = {};
      for (const r of mine) (firsts[r.rhs[0]] = firsts[r.rhs[0]] || []).push(r);
      for (const k in firsts) if (firsts[k].length > 1) out.push({ A, prefix: k });
    }
    return out;
  }
  function leftFactor(g) {
    let rules = g.rules.map(r => ({ lhs: r.lhs, rhs: r.rhs.slice() }));
    let nts = g.nts.slice();
    let changed = true;
    while (changed) {
      changed = false;
      for (const A of nts.slice()) {
        const mine = rules.filter(r => r.lhs === A);
        const groups = {};
        for (const r of mine) if (r.rhs.length) (groups[r.rhs[0]] = groups[r.rhs[0]] || []).push(r);
        for (const k in groups) {
          const grp = groups[k];
          if (grp.length < 2) continue;
          // prefijo común más largo
          let p = 0;
          while (grp.every(r => r.rhs.length > p && r.rhs[p] === grp[0].rhs[p])) p++;
          const prefix = grp[0].rhs.slice(0, p);
          let Ap = A + "'"; while (nts.includes(Ap)) Ap += "'";
          const idx = rules.indexOf(grp[0]);
          const newA = { lhs: A, rhs: [...prefix, Ap] };
          const tails = grp.map(r => ({ lhs: Ap, rhs: r.rhs.slice(p) })).sort((x, y) => (x.rhs.length ? 0 : 1) - (y.rhs.length ? 0 : 1));
          rules = rules.filter(r => !grp.includes(r));
          rules.splice(Math.min(idx, rules.length), 0, newA);
          nts.splice(nts.indexOf(A) + 1, 0, Ap);
          rules.push(...tails);
          changed = true; break;
        }
        if (changed) break;
      }
    }
    const ordered = []; for (const A of nts) ordered.push(...rules.filter(r => r.lhs === A));
    return make(ordered, nts, g.ts.slice(), g.start);
  }

  // ---------- Lenguaje acotado (cadenas de longitud ≤ n) ----------
  function boundedLang(g, n, cap = 30000) {
    const L = {}; for (const A of g.nts) L[A] = new Set();
    const key = arr => arr.join(' ');
    let changed = true, guard = 0, overflow = false;
    while (changed && guard++ < 200) {
      changed = false;
      for (const r of g.rules) {
        let partial = new Set(['']);
        for (const X of r.rhs) {
          const next = new Set();
          const opts = g.isNT(X) ? L[X] : new Set([X]);
          for (const p of partial) {
            const pl = p ? p.split(' ').length : 0;
            for (const o of opts) {
              const ol = o ? o.split(' ').length : 0;
              if (pl + ol > n) continue;
              next.add(p && o ? p + ' ' + o : p + o);
              if (next.size > cap) { overflow = true; break; }
            }
          }
          partial = next;
          if (!partial.size) break;
        }
        for (const s of partial) if (!L[r.lhs].has(s)) { L[r.lhs].add(s); changed = true; }
        if (L[r.lhs].size > cap) { overflow = true; changed = false; break; }
      }
    }
    return { set: L[g.start], overflow };
  }
  function compareLang(g1, g2, n) {
    const a = boundedLang(g1, n), b = boundedLang(g2, n);
    const onlyA = [...a.set].filter(x => !b.set.has(x)).sort((x, y) => x.length - y.length);
    const onlyB = [...b.set].filter(x => !a.set.has(x)).sort((x, y) => x.length - y.length);
    return { equal: !onlyA.length && !onlyB.length, onlyA, onlyB, overflow: a.overflow || b.overflow };
  }

  // ---------- Conteo de árboles de derivación (ambigüedad) ----------
  function countTrees(g, tokens, limit = 1000) {
    const memo = new Map(); const busy = new Set();
    let cyclic = false;
    // longitud mínima de cada símbolo (para no probar particiones imposibles)
    const minL = {}; for (const A of g.nts) minL[A] = Infinity;
    let ch = true; while (ch) { ch = false; for (const r of g.rules) { const v = r.rhs.reduce((s, X) => s + (g.isNT(X) ? minL[X] : 1), 0); if (v < minL[r.lhs]) { minL[r.lhs] = v; ch = true; } } }
    const ml = X => g.isNT(X) ? minL[X] : 1;
    function cnt(X, i, j) {
      if (!g.isNT(X)) return (j === i + 1 && tokens[i] === X) ? 1 : 0;
      const k = X + '|' + i + '|' + j;
      if (memo.has(k)) return memo.get(k);
      if (busy.has(k)) { cyclic = true; return 0; }
      busy.add(k);
      let total = 0;
      for (const r of g.rules) if (r.lhs === X) { total += seq(r.rhs, 0, i, j); if (total > limit) { total = limit; break; } }
      busy.delete(k); memo.set(k, total);
      return total;
    }
    function seq(rhs, p, i, j) {
      if (p === rhs.length) return i === j ? 1 : 0;
      let t = 0;
      let restMin = 0; for (let q = p + 1; q < rhs.length; q++) restMin += ml(rhs[q]);
      for (let m = i + ml(rhs[p]); m <= j - restMin; m++) {
        const c = cnt(rhs[p], i, m);
        if (c) { t += c * seq(rhs, p + 1, m, j); if (t > limit) return limit; }
      }
      return t;
    }
    const n = cnt(g.start, 0, tokens.length);
    return { count: n, cyclic };
  }
  // Árbol (uno) y derivación por la izquierda, para mostrar
  function oneTree(g, tokens, skip = 0) {
    // devuelve el árbol número "skip" (0 = primero)
    const trees = [];
    const busy = new Set();
    function gen(X, i, j, depth) {
      if (depth > 60) return [];
      if (!g.isNT(X)) return (j === i + 1 && tokens[i] === X) ? [{ s: X }] : [];
      const k = X + '|' + i + '|' + j; if (busy.has(k)) return [];
      busy.add(k);
      const res = [];
      for (const r of g.rules) if (r.lhs === X) {
        for (const kids of seqGen(r.rhs, 0, i, j, depth)) { res.push({ s: X, k: kids.length ? kids : [{ s: EPS }] }); if (res.length > skip + 2) break; }
        if (res.length > skip + 2) break;
      }
      busy.delete(k);
      return res;
    }
    function seqGen(rhs, p, i, j, depth) {
      if (p === rhs.length) return i === j ? [[]] : [];
      const out = [];
      for (let m = i; m <= j; m++) {
        const lefts = gen(rhs[p], i, m, depth + 1); if (!lefts.length) continue;
        const rights = seqGen(rhs, p + 1, m, j, depth);
        for (const L of lefts) for (const R of rights) { out.push([L, ...R]); if (out.length > skip + 2) return out; }
      }
      return out;
    }
    const all = gen(g.start, 0, tokens.length, 0);
    return all[skip] || null;
  }
  function leftmostDerivation(tree) {
    const steps = [];
    let form = [tree];
    const show = f => f.map(n => n.s).filter(s => s !== EPS).join(' ') || EPS;
    steps.push(show(form));
    for (;;) {
      const idx = form.findIndex(n => n.k);
      if (idx < 0) break;
      const n = form[idx];
      form = [...form.slice(0, idx), ...n.k.filter(c => c.s !== EPS), ...form.slice(idx + 1)];
      steps.push(show(form));
    }
    return steps;
  }

  // ---------- LR(0) ----------
  // Gramática aumentada: regla 0 = S' → S #, reglas 1..n = las del usuario.
  function augment(g) {
    let Sp = g.start + "'"; while (g.nts.includes(Sp)) Sp += "'";
    const rules = [{ lhs: Sp, rhs: [g.start, END] }, ...g.rules];
    return { g, Sp, rules };
  }
  function itemKey(it) { return it.r + '.' + it.d; }
  function closure0(aug, items) {
    const set = new Map(); const queue = [];
    for (const it of items) if (!set.has(itemKey(it))) { set.set(itemKey(it), it); queue.push(it); }
    while (queue.length) {
      const it = queue.shift();
      const X = aug.rules[it.r].rhs[it.d];
      if (X && aug.g.isNT(X)) {
        aug.rules.forEach((r, ri) => {
          if (r.lhs === X) { const n = { r: ri, d: 0 }; if (!set.has(itemKey(n))) { set.set(itemKey(n), n); queue.push(n); } }
        });
      }
    }
    // núcleo primero (en el orden dado), luego cierres por número de regla
    const kernel = items.map(itemKey);
    const rest = [...set.values()].filter(it => !kernel.includes(itemKey(it))).sort((a, b) => a.r - b.r);
    return [...items, ...rest];
  }
  function symOrder(g) { return [...g.nts, ...g.ts]; }
  function goto0(aug, I, X) {
    const moved = I.filter(it => aug.rules[it.r].rhs[it.d] === X).map(it => ({ r: it.r, d: it.d + 1 }));
    return moved.length ? closure0(aug, moved) : null;
  }
  function setKey(I) { return I.map(itemKey).sort().join(','); }
  function lr0(g) {
    const aug = augment(g);
    const I0 = closure0(aug, [{ r: 0, d: 0 }]);
    const states = [{ items: I0, from: null, sym: null }];
    const index = new Map([[setKey(I0), 0]]);
    const trans = [];// {from, sym, to, isNew}
    const order = symOrder(g);
    for (let s = 0; s < states.length; s++) {
      const I = states[s].items;
      const syms = order.filter(X => I.some(it => aug.rules[it.r].rhs[it.d] === X));
      for (const X of syms) {
        const J = goto0(aug, I, X);
        const k = setKey(J);
        let t, isNew = false;
        if (index.has(k)) t = index.get(k);
        else { t = states.length; states.push({ items: J, from: s, sym: X }); index.set(k, t); isNew = true; }
        trans.push({ from: s, sym: X, to: t, isNew });
      }
    }
    return { aug, states, trans };
  }
  function itemStr(aug, it) {
    const r = aug.rules[it.r];
    const rhs = r.rhs.slice();
    if (!rhs.length) return r.lhs + ' → •';
    rhs.splice(it.d, 0, '•');
    return r.lhs + ' → ' + rhs.join(' ');
  }
  // Tabla SLR(1)
  function slr(g) {
    const C = lr0(g); const { aug, states, trans } = C;
    const F = firstSets(g), S = followSets(g, F);
    const cols = [...g.ts, END];
    const action = states.map(() => { const o = {}; for (const a of cols) o[a] = []; return o; });
    const gotoT = states.map(() => { const o = {}; for (const A of g.nts) o[A] = null; return o; });
    for (const t of trans) {
      if (g.isNT(t.sym)) gotoT[t.from][t.sym] = t.to;
      else action[t.from][t.sym].push('d' + t.to);
    }
    states.forEach((st, s) => {
      for (const it of st.items) {
        const r = aug.rules[it.r];
        if (it.r === 0) { if (it.d === 1) action[s][END].push('OK'); continue; }
        if (it.d === r.rhs.length) for (const a of S[r.lhs]) action[s][a].push('r' + it.r);
      }
    });
    const conflicts = [];
    action.forEach((row, s) => cols.forEach(a => {
      // ordenar: desplazamientos antes que reducciones (como "d6/r5")
      row[a].sort((x, y) => (x[0] === 'd' ? 0 : x[0] === 'O' ? 1 : 2) - (y[0] === 'd' ? 0 : y[0] === 'O' ? 1 : 2) || x.localeCompare(y));
      if (row[a].length > 1) conflicts.push({ state: s, sym: a, entries: row[a].slice() });
    }));
    return { ...C, F, S, cols, action, goto: gotoT, conflicts, isSLR: conflicts.length === 0 };
  }

  // ---------- LALR(1) (para comprobar gramáticas CUP) ----------
  function lalr(g, endSym = END) {
    const aug = augment(g);
    aug.rules[0] = { lhs: aug.Sp, rhs: [g.start] }; // S' → S, anticipación endSym
    const F = firstSets(g);
    const k1 = it => it.r + '.' + it.d + '.' + it.la;
    const firstCache = new Map();
    function firstSeq(seq) { const k = seq.join(' '); if (!firstCache.has(k)) firstCache.set(k, firstOfSeqWith(seq, F, g)); return firstCache.get(k); }
    function closure1(items) {
      const set = new Map(); const queue = [];
      for (const it of items) if (!set.has(k1(it))) { set.set(k1(it), it); queue.push(it); }
      while (queue.length) {
        const it = queue.shift();
        const rhs = aug.rules[it.r].rhs; const X = rhs[it.d];
        if (X && g.isNT(X)) {
          const f = firstSeq(rhs.slice(it.d + 1));
          const las = [...f].filter(x => x !== EPS); if (f.has(EPS)) las.push(it.la);
          aug.rules.forEach((r, ri) => {
            if (r.lhs !== X) return;
            for (const la of las) { const n = { r: ri, d: 0, la }; if (!set.has(k1(n))) { set.set(k1(n), n); queue.push(n); } }
          });
        }
      }
      return [...set.values()];
    }
    const fullKey = I => I.map(k1).sort().join(',');
    const coreKey = I => [...new Set(I.map(it => it.r + '.' + it.d))].sort().join(',');
    const order = symOrder(g);
    // 1) colección LR(1) canónica
    const L = [closure1([{ r: 0, d: 0, la: endSym }])];
    const Lidx = new Map([[fullKey(L[0]), 0]]);
    const LT = [];
    for (let s = 0; s < L.length; s++) {
      if (L.length > 4000) throw new Error('Gramática demasiado grande para analizarla aquí');
      for (const X of order) {
        const moved = L[s].filter(it => aug.rules[it.r].rhs[it.d] === X).map(it => ({ r: it.r, d: it.d + 1, la: it.la }));
        if (!moved.length) continue;
        const J = closure1(moved); const fk = fullKey(J);
        if (!Lidx.has(fk)) { Lidx.set(fk, L.length); L.push(J); }
        LT.push([s, X, Lidx.get(fk)]);
      }
    }
    // 2) fusionar por núcleo
    const cIdx = new Map(); const map = []; const states = [];
    L.forEach((I, i) => {
      const ck = coreKey(I);
      if (!cIdx.has(ck)) { cIdx.set(ck, states.length); states.push(new Map()); }
      const t = cIdx.get(ck); map[i] = t;
      for (const it of I) states[t].set(k1(it), it);
    });
    const S = states.map(m => [...m.values()]);
    const cols = [...g.ts, endSym];
    const action = S.map(() => ({})); const gotoT = S.map(() => ({}));
    const add = (s, a, v) => { const c = (action[s][a] = action[s][a] || []); if (!c.includes(v)) c.push(v); };
    for (const [s, X, t] of LT) { if (g.isNT(X)) gotoT[map[s]][X] = map[t]; else add(map[s], X, 'd' + map[t]); }
    S.forEach((I, s) => {
      for (const it of I) {
        const r = aug.rules[it.r];
        if (it.d !== r.rhs.length) continue;
        if (it.r === 0) add(s, endSym, 'OK'); else add(s, it.la, 'r' + it.r);
      }
    });
    const conflicts = [];
    action.forEach((row, s) => { for (const a in row) if (row[a].length > 1) conflicts.push({ state: s, sym: a, entries: row[a].slice(),
      items: [...new Set(S[s].filter(it => (it.d === aug.rules[it.r].rhs.length && it.la === a) || aug.rules[it.r].rhs[it.d] === a).map(it => itemStr(aug, it)))] }); });
    return { aug, states: S, action, goto: gotoT, cols, conflicts };
  }

  // ---------- Analizadores con traza ----------
  function parseLR(tab, aug, tokens, endSym = END, maxSteps = 500) {
    const input = [...tokens, endSym]; const stack = [0]; const trace = []; let i = 0;
    for (let step = 0; step < maxSteps; step++) {
      const s = stack[stack.length - 1], a = input[i];
      const cell = (tab.action[s] && tab.action[s][a]) || [];
      const row = { stack: stack.join(' '), input: input.slice(i).join(' '), action: '' };
      if (!cell.length) { row.action = 'ERROR'; trace.push(row); return { ok: false, trace }; }
      const act = cell[0];
      if (act === 'OK') { row.action = 'aceptar'; trace.push(row); return { ok: true, trace }; }
      if (act[0] === 'd') { row.action = 'desplazar ' + act.slice(1); stack.push(+act.slice(1)); i++; trace.push(row); continue; }
      const r = aug.rules[+act.slice(1)];
      for (let k = 0; k < r.rhs.length; k++) stack.pop();
      const t = tab.goto[stack[stack.length - 1]][r.lhs];
      row.action = 'reducir ' + ruleStr(r) + ' (r' + act.slice(1) + '), ir_a ' + t;
      trace.push(row);
      if (t === null || t === undefined) return { ok: false, trace };
      stack.push(t);
    }
    return { ok: false, trace };
  }
  function parseLL(g, an, tokens, maxSteps = 500) {
    const input = [...tokens, END]; const stack = [END, g.start]; const trace = []; let i = 0;
    for (let step = 0; step < maxSteps; step++) {
      const X = stack[stack.length - 1], a = input[i];
      const row = { stack: stack.slice().reverse().join(' '), input: input.slice(i).join(' '), action: '' };
      if (X === END && a === END) { row.action = 'aceptar'; trace.push(row); return { ok: true, trace }; }
      if (!g.isNT(X)) {
        if (X === a) { row.action = 'extraer'; stack.pop(); i++; trace.push(row); continue; }
        row.action = 'ERROR'; trace.push(row); return { ok: false, trace };
      }
      const cell = an.table[X][a] || [];
      if (!cell.length) { row.action = 'ERROR'; trace.push(row); return { ok: false, trace }; }
      const r = g.rules[cell[0]];
      row.action = ruleStr(r); trace.push(row);
      stack.pop(); for (let k = r.rhs.length - 1; k >= 0; k--) stack.push(r.rhs[k]);
    }
    return { ok: false, trace };
  }

  const api = { EPS, END, parse, make, ruleStr, toText, firstSets, followSets, predSets, analyze, firstOfSeqWith,
    leftRecursion, eliminateDirectLR, needsFactoring, leftFactor, boundedLang, compareLang, countTrees, oneTree,
    leftmostDerivation, augment, closure0, goto0, lr0, itemStr, itemKey, setKey, slr, lalr, parseLR, parseLL, splitChunk };
  if (typeof module !== 'undefined') module.exports = api; else root.Gram = api;
})(typeof window !== 'undefined' ? window : globalThis);
