// ===== Código de tres direcciones: parser, intérprete, cuádruplas, tercetos, bloques básicos y optimizaciones =====
(function (root) {
  const BINOPS = ['+', '-', '*', '/', '%', '<', '>', '<=', '>=', '==', '!=', '&&', '||', 'and', 'or'];
  const UNOPS = ['-', '!', 'not', 'castIntToDbl', 'castDblToInt', 'castDoubleToInt', 'castIntToDouble', 'int', 'double'];
  const ID = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
  const NUM = /^-?\d+(\.\d+)?$/;
  const isNum = x => typeof x === 'string' && NUM.test(x);
  const isVar = x => typeof x === 'string' && ID.test(x) && !isNum(x);

  class TacError extends Error { constructor(msg, line) { super('Línea ' + line + ': ' + msg); this.line = line; } }

  // Tokeniza una línea de TAC
  function lex(s) {
    const out = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      const two = s.substr(i, 2);
      if (['<=', '>=', '==', '!=', '&&', '||', ':='].includes(two)) { out.push(two === ':=' ? '=' : two); i += 2; continue; }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1]))) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; out.push(s.slice(i, j)); i = j; continue; }
      if (/[A-Za-z_$]/.test(c)) { let j = i; while (j < s.length && /[A-Za-z0-9_$]/.test(s[j])) j++; out.push(s.slice(i, j)); i = j; continue; }
      out.push(c); i++;
    }
    return out;
  }

  // Instrucción: {op, res, a, b, label, text, line}
  // op: 'bin','un','copy','label','goto','iffalse','if','read','write','push','call','halt','idxget','idxset','deref','store','addr','return','param'
  function parse(text) {
    const code = [];
    const lines = text.split('\n');
    lines.forEach((raw, k) => {
      const ln = k + 1;
      let s = raw.replace(/(#|\/\/).*$/, '').replace(/<--.*$/, '').trim();
      s = s.replace(/^\(?\d+\)?[.:)]?\s+(?=\S)/, m => /^\d+\s*$/.test(s) ? m : ''); // números de línea "01 " o "(3)"
      s = s.replace(/;$/, '').trim();
      if (!s) return;
      const t = lex(s);
      const err = m => { throw new TacError(m + ' → "' + raw.trim() + '"', ln); };
      const operand = x => { if (x === undefined) err('Falta un operando'); if (!(isVar(x) || isNum(x))) err('Operando no válido "' + x + '"'); return x; };
      let ins = null;
      const kw = t[0];
      if (t.length === 2 && t[1] === ':' && isVar(t[0])) ins = { op: 'label', label: t[0] };
      else if (kw === 'label') { if (t.length !== 2) err('label lleva un único nombre'); ins = { op: 'label', label: t[1] }; }
      else if (kw === 'goto') { if (t.length !== 2) err('goto lleva un único destino'); ins = { op: 'goto', label: t[1] }; }
      else if (kw === 'halt') ins = { op: 'halt' };
      else if (kw === 'ifFalse' || kw === 'iffalse' || (kw === 'if' && t[1] === 'false') || kw === 'if') {
        const neg = kw !== 'if' || t[1] === 'false';
        let rest = t.slice(kw === 'if' && t[1] === 'false' ? 2 : 1);
        const g = rest.indexOf('goto'); if (g < 0) err('Falta goto en el salto condicional');
        const cond = rest.slice(0, g); const L = rest[g + 1];
        if (!L || rest.length !== g + 2) err('Destino del salto no válido');
        if (cond.length === 1) ins = { op: neg ? 'iffalse' : 'if', a: operand(cond[0]), label: L };
        else if (cond.length === 3 && BINOPS.includes(cond[1])) ins = { op: neg ? 'iffalse' : 'if', a: operand(cond[0]), rel: cond[1], b: operand(cond[2]), label: L };
        else err('Condición del salto no válida (debe ser una variable o "a op b")');
      }
      else if (kw === 'read' || kw === 'write' || kw === 'push' || kw === 'param' || kw === 'return') {
        let args = t.slice(1).filter(x => x !== '(' && x !== ')');
        if (kw === 'return' && !args.length) ins = { op: 'return' };
        else { if (args.length !== 1) err(kw + ' lleva un único operando'); ins = { op: kw === 'param' ? 'push' : kw, a: operand(args[0]) }; }
      }
      else if (kw === 'call') { if (!isVar(t[1])) err('call necesita el nombre de la subrutina'); ins = { op: 'call', f: t[1], n: t[3] }; }
      else if (t[0] === '*' && t.includes('=')) {
        // *p = x
        if (t.length !== 4 || t[2] !== '=') err('Forma esperada: * p = x');
        ins = { op: 'store', res: operand(t[1]), a: operand(t[3]) };
      }
      else if (t[1] === '[' ) {
        // a[i] = x
        const e = t.indexOf(']'); if (e !== 3 || t[4] !== '=' || t.length !== 6) err('Forma esperada: a[i] = x');
        ins = { op: 'idxset', res: t[0], i: operand(t[2]), a: operand(t[5]) };
      }
      else if (t[1] === '=') {
        const x = t[0]; if (!isVar(x)) err('Destino no válido "' + x + '"');
        const r = t.slice(2);
        if (r.length === 1) ins = { op: 'copy', res: x, a: operand(r[0]) };
        else if (r.length === 2 && r[0] === '*') ins = { op: 'deref', res: x, a: operand(r[1]) };
        else if (r.length === 2 && r[0] === '&') ins = { op: 'addr', res: x, a: operand(r[1]) };
        else if (r.length === 2 && r[0] === 'call') ins = { op: 'callret', res: x, f: r[1] };
        else if (r.length === 2 && UNOPS.includes(r[0])) ins = { op: 'un', res: x, uop: r[0], a: operand(r[1]) };
        else if (r.length === 2 && r[0] === '-' ) ins = { op: 'un', res: x, uop: '-', a: operand(r[1]) };
        else if (r.length === 4 && r[1] === '[' && r[3] === ']') ins = { op: 'idxget', res: x, arr: r[0], i: operand(r[2]) };
        else if (r.length === 4 && r[0] === '(' && r[2] === ')') ins = { op: 'un', res: x, uop: r[1], a: operand(r[3]) };
        else if (r.length === 3 && BINOPS.includes(r[1])) ins = { op: 'bin', res: x, a: operand(r[0]), bop: r[1], b: operand(r[2]) };
        else if (r.length === 3 && r[0] === '-' ) ins = { op: 'un', res: x, uop: '-', a: operand(r[1] + r[2]) };
        else if (r.length > 3) err('Demasiadas operaciones en una sola instrucción: en código de tres direcciones cada instrucción hace como mucho una operación');
        else err('Instrucción no reconocida');
      }
      else err('Instrucción no reconocida');
      ins.line = ln; ins.text = raw.trim();
      code.push(ins);
    });
    return code;
  }

  function fmt(ins) {
    switch (ins.op) {
      case 'label': return 'label ' + ins.label;
      case 'goto': return 'goto ' + ins.label;
      case 'iffalse': return 'if false ' + (ins.rel ? ins.a + ' ' + ins.rel + ' ' + ins.b : ins.a) + ' goto ' + ins.label;
      case 'if': return 'if ' + (ins.rel ? ins.a + ' ' + ins.rel + ' ' + ins.b : ins.a) + ' goto ' + ins.label;
      case 'halt': return 'halt';
      case 'read': case 'write': case 'push': return ins.op + ' ' + ins.a;
      case 'return': return ins.a !== undefined ? 'return ' + ins.a : 'return';
      case 'call': return 'call ' + ins.f;
      case 'callret': return ins.res + ' = call ' + ins.f;
      case 'copy': return ins.res + ' = ' + ins.a;
      case 'un': return ins.res + ' = ' + (ins.uop === '-' ? '- ' : ins.uop + ' ') + ins.a;
      case 'bin': return ins.res + ' = ' + ins.a + ' ' + ins.bop + ' ' + ins.b;
      case 'idxget': return ins.res + ' = ' + ins.arr + '[' + ins.i + ']';
      case 'idxset': return ins.res + '[' + ins.i + '] = ' + ins.a;
      case 'deref': return ins.res + ' = * ' + ins.a;
      case 'store': return '* ' + ins.res + ' = ' + ins.a;
      case 'addr': return ins.res + ' = & ' + ins.a;
    }
    return '?';
  }
  const fmtAll = code => code.map(fmt).join('\n');

  // ---------- Intérprete ----------
  const FUNCS = {
    abs: a => Math.abs(a), max: (a, b) => Math.max(a, b), min: (a, b) => Math.min(a, b),
    cuadrado: a => a * a, doble: a => 2 * a, cos: a => Math.cos(a), sqrt: a => Math.sqrt(a), suma: (a, b) => a + b
  };
  function evalBin(op, x, y, intMode) {
    switch (op) {
      case '+': return x + y; case '-': return x - y; case '*': return x * y;
      case '/': if (y === 0) throw new Error('División por cero'); return intMode && Number.isInteger(x) && Number.isInteger(y) ? Math.trunc(x / y) : x / y;
      case '%': if (y === 0) throw new Error('Módulo por cero'); return x % y;
      case '<': return +(x < y); case '>': return +(x > y); case '<=': return +(x <= y); case '>=': return +(x >= y);
      case '==': return +(x === y); case '!=': return +(x !== y);
      case '&&': case 'and': return +(!!x && !!y); case '||': case 'or': return +(!!x || !!y);
    }
    throw new Error('Operador ' + op);
  }
  // env: valores iniciales; arrays: {nombre: tamaño}; opts.byteIndex: a[i] con i en bytes
  function run(code, init = {}, opts = {}) {
    const env = Object.assign({}, init);
    const arrays = opts.arrays || {};
    const mem = {}; const base = {}; let next = 1000;
    for (const a in arrays) { base[a] = next; next += 4 * arrays[a] + 400; const vals = (init[a] || []); for (let k = 0; k < arrays[a]; k++) mem[base[a] + 4 * k] = vals[k] !== undefined ? vals[k] : 0; delete env[a]; }
    const labels = {};
    code.forEach((ins, k) => { if (ins.op === 'label') { if (labels[ins.label] !== undefined) throw new Error('Etiqueta repetida ' + ins.label); labels[ins.label] = k; } });
    const input = (opts.input || []).slice(); const output = []; const stack = [];
    const val = x => {
      if (isNum(x)) return Number(x);
      if (x in base) return base[x];
      if (!(x in env)) throw new Error('Variable sin valor: ' + x);
      return env[x];
    };
    const intMode = opts.intMode !== false;
    const memRead = addr => { if (!(addr in mem)) throw new Error('Acceso a memoria fuera de un vector (dirección ' + addr + ')'); return mem[addr]; };
    const memWrite = (addr, v) => { if (!(addr in mem)) throw new Error('Escritura fuera de un vector (dirección ' + addr + ')'); mem[addr] = v; };
    const idxAddr = (arr, i) => { if (!(arr in base)) throw new Error(arr + ' no es un vector'); return base[arr] + (opts.byteIndex ? i : 4 * i); };
    let pc = 0, steps = 0;
    const max = opts.maxSteps || 20000;
    while (pc < code.length) {
      if (++steps > max) throw new Error('Demasiados pasos: ¿bucle infinito?');
      const ins = code[pc];
      const jump = L => { if (labels[L] === undefined) throw new Error('Etiqueta no definida: ' + L); pc = labels[L]; };
      switch (ins.op) {
        case 'label': break;
        case 'goto': jump(ins.label); continue;
        case 'iffalse': case 'if': {
          const c = ins.rel ? evalBin(ins.rel, val(ins.a), val(ins.b), intMode) : val(ins.a);
          if ((ins.op === 'iffalse') === !c) { jump(ins.label); continue; }
          break;
        }
        case 'halt': pc = code.length; continue;
        case 'read': env[ins.a] = input.length ? input.shift() : 0; break;
        case 'write': output.push(val(ins.a)); break;
        case 'push': stack.push(val(ins.a)); break;
        case 'call': case 'callret': {
          const f = FUNCS[ins.f]; if (!f) throw new Error('Subrutina desconocida: ' + ins.f);
          const args = stack.splice(stack.length - f.length, f.length);
          const r = f(...args); env['$RET'] = r; if (ins.op === 'callret') env[ins.res] = r; break;
        }
        case 'return': pc = code.length; continue;
        case 'copy': env[ins.res] = val(ins.a); break;
        case 'un': {
          const v = val(ins.a);
          env[ins.res] = ins.uop === '-' ? -v : (ins.uop === '!' || ins.uop === 'not') ? +!v : /Int$|^int$/.test(ins.uop) && !/ToD/.test(ins.uop) ? Math.trunc(v) : v;
          break;
        }
        case 'bin': env[ins.res] = evalBin(ins.bop, val(ins.a), val(ins.b), intMode); break;
        case 'idxget': env[ins.res] = memRead(idxAddr(ins.arr, val(ins.i))); break;
        case 'idxset': memWrite(idxAddr(ins.res, val(ins.i)), val(ins.a)); break;
        case 'deref': env[ins.res] = memRead(val(ins.a)); break;
        case 'store': memWrite(val(ins.res), val(ins.a)); break;
        case 'addr': env[ins.res] = base[ins.a] !== undefined ? base[ins.a] : (() => { throw new Error('& solo para vectores en esta app'); })(); break;
      }
      pc++;
    }
    const arrOut = {}; for (const a in arrays) { arrOut[a] = []; for (let k = 0; k < arrays[a]; k++) arrOut[a].push(mem[base[a] + 4 * k]); }
    return { env, arrays: arrOut, output, steps };
  }

  // ---------- Cuádruplas y tercetos ----------
  const QOP = { '+': 'add', '-': 'sub', '*': 'mult', '/': 'div', '%': 'mod', '>': 'isbigger', '<': 'issmaller', '>=': 'is>=', '<=': 'is<=', '==': 'isequal', '!=': 'isdistinct', '&&': 'and', '||': 'or', 'and': 'and', 'or': 'or' };
  // Convención del módulo: a < b se escribe (isbigger, t, b, a)
  function toQuads(code) {
    const q = [];
    for (const ins of code) {
      switch (ins.op) {
        case 'bin': if (ins.bop === '<') q.push(['isbigger', ins.res, ins.b, ins.a]); else q.push([QOP[ins.bop], ins.res, ins.a, ins.b]); break;
        case 'un': q.push([ins.uop === '-' ? 'minus' : ins.uop === '!' || ins.uop === 'not' ? 'not' : ins.uop, ins.res, ins.a, '-']); break;
        case 'copy': q.push(['assign', ins.res, ins.a, '-']); break;
        case 'label': q.push(['label', ins.label, '-', '-']); break;
        case 'goto': q.push(['goto', ins.label, '-', '-']); break;
        case 'iffalse': q.push(['if false', ins.a, ins.label, '-']); break;
        case 'if': q.push(['if', ins.a, ins.label, '-']); break;
        case 'read': case 'write': case 'push': q.push([ins.op, ins.a, '-', '-']); break;
        case 'call': q.push(['call', ins.f, '-', '-']); break;
        case 'halt': q.push(['halt', '-', '-', '-']); break;
        case 'idxget': q.push(['idxget', ins.res, ins.arr, ins.i]); break;
        case 'idxset': q.push(['idxset', ins.res, ins.i, ins.a]); break;
        case 'deref': q.push(['deref', ins.res, ins.a, '-']); break;
        case 'store': q.push(['store', ins.res, ins.a, '-']); break;
        default: q.push([ins.op, ins.res || '-', ins.a || '-', ins.b || '-']);
      }
    }
    return q;
  }
  const qStr = q => '(' + q.join(',') + ')';
  // Sinónimos aceptados al corregir cuádruplas
  const SYN = {
    add: 'add', suma: 'add', sum: 'add', '+': 'add', plus: 'add',
    sub: 'sub', resta: 'sub', '-': 'sub', minus2: 'sub',
    mult: 'mult', mul: 'mult', '*': 'mult', multiplica: 'mult', times: 'mult',
    div: 'div', '/': 'div', divide: 'div', mod: 'mod', '%': 'mod',
    assign: 'assign', asigna: 'assign', '=': 'assign', ':=': 'assign', copy: 'assign', mov: 'assign',
    isbigger: '>', 'is>': '>', '>': '>', isgreater: '>', gt: '>',
    issmaller: '<', 'is<': '<', '<': '<', isless: '<', lt: '<', islower: '<',
    'is>=': '>=', '>=': '>=', isbiggerorequal: '>=', ge: '>=', isbiggerequal: '>=',
    'is<=': '<=', '<=': '<=', issmallerorequal: '<=', le: '<=', issmallerequal: '<=',
    isequal: '==', 'is==': '==', '==': '==', eq: '==', equal: '==',
    isdistinct: '!=', isnotequal: '!=', 'is!=': '!=', '!=': '!=', ne: '!=', isdifferent: '!=',
    and: 'and', '&&': 'and', or: 'or', '||': 'or', not: 'not', '!': 'not', minus: 'minus', neg: 'minus', uminus: 'minus',
    label: 'label', goto: 'goto', 'if false': 'iffalse', iffalse: 'iffalse', 'iffalse ': 'iffalse', if: 'if',
    read: 'read', write: 'write', push: 'push', param: 'push', call: 'call', halt: 'halt'
  };
  function canonQuad(q) {
    let [op, r, a, b] = q.map(x => (x === undefined || x === '' || x === '_' || x === '–' || x === '—') ? '-' : String(x).trim());
    const key = op.toLowerCase().replace(/\s+/g, ' ').trim();
    let c = SYN[key] || SYN[key.replace(/\s/g, '')] || key;
    if (c === '<') { c = '>'; [a, b] = [b, a]; }
    if (c === '<=') { c = '>='; [a, b] = [b, a]; }
    if ((c === 'add' || c === 'mult' || c === '==' || c === '!=' || c === 'and' || c === 'or') && a > b) [a, b] = [b, a];
    return [c, r, a, b].join(',');
  }
  function parseQuads(text) {
    const out = [];
    text.split('\n').forEach((l, k) => {
      l = l.trim(); if (!l) return;
      l = l.replace(/^\(?\d+\)\s*/, '').replace(/^\d+[.:]\s*/, '');
      const m = l.match(/^\((.*)\)$/); if (!m) throw new Error('Línea ' + (k + 1) + ': cada cuádrupla va entre paréntesis: (op, res, arg1, arg2)');
      const parts = m[1].split(',').map(s => s.trim());
      if (parts.length < 2 || parts.length > 4) throw new Error('Línea ' + (k + 1) + ': una cuádrupla tiene 4 campos (usa - para los vacíos)');
      while (parts.length < 4) parts.push('-');
      out.push(parts);
    });
    return out;
  }
  // Tercetos: los temporales se sustituyen por referencias (n); las etiquetas desaparecen y los saltos apuntan al número de terceto
  function toTriples(code) {
    const isTemp = v => /^(t|tmp|T)\d+$/.test(v);
    const tr = []; const ref = {}; const pendingLabels = []; const labelPos = {}; const fix = [];
    const R = x => (ref[x] !== undefined ? '(' + ref[x] + ')' : x);
    for (const ins of code) {
      if (ins.op === 'label') { pendingLabels.push(ins.label); continue; }
      const here = tr.length;
      for (const L of pendingLabels) labelPos[L] = here; pendingLabels.length = 0;
      switch (ins.op) {
        case 'bin': {
          let op = ins.bop === '<' ? 'isbigger' : QOP[ins.bop]; let a = R(ins.a), b = R(ins.b);
          if (ins.bop === '<') [a, b] = [b, a];
          tr.push([op, a, b]);
          if (isTemp(ins.res)) ref[ins.res] = here; else tr.push(['assign', ins.res, '(' + here + ')']);
          break;
        }
        case 'un': {
          tr.push([ins.uop === '-' ? 'minus' : ins.uop, R(ins.a), '-']);
          if (isTemp(ins.res)) ref[ins.res] = here; else tr.push(['assign', ins.res, '(' + here + ')']);
          break;
        }
        case 'copy': if (isTemp(ins.res) && !isTemp(ins.a)) { tr.push(['assign', ins.res, R(ins.a)]); ref[ins.res] = here; } else tr.push(['assign', ins.res, R(ins.a)]); break;
        case 'goto': fix.push([here, 1, ins.label]); tr.push(['goto', '?']); break;
        case 'iffalse': fix.push([here, 2, ins.label]); tr.push(['if false', R(ins.a), '?']); break;
        case 'if': fix.push([here, 2, ins.label]); tr.push(['if', R(ins.a), '?']); break;
        case 'read': case 'write': case 'push': tr.push([ins.op, R(ins.a), '-']); break;
        case 'call': tr.push(['call', ins.f, '-']); break;
        case 'halt': tr.push(['halt', '-', '-']); break;
        default: tr.push([ins.op, R(ins.a || '-'), R(ins.b || ins.i || '-')]);
      }
    }
    for (const L of pendingLabels) labelPos[L] = tr.length;
    for (const [k, pos, L] of fix) tr[k][pos] = '(' + labelPos[L] + ')';
    return tr;
  }
  const tStr = (t, k) => '(' + k + ') (' + t.join(',') + ')';
  function canonTriple(t) {
    let [op, a, b] = [0, 1, 2].map(i => t[i]).map(x => (x === undefined || x === '' || x === '_') ? '-' : String(x).replace(/\s/g, ''));
    const key = op.toLowerCase().replace(/\s+/g, ' ').trim();
    let c = SYN[key] || SYN[key.replace(/\s/g, '')] || key;
    if (c === '<') { c = '>'; [a, b] = [b, a]; }
    if (c === '<=') { c = '>='; [a, b] = [b, a]; }
    if ((c === 'add' || c === 'mult' || c === '==' || c === '!=') && a > b) [a, b] = [b, a];
    return [c, a, b].join(',');
  }
  function parseTriples(text) {
    const out = [];
    text.split('\n').forEach((l, k) => {
      l = l.trim(); if (!l) return;
      const m = l.match(/^\(?(\d+)\)?\s*\((.*)\)$/);
      if (!m) throw new Error('Línea ' + (k + 1) + ': formato esperado "(n) (op, arg1, arg2)"');
      const parts = m[2].split(',').map(s => s.trim()); while (parts.length < 3) parts.push('-');
      if (parts.length > 3) throw new Error('Línea ' + (k + 1) + ': un terceto tiene 3 campos');
      out.push({ n: +m[1], t: parts });
    });
    return out;
  }

  // ---------- Bloques básicos ----------
  function leaders(code) {
    const L = new Set(); if (code.length) L.add(0);
    code.forEach((ins, k) => {
      if (ins.op === 'label') L.add(k);
      if (['goto', 'iffalse', 'if', 'halt', 'return'].includes(ins.op) && k + 1 < code.length) L.add(k + 1);
    });
    return [...L].sort((a, b) => a - b);
  }
  function blocks(code) {
    const ls = leaders(code); const out = [];
    ls.forEach((s, i) => out.push({ start: s, end: (i + 1 < ls.length ? ls[i + 1] : code.length) - 1 }));
    const byLabel = {}; out.forEach((b, i) => { const ins = code[b.start]; if (ins.op === 'label') byLabel[ins.label] = i; });
    out.forEach((b, i) => {
      const last = code[b.end]; b.succ = [];
      if (last.op === 'goto') b.succ.push(byLabel[last.label]);
      else if (last.op === 'iffalse' || last.op === 'if') { if (i + 1 < out.length) b.succ.push(i + 1); b.succ.push(byLabel[last.label]); }
      else if (last.op !== 'halt' && last.op !== 'return' && i + 1 < out.length) b.succ.push(i + 1);
      b.succ = [...new Set(b.succ.filter(x => x !== undefined))];
    });
    return out;
  }

  // ---------- Usos y definiciones ----------
  function defs(ins) { return ['bin', 'un', 'copy', 'idxget', 'deref', 'read', 'addr', 'callret'].includes(ins.op) ? [ins.res] : ins.op === 'call' ? ['$RET'] : []; }
  function uses(ins) {
    const u = [];
    const add = x => { if (isVar(x)) u.push(x); };
    switch (ins.op) {
      case 'bin': add(ins.a); add(ins.b); break;
      case 'un': case 'copy': case 'write': case 'push': case 'deref': case 'return': add(ins.a); break;
      case 'iffalse': case 'if': add(ins.a); if (ins.rel) add(ins.b); break;
      case 'idxget': add(ins.arr); add(ins.i); break;
      case 'idxset': add(ins.res); add(ins.i); add(ins.a); break;
      case 'store': add(ins.res); add(ins.a); break;
    }
    return u;
  }
  const hasSideEffect = ins => ['write', 'push', 'call', 'callret', 'idxset', 'store', 'read', 'label', 'goto', 'iffalse', 'if', 'halt', 'return'].includes(ins.op);

  // ---------- Optimizaciones de referencia ----------
  const clone = code => code.map(i => Object.assign({}, i));
  function numStr(v) { if (Number.isInteger(v)) return String(v); return String(+v.toFixed(10)); }
  // Copias disponibles (global): para cada instrucción, mapa x → y (y variable o constante) válido a su entrada
  function availCopies(code) {
    const bl = blocks(code);
    const preds = bl.map(() => []); bl.forEach((b, i) => b.succ.forEach(s => preds[s].push(i)));
    const isCopy = ins => ins.op === 'copy' && ins.a !== ins.res && ins.a !== '$RET';
    const U = new Set(); code.forEach(ins => { if (isCopy(ins)) U.add(ins.res + '=' + ins.a); });
    const transfer = (set, ins) => {
      for (const d of defs(ins)) for (const c of [...set]) { const [x, y] = c.split('='); if (x === d || y === d) set.delete(c); }
      if (isCopy(ins)) set.add(ins.res + '=' + ins.a);
    };
    const inS = bl.map((_, i) => i === 0 ? new Set() : new Set(U)); const outS = bl.map(() => new Set(U));
    let changed = true, guard = 0;
    while (changed && guard++ < 100) {
      changed = false;
      bl.forEach((b, i) => {
        let inn;
        if (i === 0 || !preds[i].length) inn = new Set();
        else { inn = new Set(outS[preds[i][0]]); for (const p of preds[i].slice(1)) for (const c of [...inn]) if (!outS[p].has(c)) inn.delete(c); }
        const cur = new Set(inn); for (let k = b.start; k <= b.end; k++) transfer(cur, code[k]);
        if (cur.size !== outS[i].size || [...cur].some(c => !outS[i].has(c))) changed = true;
        inS[i] = inn; outS[i] = cur;
      });
    }
    const at = [];
    bl.forEach((b, i) => { const cur = new Set(inS[i]); for (let k = b.start; k <= b.end; k++) { const m = {}; for (const c of cur) { const j = c.indexOf('='); m[c.slice(0, j)] = c.slice(j + 1); } at[k] = m; transfer(cur, code[k]); } });
    return at;
  }
  // Cálculo previo de constantes: evalúa en compilación las operaciones cuyos operandos son constantes conocidas
  function constantFolding(code, opts = {}) {
    code = clone(code);
    for (let pass = 0; pass < 6; pass++) {
      const at = availCopies(code); let any = false;
      code.forEach((ins, k) => {
        const v = x => isNum(x) ? Number(x) : (at[k][x] !== undefined && isNum(at[k][x]) ? Number(at[k][x]) : null);
        if (ins.op === 'bin') {
          const a = v(ins.a), c = v(ins.b);
          if (a !== null && c !== null && !((ins.bop === '/' || ins.bop === '%') && c === 0)) {
            code[k] = { op: 'copy', res: ins.res, a: numStr(evalBin(ins.bop, a, c, opts.intMode !== false)), line: ins.line, changed: true }; any = true;
          }
        } else if (ins.op === 'un' && v(ins.a) !== null && (ins.uop === '-' || /cast|^int$|^double$/.test(ins.uop))) {
          const a = v(ins.a); const r = ins.uop === '-' ? -a : /ToInt|^int$/.test(ins.uop) ? Math.trunc(a) : a;
          code[k] = { op: 'copy', res: ins.res, a: numStr(r), line: ins.line, changed: true }; any = true;
        } else if ((ins.op === 'iffalse' || ins.op === 'if') && ins.rel && v(ins.a) !== null && v(ins.b) !== null) {
          /* se deja: el salto constante lo trataría la eliminación de código muerto */
        }
      });
      if (!any) break;
    }
    return code;
  }
  // Propagación de copias (global): tras x = y, los usos de x se sustituyen por y mientras ninguna de las dos cambie
  function copyPropagation(code) {
    code = clone(code);
    for (let pass = 0; pass < 6; pass++) {
      const at = availCopies(code); let any = false;
      code.forEach((ins, k) => {
        const m = at[k];
        const sub = x => { let y = x, n = 0; while (isVar(y) && m[y] !== undefined && n++ < 10) y = m[y]; return y; };
        const rep = f => { if (ins[f] !== undefined && isVar(ins[f])) { const n = sub(ins[f]); if (n !== ins[f]) { ins[f] = n; ins.changed = true; any = true; } } };
        if (ins.op === 'bin') { rep('a'); rep('b'); }
        else if (['un', 'copy', 'write', 'push', 'deref', 'return'].includes(ins.op)) rep('a');
        else if (ins.op === 'iffalse' || ins.op === 'if') { rep('a'); if (ins.rel) rep('b'); }
        else if (ins.op === 'idxget') rep('i');
        else if (ins.op === 'idxset') { rep('i'); rep('a'); }
        else if (ins.op === 'store') { rep('res'); rep('a'); }
        if (ins.op === 'copy' && ins.a === ins.res) { /* x = x */ }
      });
      if (!any) break;
    }
    return code;
  }
  // Subexpresiones comunes (local, por bloque)
  function cse(code) {
    code = clone(code);
    const bl = blocks(code);
    for (const b of bl) {
      const avail = []; // {key, res, vars}
      for (let k = b.start; k <= b.end; k++) {
        const ins = code[k];
        if (ins.op === 'bin') {
          const comm = ['+', '*', '==', '!=', '&&', '||'].includes(ins.bop);
          const key = comm && ins.a > ins.b ? ins.b + ins.bop + ins.a : ins.a + ins.bop + ins.b;
          const hit = avail.find(e => e.key === key);
          if (hit) { code[k] = { op: 'copy', res: ins.res, a: hit.res, line: ins.line, changed: true }; }
          const d = ins.res;
          for (let j = avail.length - 1; j >= 0; j--) if (avail[j].res === d || avail[j].vars.includes(d)) avail.splice(j, 1);
          if (!hit && ins.a !== d && ins.b !== d) avail.push({ key, res: d, vars: [ins.a, ins.b] });
        } else {
          for (const d of defs(ins)) for (let j = avail.length - 1; j >= 0; j--) if (avail[j].res === d || avail[j].vars.includes(d)) avail.splice(j, 1);
          if (ins.op === 'idxset' || ins.op === 'store' || ins.op === 'call') { /* memoria: no afecta a escalares */ }
        }
      }
    }
    return code;
  }
  // Variables vivas (global, con flujo entre bloques). liveOut: variables observables al final
  function liveness(code, liveOut = []) {
    const bl = blocks(code);
    const inS = bl.map(() => new Set()), outS = bl.map(() => new Set());
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = bl.length - 1; i >= 0; i--) {
        const b = bl[i];
        const out = new Set(b.succ.length ? [] : liveOut);
        for (const s of b.succ) for (const v of inS[s]) out.add(v);
        const live = new Set(out);
        for (let k = b.end; k >= b.start; k--) { for (const d of defs(code[k])) live.delete(d); for (const u of uses(code[k])) live.add(u); }
        if (live.size !== inS[i].size || [...live].some(v => !inS[i].has(v))) { inS[i] = live; changed = true; }
        outS[i] = out;
      }
    }
    // vivos tras cada instrucción
    const after = [];
    bl.forEach((b, i) => {
      const live = new Set(outS[i]);
      for (let k = b.end; k >= b.start; k--) { after[k] = new Set(live); for (const d of defs(code[k])) live.delete(d); for (const u of uses(code[k])) live.add(u); }
    });
    return { after, blocks: bl };
  }
  function deadCode(code, liveOut = []) {
    let cur = clone(code);
    for (let it = 0; it < 10; it++) {
      const { after } = liveness(cur, liveOut);
      const keep = cur.filter((ins, k) => hasSideEffect(ins) || defs(ins).some(d => after[k].has(d)));
      if (keep.length === cur.length) break;
      cur = keep;
    }
    return cur;
  }
  // Bucles naturales a partir de saltos hacia atrás (goto L / if ... goto L con L anterior)
  function loops(code) {
    const pos = {}; code.forEach((ins, k) => { if (ins.op === 'label') pos[ins.label] = k; });
    const out = [];
    code.forEach((ins, k) => { if (['goto', 'iffalse', 'if'].includes(ins.op) && pos[ins.label] !== undefined && pos[ins.label] < k) out.push({ head: pos[ins.label], tail: k }); });
    return out;
  }
  // Reducción de frecuencia: saca del bucle las instrucciones invariantes (operandos no definidos dentro del bucle)
  function frequencyReduction(code) {
    let cur = clone(code);
    for (let guard = 0; guard < 10; guard++) {
      const lps = loops(cur); let moved = false;
      for (const lp of lps) {
        const body = cur.slice(lp.head, lp.tail + 1);
        const defCount = {}; body.forEach(ins => defs(ins).forEach(d => defCount[d] = (defCount[d] || 0) + 1));
        const inv = [];
        for (let k = lp.head; k <= lp.tail; k++) {
          const ins = cur[k];
          if (!['bin', 'un'].includes(ins.op)) continue;
          if (defCount[ins.res] !== 1) continue;
          const ops = uses(ins);
          if (ops.some(u => defCount[u] && !inv.some(i => i.res === u))) continue;
          // el resultado no puede usarse antes de definirse dentro del bucle
          const firstUse = body.findIndex(i => uses(i).includes(ins.res));
          if (firstUse !== -1 && firstUse < k - lp.head) continue;
          inv.push(ins);
        }
        if (inv.length) {
          const rest = cur.filter(i => !inv.includes(i));
          const head = rest.indexOf(cur[lp.head]);
          inv.forEach(i => i.changed = true);
          rest.splice(head, 0, ...inv);
          cur = rest; moved = true; break;
        }
      }
      if (!moved) break;
    }
    return cur;
  }
  function changedText(code) { return code.map(i => fmt(i) + (i.changed ? '   <-- cambia' : '')).join('\n'); }

  const api = { parse, fmt, fmtAll, run, evalBin, toQuads, qStr, canonQuad, parseQuads, toTriples, tStr, canonTriple, parseTriples,
    leaders, blocks, availCopies, defs, uses, liveness, constantFolding, copyPropagation, cse, deadCode, loops, frequencyReduction, changedText,
    isNum, isVar, hasSideEffect, FUNCS, TacError, clone };
  if (typeof module !== 'undefined') module.exports = api; else root.Tac = api;
})(typeof window !== 'undefined' ? window : globalThis);
