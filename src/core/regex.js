// ===== Motor de expresiones regulares con la sintaxis de JLex =====
// AST → AFN de Thompson con aristas de conjuntos de caracteres; equivalencia exacta vía AFD.
(function (root) {
  const MAXC = 0xFFFF;
  // Conjuntos de caracteres como listas de rangos [lo,hi] ordenadas y disjuntas
  const CS = {
    norm(rs) {
      rs = rs.filter(r => r[0] <= r[1]).sort((a, b) => a[0] - b[0]);
      const out = [];
      for (const r of rs) { const l = out[out.length - 1]; if (l && r[0] <= l[1] + 1) l[1] = Math.max(l[1], r[1]); else out.push([r[0], r[1]]); }
      return out;
    },
    neg(rs) { rs = CS.norm(rs); const out = []; let lo = 0; for (const r of rs) { if (r[0] > lo) out.push([lo, r[0] - 1]); lo = r[1] + 1; } if (lo <= MAXC) out.push([lo, MAXC]); return out; },
    has(rs, c) { for (const r of rs) if (c >= r[0] && c <= r[1]) return true; return false; },
    ch(c) { const k = typeof c === 'number' ? c : c.charCodeAt(0); return [[k, k]]; },
    caseFold(rs) {
      const extra = [];
      for (const [lo, hi] of rs) for (let c = Math.max(lo, 65); c <= Math.min(hi, 122); c++) {
        const s = String.fromCharCode(c);
        const u = s.toUpperCase().charCodeAt(0), l = s.toLowerCase().charCodeAt(0);
        extra.push([u, u], [l, l]);
      }
      return CS.norm([...rs, ...extra]);
    }
  };

  class RegexError extends Error { constructor(msg, pos) { super(msg); this.pos = pos; } }

  // ---------- Parser ----------
  // opts.macros: {nombre: textoER}; opts.inRule: si true, un espacio sin comillas termina la ER (como en JLex)
  function parse(src, opts = {}) {
    const macros = opts.macros || {};
    let i = 0;
    const warnings = [];
    const peek = () => src[i];
    const eof = () => i >= src.length;
    function err(m) { throw new RegexError(m + ' (posición ' + (i + 1) + ')', i); }

    function parseEscape() {
      // ya consumida la '\'
      if (eof()) err('Barra invertida al final');
      const c = src[i++];
      const map = { n: 10, t: 9, b: 8, r: 13, f: 12 };
      if (c in map) return map[c];
      if (/[0-7]/.test(c)) { let s = c; while (s.length < 3 && /[0-7]/.test(peek())) s += src[i++]; return parseInt(s, 8); }
      if (c === 'x') { const h = src.substr(i, 2); if (!/^[0-9a-fA-F]{2}$/.test(h)) err('\\x necesita dos dígitos hexadecimales'); i += 2; return parseInt(h, 16); }
      if (c === 'u') { const h = src.substr(i, 4); if (!/^[0-9a-fA-F]{4}$/.test(h)) err('\\u necesita cuatro dígitos hexadecimales'); i += 4; return parseInt(h, 16); }
      if (c === '^') { const k = src[i++]; return k.toUpperCase().charCodeAt(0) - 64; }
      return c.charCodeAt(0);
    }
    function parseAlt() {
      const alts = [parseCat()];
      while (peek() === '|') { i++; alts.push(parseCat()); }
      return alts.length === 1 ? alts[0] : { t: 'alt', a: alts };
    }
    function parseCat() {
      const items = [];
      while (!eof() && peek() !== '|' && peek() !== ')') {
        if (/\s/.test(peek())) {
          if (opts.inRule) break;
          warnings.push('Hay un espacio sin comillas: en JLex el espacio termina la expresión regular. Si quieres un espacio, escribe " " o \\040.');
          i++; continue;
        }
        items.push(parsePost());
      }
      if (!items.length) return { t: 'eps' };
      return items.length === 1 ? items[0] : { t: 'cat', a: items };
    }
    function parsePost() {
      let a = parseAtom();
      while (!eof() && '*+?'.includes(peek())) {
        const op = src[i++];
        a = { t: op === '*' ? 'star' : op === '+' ? 'plus' : 'opt', a };
      }
      return a;
    }
    function parseAtom() {
      const c = peek();
      if (c === '(') {
        i++; const e = parseAlt();
        if (peek() !== ')') err('Falta cerrar el paréntesis');
        i++; return e;
      }
      if (c === '[') return parseClass();
      if (c === '"') {
        i++; const chars = [];
        while (!eof() && peek() !== '"') {
          if (peek() === '\\') { i++; chars.push(parseEscape()); } else chars.push(src.charCodeAt(i++));
        }
        if (eof()) err('Faltan las comillas de cierre');
        i++;
        if (!chars.length) return { t: 'eps' };
        return chars.length === 1 ? { t: 'set', s: CS.ch(chars[0]) } : { t: 'cat', a: chars.map(k => ({ t: 'set', s: CS.ch(k) })) };
      }
      if (c === '\\') { i++; return { t: 'set', s: CS.ch(parseEscape()) }; }
      if (c === '.') { i++; return { t: 'set', s: CS.neg(CS.ch(10)) }; }
      if (c === '{') {
        const j = src.indexOf('}', i);
        if (j < 0) err('Llave { sin cerrar');
        const name = src.slice(i + 1, j);
        if (/^\d+(,\d*)?$/.test(name)) err('JLex no admite repeticiones {' + name + '}: las llaves sirven para usar macros. Repite la subexpresión a mano');
        if (!(name in macros)) err('Macro {' + name + '} no definida');
        i = j + 1;
        const sub = parse(macros[name], { macros, depth: (opts.depth || 0) + 1, lenient: true });
        if ((opts.depth || 0) > 20) err('Macros recursivas');
        return sub.ast;
      }
      if (c === '*' || c === '+' || c === '?') err('Operador "' + c + '" sin nada delante');
      if (c === '^' && i === 0) err('El ancla ^ (inicio de línea) no se practica en esta app');
      if (c === '$' && i === src.length - 1) err('El ancla $ (fin de línea) no se practica en esta app');
      if (c === ']' ) err('Corchete ] sin abrir');
      if (c === '}' ) err('Llave } sin abrir');
      i++;
      return { t: 'set', s: CS.ch(c) };
    }
    function parseClass() {
      i++; // [
      let negate = false;
      if (peek() === '^') { negate = true; i++; }
      const rs = [];
      let first = true;
      while (!eof() && (peek() !== ']' || false)) {
        let lo;
        if (peek() === '"') {
          i++;
          while (!eof() && peek() !== '"') { const k = peek() === '\\' ? (i++, parseEscape()) : src.charCodeAt(i++); rs.push([k, k]); }
          if (eof()) err('Faltan comillas de cierre dentro de [ ]');
          i++; first = false; continue;
        }
        if (peek() === '\\') { i++; lo = parseEscape(); } else lo = src.charCodeAt(i++);
        if (peek() === '-' && src[i + 1] !== ']' && i + 1 < src.length) {
          i++;
          let hi; if (peek() === '\\') { i++; hi = parseEscape(); } else hi = src.charCodeAt(i++);
          if (hi < lo) err('Rango invertido ' + String.fromCharCode(lo) + '-' + String.fromCharCode(hi));
          rs.push([lo, hi]);
        } else rs.push([lo, lo]);
        first = false;
      }
      if (eof()) err('Falta el corchete de cierre ]');
      i++;
      const s = CS.norm(rs);
      return { t: 'set', s: negate ? CS.neg(s) : s };
    }
    const ast = parseAlt();
    if (!eof()) {
      if (peek() === ')' && opts.lenient && i === src.length - 1) { warnings.push('Paréntesis ) sobrante al final: JLex lo tolera, pero sobra'); return { ast, warnings, rest: '' }; }
      if (peek() === ')') err('Paréntesis ) sin abrir');
      if (opts.inRule) return { ast, rest: src.slice(i), warnings };
      err('Carácter inesperado');
    }
    return { ast, warnings, rest: '' };
  }

  // ---------- AFN de Thompson ----------
  function buildNFA(ast, ignoreCase) {
    const st = []; // cada estado: {eps:[], edges:[[set,to]]}
    const ns = () => { st.push({ eps: [], edges: [] }); return st.length - 1; };
    function b(n) {
      switch (n.t) {
        case 'eps': { const s = ns(), e = ns(); st[s].eps.push(e); return [s, e]; }
        case 'set': { const s = ns(), e = ns(); st[s].edges.push([ignoreCase ? CS.caseFold(n.s) : n.s, e]); return [s, e]; }
        case 'cat': { let [s, e] = b(n.a[0]); for (let k = 1; k < n.a.length; k++) { const [s2, e2] = b(n.a[k]); st[e].eps.push(s2); e = e2; } return [s, e]; }
        case 'alt': { const s = ns(), e = ns(); for (const x of n.a) { const [s2, e2] = b(x); st[s].eps.push(s2); st[e2].eps.push(e); } return [s, e]; }
        case 'star': { const s = ns(), e = ns(); const [s2, e2] = b(n.a); st[s].eps.push(s2, e); st[e2].eps.push(s2, e); return [s, e]; }
        case 'plus': { const s = ns(), e = ns(); const [s2, e2] = b(n.a); st[s].eps.push(s2); st[e2].eps.push(s2, e); return [s, e]; }
        case 'opt': { const s = ns(), e = ns(); const [s2, e2] = b(n.a); st[s].eps.push(s2, e); st[e2].eps.push(e); return [s, e]; }
      }
    }
    const [start, accept] = b(ast);
    return { st, start, accept };
  }
  function epsClose(nfa, set) {
    const out = new Set(set); const stack = [...set];
    while (stack.length) { const s = stack.pop(); for (const t of nfa.st[s].eps) if (!out.has(t)) { out.add(t); stack.push(t); } }
    return out;
  }
  function step(nfa, set, c) {
    const out = new Set();
    for (const s of set) for (const [cs, t] of nfa.st[s].edges) if (CS.has(cs, c)) out.add(t);
    return epsClose(nfa, out);
  }
  function compile(src, opts = {}) {
    const p = parse(src, opts);
    const nfa = buildNFA(p.ast, opts.ignoreCase);
    return { src, ast: p.ast, nfa, warnings: p.warnings };
  }
  function matches(re, str) {
    let cur = epsClose(re.nfa, [re.nfa.start]);
    for (let k = 0; k < str.length; k++) { cur = step(re.nfa, cur, str.charCodeAt(k)); if (!cur.size) return false; }
    return cur.has(re.nfa.accept);
  }
  // longitud del prefijo más largo de str (desde pos) que encaja; -1 si ninguno
  function longestPrefix(re, str, pos = 0) {
    let cur = epsClose(re.nfa, [re.nfa.start]); let best = cur.has(re.nfa.accept) ? 0 : -1;
    for (let k = pos; k < str.length; k++) {
      cur = step(re.nfa, cur, str.charCodeAt(k)); if (!cur.size) break;
      if (cur.has(re.nfa.accept)) best = k - pos + 1;
    }
    return best;
  }

  // ---------- Equivalencia exacta ----------
  function allSets(nfa) { const out = []; for (const s of nfa.st) for (const [cs] of s.edges) out.push(cs); return out; }
  function partition(sets) {
    const cuts = new Set([0, MAXC + 1]);
    for (const rs of sets) for (const [lo, hi] of rs) { cuts.add(lo); cuts.add(hi + 1); }
    const c = [...cuts].sort((a, b) => a - b);
    const classes = [];
    for (let k = 0; k < c.length - 1; k++) classes.push([c[k], c[k + 1] - 1]);
    // primero las clases con un representante "bonito", para que los contraejemplos se lean bien
    const score = cl => { const r = repr(cl); const k = NICE.indexOf(r); return k >= 0 ? k : (r.charCodeAt(0) >= 33 && r.charCodeAt(0) <= 126 ? 100 : r === '\n' ? 150 : 200); };
    return classes.map(cl => [cl, score(cl)]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  }
  const NICE = 'abcxyzABCXYZ0123456789_.-+*/@ #!?,;:=<>()[]{}"\'\\|&%$^~`';
  function repr(cl) {
    for (const ch of NICE) { const k = ch.charCodeAt(0); if (k >= cl[0] && k <= cl[1]) return ch; }
    for (let k = Math.max(cl[0], 33); k <= Math.min(cl[1], 126); k++) return String.fromCharCode(k);
    if (cl[0] <= 10 && cl[1] >= 10) return '\n';
    if (cl[0] <= 9 && cl[1] >= 9) return '\t';
    if (cl[0] <= 255) { for (let k = Math.max(cl[0], 161); k <= Math.min(cl[1], 255); k++) return String.fromCharCode(k); }
    return String.fromCharCode(cl[0]);
  }
  // Devuelve {equal, example, inA} con example = cadena más corta en la que difieren
  function equivalent(a, b, maxStates = 20000) {
    const classes = partition([...allSets(a.nfa), ...allSets(b.nfa)]);
    const reps = classes.map(cl => cl[0]);
    const key = s => [...s].sort((x, y) => x - y).join(',');
    const sa = epsClose(a.nfa, [a.nfa.start]), sb = epsClose(b.nfa, [b.nfa.start]);
    const seen = new Set([key(sa) + '|' + key(sb)]);
    const queue = [[sa, sb, '']];
    while (queue.length) {
      const [x, y, w] = queue.shift();
      const ax = x.has(a.nfa.accept), by = y.has(b.nfa.accept);
      if (ax !== by) return { equal: false, example: w, inA: ax };
      if (seen.size > maxStates) return { equal: null };
      for (let k = 0; k < classes.length; k++) {
        const x2 = step(a.nfa, x, reps[k]), y2 = step(b.nfa, y, reps[k]);
        if (!x2.size && !y2.size) continue;
        const kk = key(x2) + '|' + key(y2);
        if (seen.has(kk)) continue;
        seen.add(kk); queue.push([x2, y2, w + repr(classes[k])]);
      }
    }
    return { equal: true };
  }
  // Genera ejemplos aceptados (cortos), para mostrar
  function samples(re, n = 6, maxLen = 12) {
    const classes = partition(allSets(re.nfa));
    const out = []; const key = s => [...s].sort((x, y) => x - y).join(',');
    const start = epsClose(re.nfa, [re.nfa.start]);
    const queue = [[start, '']]; const seen = new Map();
    let guard = 0;
    while (queue.length && out.length < n && guard++ < 5000) {
      const [s, w] = queue.shift();
      if (s.has(re.nfa.accept) && !out.includes(w)) out.push(w);
      if (w.length >= maxLen) continue;
      for (const cl of classes) {
        const s2 = step(re.nfa, s, cl[0]); if (!s2.size) continue;
        const k = key(s2); const c = seen.get(k) || 0; if (c > 4) continue; seen.set(k, c + 1);
        queue.push([s2, w + repr(cl)]);
      }
    }
    return out;
  }
  function show(s) {
    if (s === '') return 'ε (cadena vacía)';
    return '"' + s.replace(/\n/g, '\\n').replace(/\t/g, '\\t') + '"';
  }

  const api = { CS, parse, compile, matches, longestPrefix, equivalent, samples, show, RegexError };
  if (typeof module !== 'undefined') module.exports = api; else root.Rx = api;
})(typeof window !== 'undefined' ? window : globalThis);
