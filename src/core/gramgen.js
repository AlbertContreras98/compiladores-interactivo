// ===== Banco y generador aleatorio de gramáticas para los ejercicios =====
(function (root) {
  const G = (typeof module !== 'undefined') ? require('./grammar.js') : root.Gram;
  const BANK = {
    lr: [
      { src: 'S → A r | k\nA → S k | r A r A', from: 'Examen enero 2022' },
      { src: 'E → E + T | T\nT → T * F | F\nF → ( E ) | id', from: 'Módulo 3' },
      { src: 'A → B [ C ]\nB → d | e\nC → C + B | B', from: 'Módulo 3, ejercicio de autoevaluación' },
      { src: 'A → B\nB → x B c B | x B | d', from: 'Módulo 3, ejercicio de autoevaluación' },
      { src: 'S → L = R | R\nL → * R | id\nR → L', from: 'Clásica: no es SLR(1)' },
      { src: 'E → E + a | a', from: 'Módulo 3, actividad 10' },
      { src: 'S → A B fin\nA → tipo | id A\nB → inicio C\nC → codigo', from: 'Módulo 3, actividad 10' },
      { src: 'S → ( S ) S | ε', from: 'Paréntesis equilibrados' },
      { src: 'S → a S b | a b', from: 'aⁿbⁿ' },
      { src: 'S → A A\nA → a A | b', from: 'Clásica' },
      { src: 'S → x S y | z', from: '' },
      { src: 'L → L , E | E\nE → id | num', from: 'Lista separada por comas' },
      { src: 'S → if c then S | if c then S else S | a', from: 'If-else ambiguo' },
      { src: 'S → A + S | A\nA → ( B ) | B\nB → x | y', from: 'Examen enero 2022 (gramática de la P1 LL)' }
    ],
    ll: [
      { src: 'S → A + S | A\nA → ( B ) | B\nB → x | y', from: 'Examen enero 2022' },
      { src: "E → T E'\nE' → + T E' | ε\nT → F T'\nT' → * F T' | ε\nF → ( E ) | id", from: 'Módulo 3' },
      { src: 'S → A B\nA → a A | ε\nB → b B | c', from: '' },
      { src: 'S → a B | B c\nB → b B | ε', from: '' },
      { src: 'S → A B C\nA → a | ε\nB → b | ε\nC → c', from: '' },
      { src: "S → i E t S S' | a\nS' → e S | ε\nE → b", from: 'If-else factorizado (no es LL(1))' },
      { src: 'P → begin L end\nL → S R\nR → ; S R | ε\nS → id = E | P\nE → id | num', from: 'Bloques' },
      { src: 'S → ( L ) | a\nL → S M\nM → , S M | ε', from: 'Listas' },
      { src: 'A → B C | a\nB → b B | ε\nC → c C | d', from: '' },
      { src: "D → T V ;\nT → int | float\nV → id V'\nV' → , id V' | ε", from: 'Declaraciones' }
    ],
    leftrec: [
      { src: 'E → E + T | T\nT → T * F | F\nF → ( E ) | id' },
      { src: 'L → L , id | id' },
      { src: 'S → S a | S b | c' },
      { src: 'A → A x y | z | w' },
      { src: 'S → S ; A | A\nA → A + id | id' },
      { src: 'B → B and C | C\nC → not C | true | false' }
    ],
    factor: [
      { src: 'S → if E then S | if E then S else S | a\nE → b' },
      { src: 'A → a b c | a b d | e' },
      { src: 'S → id ( L ) | id = E | id\nL → E\nE → num' },
      { src: 'T → x y z | x y | x | w' },
      { src: 'D → var id : tipo ; | var id ;' }
    ],
    ambig: [
      { src: 'E → E + E | E * E | ( E ) | id', w: 'id + id * id' },
      { src: 'E → E - E | num', w: 'num - num - num' },
      { src: 'S → if c then S | if c then S else S | a', w: 'if c then if c then a else a' },
      { src: 'S → S S | a', w: 'a a a' },
      { src: 'S → a S | S a | a', w: 'a a' },
      { src: 'A → A , A | x', w: 'x , x , x' },
      { src: 'E → E + T | T\nT → T * F | F\nF → ( E ) | id', w: 'id + id * id', unamb: true },
      { src: 'S → a S b | a b', w: 'a a b b', unamb: true }
    ]
  };

  function validate(g) {
    // todos los no terminales productivos y alcanzables, sin alternativas repetidas
    const prod = new Set(); let ch = true;
    while (ch) { ch = false; for (const r of g.rules) if (!prod.has(r.lhs) && r.rhs.every(X => !g.isNT(X) || prod.has(X))) { prod.add(r.lhs); ch = true; } }
    if (g.nts.some(A => !prod.has(A))) return false;
    const reach = new Set([g.start]); const st = [g.start];
    while (st.length) { const A = st.pop(); for (const r of g.rules) if (r.lhs === A) for (const X of r.rhs) if (g.isNT(X) && !reach.has(X)) { reach.add(X); st.push(X); } }
    if (g.nts.some(A => !reach.has(A))) return false;
    const seen = new Set(); for (const r of g.rules) { const k = r.lhs + '→' + r.rhs.join(' '); if (seen.has(k)) return false; seen.add(k); }
    // sin reglas A → A
    if (g.rules.some(r => r.rhs.length === 1 && r.rhs[0] === r.lhs)) return false;
    return true;
  }

  function random(opts, rand = Math.random) {
    const R = n => Math.floor(rand() * n);
    const nNT = opts.nNT || 3, nT = opts.nT || 3;
    const NTS = ['S', 'A', 'B', 'C', 'D'].slice(0, nNT);
    const TPOOL = opts.tpool || ['a', 'b', 'c', 'd', 'x', 'y', 'z'];
    const TS = TPOOL.slice().sort(() => rand() - .5).slice(0, nT);
    for (let tries = 0; tries < 400; tries++) {
      const rules = [];
      for (const A of NTS) {
        const nAlt = 1 + R(opts.maxAlt || 3);
        for (let k = 0; k < nAlt; k++) {
          if (opts.eps && k > 0 && A !== 'S' && rand() < opts.eps) { rules.push({ lhs: A, rhs: [] }); continue; }
          const len = 1 + R(opts.maxLen || 3);
          const rhs = [];
          for (let j = 0; j < len; j++) rhs.push(rand() < (opts.ntProb || 0.4) ? NTS[R(nNT)] : TS[R(nT)]);
          rules.push({ lhs: A, rhs });
        }
      }
      const used = new Set(rules.flatMap(r => r.rhs));
      const ts = TS.filter(t => used.has(t));
      const g = G.make(rules, NTS.slice(), [], 'S');
      // terminales en orden de aparición
      for (const r of rules) for (const X of r.rhs) if (!NTS.includes(X) && !g.ts.includes(X)) g.ts.push(X);
      if (!validate(g)) continue;
      if (opts.filter && !opts.filter(g)) continue;
      return g;
    }
    return null;
  }

  const LEVEL_LR = {
    easy: { nNT: 2, nT: 2, maxAlt: 2, maxLen: 3, states: [5, 7] },
    medium: { nNT: 2, nT: 3, maxAlt: 2, maxLen: 3, states: [7, 10] },
    hard: { nNT: 3, nT: 3, maxAlt: 2, maxLen: 3, states: [9, 13], eps: 0.15 },
    veryhard: { nNT: 3, nT: 4, maxAlt: 3, maxLen: 4, states: [12, 17], eps: 0.15 }
  };
  // Gramática para LR(0)/SLR. wantConflict: true/false/undefined
  function forLR(level, rand = Math.random, wantConflict) {
    const o = LEVEL_LR[level] || LEVEL_LR.medium;
    if (rand() < 0.25) {
      const pool = BANK.lr.map(b => ({ b, g: G.parse(b.src) })).filter(({ g }) => { const n = G.lr0(g).states.length; return n >= o.states[0] - 2 && n <= o.states[1] + 1; });
      if (pool.length) { const p = pool[Math.floor(rand() * pool.length)]; p.g.from = p.b.from; return p.g; }
    }
    const g = random(Object.assign({}, o, {
      filter: g => {
        const t = G.slr(g); const n = t.states.length;
        if (n < o.states[0] || n > o.states[1]) return false;
        if (wantConflict === true && t.isSLR) return false;
        if (wantConflict === false && !t.isSLR) return false;
        if (wantConflict === undefined && !t.isSLR && rand() < 0.6) return false;
        return true;
      }
    }), rand);
    return g || G.parse(BANK.lr[1].src);
  }
  const LEVEL_LL = {
    easy: { nNT: 2, nT: 3, maxAlt: 2, maxLen: 3, eps: 0.3 },
    medium: { nNT: 3, nT: 3, maxAlt: 2, maxLen: 3, eps: 0.4 },
    hard: { nNT: 3, nT: 4, maxAlt: 3, maxLen: 3, eps: 0.45 },
    veryhard: { nNT: 4, nT: 4, maxAlt: 3, maxLen: 4, eps: 0.5 }
  };
  function forLL(level, rand = Math.random, opts = {}) {
    const o = LEVEL_LL[level] || LEVEL_LL.medium;
    if (rand() < (opts.bankProb ?? 0.3)) {
      const pool = BANK.ll.filter(b => { const n = G.parse(b.src).nts.length; return level === 'easy' ? n <= 3 : level === 'medium' ? n <= 4 : n >= 3; });
      const b = pool[Math.floor(rand() * pool.length)]; const g = G.parse(b.src); g.from = b.from; return g;
    }
    const g = random(Object.assign({}, o, {
      filter: g => {
        if (G.leftRecursion(g).any) return false;
        const a = G.analyze(g);
        const hasEps = g.nts.some(A => a.F[A].has(G.EPS));
        if (level !== 'easy' && !hasEps) return false;
        if (opts.wantLL1 === true && !a.ll1) return false;
        if (opts.wantLL1 === false && a.ll1) return false;
        if (opts.wantLL1 === undefined && !a.ll1 && rand() < 0.8) return false;
        // que los Siguientes no sean triviales
        if (g.nts.filter(A => a.S[A].size > 1).length < 1) return false;
        return true;
      }
    }), rand);
    return g || G.parse(BANK.ll[1].src);
  }
  function forLeftRec(level, rand = Math.random) {
    if (level === 'easy' || rand() < 0.4) { const b = BANK.leftrec[Math.floor(rand() * BANK.leftrec.length)]; return G.parse(b.src); }
    const g = random({ nNT: level === 'veryhard' ? 3 : 2, nT: 3, maxAlt: 3, maxLen: 3, ntProb: 0.35, filter: g => { const lr = G.leftRecursion(g); return lr.direct.length >= 1 && lr.indirect.length === 0 && !g.rules.some(r => r.rhs.length === 0); } }, rand);
    return g || G.parse(BANK.leftrec[0].src);
  }
  const api = { BANK, random, validate, forLR, forLL, forLeftRec };
  if (typeof module !== 'undefined') module.exports = api; else root.GramGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
