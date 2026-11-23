// ===== Mini-C: parser, intérprete, traductor de referencia a código de tres direcciones y generador aleatorio =====
(function (root) {
  const TacM = (typeof module !== 'undefined') ? require('./tac.js') : root.Tac;

  // ---------- Léxico ----------
  function lex(src) {
    const out = []; let i = 0; let line = 1;
    const KW = ['int', 'if', 'else', 'while', 'for', 'do', 'read', 'write', 'double', 'return'];
    while (i < src.length) {
      const c = src[i];
      if (c === '\n') { line++; i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (src.startsWith('//', i)) { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (src.startsWith('/*', i)) { const j = src.indexOf('*/', i + 2); i = j < 0 ? src.length : j + 2; continue; }
      const three = src.substr(i, 2);
      if (['<=', '>=', '==', '!=', '&&', '||', '++', '--', '+=', '-=', '*=', '/='].includes(three)) { out.push({ t: three, line }); i += 2; continue; }
      if (/[0-9]/.test(c)) { let j = i; while (/[0-9.]/.test(src[j] || '')) j++; out.push({ t: 'num', v: src.slice(i, j), line }); i = j; continue; }
      if (/[A-Za-z_]/.test(c)) { let j = i; while (/[A-Za-z0-9_]/.test(src[j] || '')) j++; const w = src.slice(i, j); out.push(KW.includes(w) ? { t: w, line } : { t: 'id', v: w, line }); i = j; continue; }
      out.push({ t: c, line }); i++;
    }
    out.push({ t: 'eof', line });
    return out;
  }

  // ---------- Parser ----------
  function parse(src) {
    const tk = lex(src); let p = 0;
    const peek = (k = 0) => tk[p + k];
    const next = () => tk[p++];
    const expect = t => { const x = next(); if (x.t !== t) throw new Error('Línea ' + x.line + ': se esperaba "' + t + '" y hay "' + (x.v || x.t) + '"'); return x; };
    const accept = t => { if (peek().t === t) { p++; return true; } return false; };
    function block() {
      if (accept('{')) { const s = []; while (!accept('}')) s.push(stmt()); return { k: 'block', s }; }
      return stmt();
    }
    function stmt() {
      const x = peek();
      if (x.t === 'int' || x.t === 'double') {
        next(); const decls = [];
        do {
          const name = expect('id').v;
          if (accept('[')) { const n = expect('num').v; expect(']'); decls.push({ k: 'arr', name, size: +n }); }
          else if (accept('=')) decls.push({ k: 'decl', name, init: expr() });
          else decls.push({ k: 'decl', name });
        } while (accept(','));
        expect(';');
        return { k: 'decls', d: decls };
      }
      if (x.t === 'if') { next(); expect('('); const c = expr(); expect(')'); const th = block(); let el = null; if (accept('else')) el = block(); return { k: 'if', c, th, el }; }
      if (x.t === 'while') { next(); expect('('); const c = expr(); expect(')'); return { k: 'while', c, b: block() }; }
      if (x.t === 'do') { next(); const b = block(); expect('while'); expect('('); const c = expr(); expect(')'); expect(';'); return { k: 'do', c, b }; }
      if (x.t === 'for') { next(); expect('('); const init = simple(); expect(';'); const c = expr(); expect(';'); const step = simple(); expect(')'); return { k: 'for', init, c, step, b: block() }; }
      if (x.t === 'read') { next(); expect('('); const v = expect('id').v; expect(')'); expect(';'); return { k: 'read', v }; }
      if (x.t === 'write') { next(); expect('('); const e = expr(); expect(')'); expect(';'); return { k: 'write', e }; }
      if (x.t === '{') return block();
      const s = simple(); expect(';'); return s;
    }
    function simple() {
      const id = expect('id').v;
      let target = { k: 'var', v: id };
      if (accept('[')) { target = { k: 'idx', v: id, i: expr() }; expect(']'); }
      const op = next();
      if (op.t === '=') return { k: 'assign', target, e: expr() };
      if (op.t === '++' || op.t === '--') return { k: 'assign', target, e: { k: 'bin', op: op.t[0], a: target, b: { k: 'num', v: '1' } } };
      if (['+=', '-=', '*=', '/='].includes(op.t)) return { k: 'assign', target, e: { k: 'bin', op: op.t[0], a: target, b: expr() } };
      throw new Error('Línea ' + op.line + ': sentencia no reconocida');
    }
    const PREC = [['||'], ['&&'], ['==', '!='], ['<', '>', '<=', '>='], ['+', '-'], ['*', '/', '%']];
    function expr(level = 0) {
      if (level === PREC.length) return unary();
      let a = expr(level + 1);
      while (PREC[level].includes(peek().t)) { const op = next().t; const b = expr(level + 1); a = { k: 'bin', op, a, b }; }
      return a;
    }
    function unary() {
      if (accept('-')) return { k: 'un', op: '-', a: unary() };
      if (accept('!')) return { k: 'un', op: '!', a: unary() };
      return primary();
    }
    function primary() {
      const x = next();
      if (x.t === 'num') return { k: 'num', v: x.v };
      if (x.t === '(') { const e = expr(); expect(')'); return e; }
      if (x.t === 'id') {
        if (accept('(')) { const args = []; if (!accept(')')) { do args.push(expr()); while (accept(',')); expect(')'); } return { k: 'call', f: x.v, args }; }
        if (accept('[')) { const i = expr(); expect(']'); return { k: 'idx', v: x.v, i }; }
        return { k: 'var', v: x.v };
      }
      throw new Error('Línea ' + x.line + ': expresión no válida en "' + (x.v || x.t) + '"');
    }
    const prog = []; while (peek().t !== 'eof') prog.push(stmt());
    return { k: 'block', s: prog };
  }

  // ---------- Información del programa ----------
  function info(ast) {
    const vars = new Set(), arrays = {}, assigned = new Set(), funcs = new Set();
    (function walk(n) {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (n.k === 'var') vars.add(n.v);
      if (n.k === 'arr') arrays[n.name] = n.size;
      if (n.k === 'decl') { vars.add(n.name); if (n.init) assigned.add(n.name); }
      if (n.k === 'assign' && n.target.k === 'var') assigned.add(n.target.v);
      if (n.k === 'read') { vars.add(n.v); assigned.add(n.v); }
      if (n.k === 'call') funcs.add(n.f);
      for (const k in n) if (k !== 'k') walk(n[k]);
    })(ast);
    for (const a in arrays) vars.delete(a);
    return { vars: [...vars], arrays, assigned: [...assigned], funcs: [...funcs] };
  }

  // ---------- Intérprete ----------
  function run(ast, init = {}, opts = {}) {
    const env = {}; const arrays = {}; const input = (opts.input || []).slice(); const output = [];
    for (const k in init) if (!Array.isArray(init[k])) env[k] = init[k];
    let steps = 0;
    const F = TacM.FUNCS;
    function ev(e) {
      switch (e.k) {
        case 'num': return Number(e.v);
        case 'var': if (!(e.v in env)) throw new Error('Variable sin valor ' + e.v); return env[e.v];
        case 'idx': { const a = arrays[e.v]; const i = ev(e.i); if (!a || i < 0 || i >= a.length) throw new Error('Índice fuera de rango ' + e.v + '[' + i + ']'); return a[i]; }
        case 'un': { const v = ev(e.a); return e.op === '-' ? -v : +!v; }
        case 'bin': return TacM.evalBin(e.op, ev(e.a), ev(e.b), true);
        case 'call': return F[e.f](...e.args.map(ev));
      }
    }
    function ex(s) {
      if (++steps > 20000) throw new Error('Demasiados pasos');
      switch (s.k) {
        case 'block': s.s.forEach(ex); break;
        case 'decls': for (const d of s.d) { if (d.k === 'arr') arrays[d.name] = (init[d.name] || []).slice(0, d.size).concat(Array(Math.max(0, d.size - (init[d.name] || []).length)).fill(0)); else if (d.init) env[d.name] = ev(d.init); } break;
        case 'assign': { const v = ev(s.e); if (s.target.k === 'var') env[s.target.v] = v; else { const a = arrays[s.target.v]; const i = ev(s.target.i); if (!a || i < 0 || i >= a.length) throw new Error('Índice fuera de rango'); a[i] = v; } break; }
        case 'if': if (ev(s.c)) ex(s.th); else if (s.el) ex(s.el); break;
        case 'while': while (ev(s.c)) { ex(s.b); if (++steps > 20000) throw new Error('Demasiados pasos'); } break;
        case 'do': do { ex(s.b); if (++steps > 20000) throw new Error('Demasiados pasos'); } while (ev(s.c)); break;
        case 'for': for (ex(s.init); ev(s.c); ex(s.step)) { ex(s.b); if (++steps > 20000) throw new Error('Demasiados pasos'); } break;
        case 'read': env[s.v] = input.length ? input.shift() : 0; break;
        case 'write': output.push(ev(s.e)); break;
      }
    }
    ex(ast);
    return { env, arrays, output };
  }

  // ---------- Traductor de referencia a TAC (estilo del módulo 4) ----------
  const NEG = { '<': '>=', '>': '<=', '<=': '>', '>=': '<', '==': '!=', '!=': '==' };
  function toTAC(ast, opts = {}) {
    const out = []; let nt = 0, nl = 0;
    const T = () => (opts.tmp || 't') + (++nt);
    const L = () => 'L' + (++nl);
    const emit = (s, comment) => out.push(s);
    function simpleOperand(e) { return e.k === 'num' || e.k === 'var'; }
    function opnd(e) { if (e.k === 'num') return e.v; if (e.k === 'var') return e.v; return gen(e); }
    // genera el código de la expresión y devuelve dónde queda el resultado
    function gen(e, into) {
      switch (e.k) {
        case 'num': case 'var': if (into) { emit(into + ' = ' + e.v); return into; } return e.v;
        case 'idx': { const i = opnd(e.i); const t = into || T(); emit(t + ' = ' + e.v + '[' + i + ']'); return t; }
        case 'un': { const a = opnd(e.a); const t = into || T(); emit(t + ' = ' + (e.op === '-' ? '- ' : '! ') + a); return t; }
        case 'bin': { const a = opnd(e.a); const b = opnd(e.b); const t = into || T(); emit(t + ' = ' + a + ' ' + e.op + ' ' + b); return t; }
        case 'call': { const args = e.args.map(opnd); args.forEach(a => emit('push ' + a)); emit('call ' + e.f); if (into) { emit(into + ' = $RET'); return into; } const t = T(); emit(t + ' = $RET'); return t; }
      }
    }
    function cond(e) { return gen(e); }
    function st(s) {
      switch (s.k) {
        case 'block': s.s.forEach(st); break;
        case 'decls': for (const d of s.d) if (d.k === 'decl' && d.init) assign({ k: 'var', v: d.name }, d.init); break;
        case 'assign': assign(s.target, s.e); break;
        case 'if': {
          const t = cond(s.c); const Lelse = L();
          emit('if false ' + t + ' goto ' + Lelse);
          st(s.th);
          if (s.el) { const Lend = L(); emit('goto ' + Lend); emit('label ' + Lelse); st(s.el); emit('label ' + Lend); }
          else emit('label ' + Lelse);
          break;
        }
        case 'while': { const Lb = L(), Le = L(); emit('label ' + Lb); const t = cond(s.c); emit('if false ' + t + ' goto ' + Le); st(s.b); emit('goto ' + Lb); emit('label ' + Le); break; }
        case 'for': { st(s.init); const Lb = L(), Le = L(); emit('label ' + Lb); const t = cond(s.c); emit('if false ' + t + ' goto ' + Le); st(s.b); st(s.step); emit('goto ' + Lb); emit('label ' + Le); break; }
        case 'do': {
          const Lb = L(); emit('label ' + Lb); st(s.b);
          // como el repeat-until del módulo: se calcula la condición de salida y se salta atrás si es falsa
          let t;
          if (s.c.k === 'bin' && NEG[s.c.op]) t = gen({ k: 'bin', op: NEG[s.c.op], a: s.c.a, b: s.c.b });
          else { const c = cond(s.c); t = T(); emit(t + ' = ! ' + c); }
          emit('if false ' + t + ' goto ' + Lb);
          break;
        }
        case 'read': emit('read ' + s.v); break;
        case 'write': { const v = opnd(s.e); emit('write ' + v); break; }
      }
    }
    function assign(target, e) {
      if (target.k === 'var') {
        if (simpleOperand(e) || e.k === 'call') gen(e, target.v);
        else { const t = gen(e); emit(target.v + ' = ' + t); }
      } else {
        const i = opnd(target.i); const v = opnd(e);
        emit(target.v + '[' + i + '] = ' + v);
      }
    }
    st(ast);
    emit('halt');
    return out.join('\n');
  }

  // ---------- Generador aleatorio ----------
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function generate(level, rand = Math.random) {
    const R = n => Math.floor(rand() * n);
    const pick = a => a[R(a.length)];
    const pool = ['a', 'b', 'c', 'x', 'y', 'z', 'n', 'm', 's', 'p', 'q', 'r'];
    const used = []; const take = () => { const v = pick(pool.filter(x => !used.includes(x))); used.push(v); return v; };
    const params = [take(), take(), take()];
    const res = take(); const res2 = take();
    const atom = (vs) => rand() < 0.35 ? String(1 + R(9)) : pick(vs);
    function expr(vs, depth) {
      if (depth <= 0 || rand() < 0.25) return atom(vs);
      const op = pick(['+', '-', '*', '+', '-', '*', '/']);
      let a = expr(vs, depth - 1), b = expr(vs, depth - 1);
      if (op === '/') b = String(2 + R(4)); // divisor constante: evita dividir por cero
      if (a === b && /^\d+$/.test(a)) a = pick(vs);
      const wrap = (s, side) => (/[+\-]/.test(s) && (op === '*' || op === '/' || (op === '-' && side === 'r'))) ? '(' + s + ')' : s;
      return wrap(a, 'l') + ' ' + op + ' ' + wrap(b, 'r');
    }
    const rel = () => pick(['<', '>', '<=', '>=', '==', '!=']);
    const lines = []; const ind = d => '    '.repeat(d);
    const vs = params.slice();
    const lvl = { easy: 0, medium: 1, hard: 2, veryhard: 3 }[level] ?? 1;
    let arrays = {};
    if (lvl === 0) {
      lines.push(res + ' = ' + expr(vs, 2) + ';'); vs.push(res);
      lines.push(res2 + ' = ' + expr(vs, 2) + ';');
      if (rand() < 0.5) lines.push('write(' + res2 + ');');
    } else if (lvl === 1) {
      const kind = pick(['if', 'ifelse', 'while', 'for']);
      lines.push(res + ' = ' + atom(vs) + ';'); vs.push(res);
      if (kind === 'if' || kind === 'ifelse') {
        lines.push('if (' + pick(params) + ' ' + rel() + ' ' + atom(params) + ') {');
        lines.push(ind(1) + res + ' = ' + expr(vs, 2) + ';');
        if (kind === 'ifelse') { lines.push('} else {'); lines.push(ind(1) + res + ' = ' + expr(vs, 1) + ';'); }
        lines.push('}');
      } else if (kind === 'while') {
        const i = take(); lines.unshift(i + ' = 0;');
        lines.push('while (' + i + ' < ' + (3 + R(5)) + ') {');
        lines.push(ind(1) + res + ' = ' + res + ' + ' + expr(params.concat([i]), 1) + ';');
        lines.push(ind(1) + i + ' = ' + i + ' + 1;');
        lines.push('}');
      } else {
        const i = take();
        lines.push('for (' + i + ' = 1; ' + i + ' <= ' + (3 + R(4)) + '; ' + i + '++) {');
        lines.push(ind(1) + res + ' = ' + res + ' ' + pick(['+', '*']) + ' ' + i + ';');
        lines.push('}');
      }
      lines.push('write(' + res + ');');
    } else {
      const kind = pick(lvl === 2 ? ['arr', 'nested', 'do', 'whileif'] : ['arr2', 'call', 'logic', 'nestedfor']);
      const i = take(), j = take();
      if (kind === 'arr' || kind === 'arr2') {
        const A = pick(['v', 'w', 'tabla', 'datos']); const N = 4 + R(4); arrays[A] = N;
        lines.push('int ' + A + '[' + N + '];');
        lines.push('for (' + i + ' = 0; ' + i + ' < ' + N + '; ' + i + '++) {');
        lines.push(ind(1) + A + '[' + i + '] = ' + i + ' * ' + atom(params) + ';');
        lines.push('}');
        lines.push(res + ' = 0;');
        lines.push(i + ' = 0;');
        lines.push('while (' + i + ' < ' + N + ') {');
        if (kind === 'arr2') { lines.push(ind(1) + 'if (' + A + '[' + i + '] > ' + pick(params) + ') {'); lines.push(ind(2) + res + ' = ' + res + ' + ' + A + '[' + i + '];'); lines.push(ind(1) + '}'); }
        else lines.push(ind(1) + res + ' = ' + res + ' + ' + A + '[' + i + '];');
        lines.push(ind(1) + i + ' = ' + i + ' + 1;');
        lines.push('}');
        lines.push('write(' + res + ');');
      } else if (kind === 'nested' || kind === 'nestedfor') {
        lines.push(res + ' = 0;');
        lines.push('for (' + i + ' = 0; ' + i + ' < ' + (2 + R(3)) + '; ' + i + '++) {');
        lines.push(ind(1) + 'for (' + j + ' = 0; ' + j + ' < ' + (2 + R(3)) + '; ' + j + '++) {');
        if (kind === 'nestedfor') { lines.push(ind(2) + 'if (' + i + ' != ' + j + ') {'); lines.push(ind(3) + res + ' = ' + res + ' + ' + i + ' * ' + j + ';'); lines.push(ind(2) + '}'); }
        else lines.push(ind(2) + res + ' = ' + res + ' + ' + i + ' * ' + j + ' + ' + pick(params) + ';');
        lines.push(ind(1) + '}');
        lines.push('}');
        lines.push('write(' + res + ');');
      } else if (kind === 'do') {
        lines.push('read(' + i + ');');
        lines.push(res + ' = 1;');
        lines.push('do {');
        lines.push(ind(1) + res + ' = ' + res + ' * 2;');
        lines.push(ind(1) + i + ' = ' + i + ' - 1;');
        lines.push('} while (' + i + ' > 0);');
        lines.push('write(' + res + ');');
      } else if (kind === 'whileif') {
        lines.push(res + ' = 0; ' + res2 + ' = 0;');
        lines.push(i + ' = ' + (5 + R(5)) + ';');
        lines.push('while (' + i + ' > 0) {');
        lines.push(ind(1) + 'if (' + i + ' % 2 == 0) {');
        lines.push(ind(2) + res + ' = ' + res + ' + ' + i + ';');
        lines.push(ind(1) + '} else {');
        lines.push(ind(2) + res2 + ' = ' + res2 + ' + ' + pick(params) + ';');
        lines.push(ind(1) + '}');
        lines.push(ind(1) + i + ' = ' + i + ' - 1;');
        lines.push('}');
        lines.push('write(' + res + ' - ' + res2 + ');');
      } else if (kind === 'call') {
        lines.push(res + ' = ' + pick(['max', 'min']) + '(' + params[0] + ', ' + params[1] + ' * 2);');
        lines.push(res2 + ' = abs(' + res + ' - ' + params[2] + ') + 1;');
        lines.push('write(' + res2 + ');');
      } else if (kind === 'logic') {
        lines.push(res + ' = 0;');
        lines.push('if (' + params[0] + ' > ' + params[1] + ' && ' + params[1] + ' ' + rel() + ' ' + atom(params) + ') {');
        lines.push(ind(1) + res + ' = ' + expr(params, 2) + ';');
        lines.push('} else {');
        lines.push(ind(1) + 'if (' + params[2] + ' == 0 || ' + params[0] + ' < 3) {');
        lines.push(ind(2) + res + ' = - ' + params[2] + ';');
        lines.push(ind(1) + '}');
        lines.push('}');
        lines.push('write(' + res + ');');
      }
    }
    const src = lines.join('\n');
    return { src, params, arrays };
  }

  // ---------- Comparación semántica de un TAC del alumno con el programa C ----------
  function randomInit(inf, rand = Math.random) {
    const init = {};
    for (const v of inf.vars) init[v] = Math.floor(rand() * 21) - 5;
    return init;
  }
  function checkTAC(cSrc, tacText, opts = {}) {
    const ast = parse(cSrc); const inf = info(ast);
    let code;
    try { code = TacM.parse(tacText); } catch (e) { return { ok: false, msg: e.message }; }
    const observed = opts.observed || inf.assigned;
    const tries = opts.tries || 8;
    const rand = rng(opts.seed || 12345);
    for (let t = 0; t < tries; t++) {
      const init = randomInit(inf, rand);
      const input = [1 + Math.floor(rand() * 5), 2, 3];
      let exp;
      try { exp = run(ast, init, { input }); } catch (e) { continue; }
      const tryRun = byteIndex => TacM.run(code, init, { arrays: inf.arrays, input, byteIndex });
      let got, err;
      try { got = tryRun(false); } catch (e) { err = e; }
      const same = g => g && observed.every(v => g.env[v] === exp.env[v]) && JSON.stringify(g.output) === JSON.stringify(exp.output) &&
        Object.keys(inf.arrays).every(a => JSON.stringify(g.arrays[a]) === JSON.stringify(exp.arrays[a]));
      if (!same(got)) { try { const g2 = tryRun(true); if (same(g2)) continue; } catch (e) { } }
      else continue;
      const shown = Object.entries(init).filter(([k]) => !inf.assigned.includes(k));
      const desc = (shown.length ? shown : Object.entries(init)).map(([k, v]) => k + '=' + v).join(', ');
      const usesRead = /read\s*\(/.test(cSrc);
      if (err) return { ok: false, msg: 'Con ' + desc + ' tu código falla al ejecutarse: ' + err.message, init };
      const diffs = [];
      for (const v of observed) if (got.env[v] !== exp.env[v]) diffs.push(v + ' debería valer ' + exp.env[v] + ' y vale ' + got.env[v]);
      if (JSON.stringify(got.output) !== JSON.stringify(exp.output)) diffs.push('se debería escribir [' + exp.output.join(', ') + '] y se escribe [' + got.output.join(', ') + ']');
      for (const a in inf.arrays) if (JSON.stringify(got.arrays[a]) !== JSON.stringify(exp.arrays[a])) diffs.push(a + ' debería quedar [' + exp.arrays[a] + '] y queda [' + got.arrays[a] + ']');
      return { ok: false, msg: 'Con los valores iniciales ' + desc + (usesRead ? ' (y read() devolviendo ' + input[0] + ')' : '') + ': ' + diffs.join('; '), init };
    }
    return { ok: true, code };
  }

  const api = { lex, parse, info, run, toTAC, generate, rng, checkTAC, randomInit };
  if (typeof module !== 'undefined') module.exports = api; else root.MiniC = api;
})(typeof window !== 'undefined' ? window : globalThis);
