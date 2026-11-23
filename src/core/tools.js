// ===== Mini-JLex (ejecuta especificaciones .lex sobre un texto) y mini-CUP (comprueba gramáticas .cup) =====
(function (root) {
  const RxM = (typeof module !== 'undefined') ? require('./regex.js') : root.Rx;
  const GramM = (typeof module !== 'undefined') ? require('./grammar.js') : root.Gram;

  // ---------- utilidades ----------
  // lee un bloque { ... } equilibrado empezando en src[i] === '{'; respeta cadenas y comentarios
  function readBraces(src, i) {
    let depth = 0; let k = i;
    while (k < src.length) {
      const c = src[k];
      if (c === '"' || c === "'") { const q = c; k++; while (k < src.length && src[k] !== q) { if (src[k] === '\\') k++; k++; } k++; continue; }
      if (src.startsWith('//', k)) { while (k < src.length && src[k] !== '\n') k++; continue; }
      if (src.startsWith('/*', k)) { const e = src.indexOf('*/', k + 2); k = e < 0 ? src.length : e + 2; continue; }
      if (c === '{') depth++;
      if (c === '}') { depth--; if (depth === 0) return { text: src.slice(i + 1, k), end: k + 1 }; }
      k++;
    }
    return null;
  }
  const lineOf = (src, pos) => src.slice(0, pos).split('\n').length;

  // ---------- JLex ----------
  function parseJLex(spec) {
    const errors = [], warnings = [];
    const lines = spec.split('\n');
    const seps = []; lines.forEach((l, k) => { if (l.trim() === '%%') seps.push(k); });
    if (seps.length < 2) throw new Error('Una especificación JLex tiene tres secciones separadas por líneas con %% (código de usuario, directivas y reglas). Faltan separadores.');
    const dirLines = lines.slice(seps[0] + 1, seps[1]);
    const rulesStartLine = seps[1] + 1;
    const rulesText = lines.slice(seps[1] + 1).join('\n');
    const macros = {}; const states = ['YYINITIAL']; const flags = {};
    let inBlock = null;
    dirLines.forEach((raw, k) => {
      const ln = seps[0] + 2 + k; const l = raw.trim();
      if (inBlock) { if (l.startsWith(inBlock)) inBlock = null; return; }
      if (!l || l.startsWith('//')) return;
      if (l === '%{') { inBlock = '%}'; return; }
      const blk = l.match(/^%(init|eofval|eof|yylexthrow|initthrow|eofthrow)\{/);
      if (blk) { if (!l.includes('%' + blk[1] + '}')) inBlock = '%' + blk[1] + '}'; return; }
      if (/^%(state|xstate)\b/.test(l)) { l.replace(/^%x?state/, '').split(/[\s,]+/).filter(Boolean).forEach(s => states.push(s)); return; }
      if (/^%ignorecase\b/.test(l)) { flags.ignoreCase = true; return; }
      if (/^%cup\b/.test(l)) { flags.cup = true; return; }
      if (/^%(line|char|class|type|function|public|full|unicode|notunix|integer|intwrap|implements|eofclose|debug)\b/.test(l)) { flags[l.split(/\s/)[0].slice(1)] = l.split(/\s+/)[1] || true; return; }
      const m = l.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) {
        const def = m[2].trim();
        if (!def) { errors.push('Línea ' + ln + ': la macro ' + m[1] + ' está vacía'); return; }
        if (/\s/.test(def.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, ''))) warnings.push('Línea ' + ln + ': la macro ' + m[1] + ' tiene espacios sin comillas; JLex podría cortarla ahí.');
        macros[m[1]] = def; return;
      }
      if (l.startsWith('%')) { warnings.push('Línea ' + ln + ': directiva ' + l.split(/\s/)[0] + ' ignorada por la app'); return; }
      errors.push('Línea ' + ln + ': no entiendo esta línea de la sección de directivas: "' + l + '"');
    });
    // validar macros
    for (const name in macros) { try { const r = RxM.parse(macros[name], { macros, lenient: true }); r.warnings.forEach(w => warnings.push('Macro ' + name + ': ' + w)); } catch (e) { errors.push('Macro ' + name + ': ' + e.message); } }
    // reglas
    const rules = []; let i = 0; const src = rulesText;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (src.startsWith('//', i)) { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (src.startsWith('/*', i)) { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue; }
      const ln = rulesStartLine + lineOf(src, i);
      let st = null;
      if (c === '<') {
        const e = src.indexOf('>', i); if (e < 0) { errors.push('Línea ' + ln + ': falta > en la lista de estados'); break; }
        st = src.slice(i + 1, e).split(/[\s,]+/).filter(Boolean);
        for (const s of st) if (!states.includes(s)) errors.push('Línea ' + ln + ': el estado ' + s + ' no está declarado con %state');
        i = e + 1;
        while (src[i] === ' ' || src[i] === '\t') i++;
      }
      // extensión de la expresión regular: hasta el primer blanco fuera de comillas y corchetes
      let k = i, inQ = false, inB = false;
      while (k < src.length) {
        const d = src[k];
        if (d === '\\') { k += 2; continue; }
        if (inQ) { if (d === '"') inQ = false; k++; continue; }
        if (d === '"') { inQ = true; k++; continue; }
        if (inB) { if (d === ']') inB = false; k++; continue; }
        if (d === '[') { inB = true; k++; continue; }
        if (/\s/.test(d)) break;
        k++;
      }
      const reText = src.slice(i, k);
      i = k;
      while (i < src.length && /[ \t]/.test(src[i])) i++;
      if (src[i] !== '{') {
        errors.push('Línea ' + ln + ': después de la expresión "' + reText + '" debe ir la acción entre llaves. Ojo: un espacio sin comillas termina la expresión regular.');
        while (i < src.length && src[i] !== '\n') i++;
        continue;
      }
      const b = readBraces(src, i);
      if (!b) { errors.push('Línea ' + ln + ': llaves de la acción sin cerrar'); break; }
      i = b.end;
      let re = null;
      try { re = RxM.compile(reText, { macros, ignoreCase: flags.ignoreCase }); }
      catch (e) { errors.push('Línea ' + ln + ': expresión "' + reText + '": ' + e.message); }
      const action = b.text;
      const tok = action.match(/return\s+new\s+(?:java_cup\.runtime\.)?Symbol\s*\(\s*(?:sym\s*\.\s*)?([A-Za-z_]\w*)/) || action.match(/return\s+(?:sym\s*\.\s*)([A-Za-z_]\w*)/) || action.match(/return\s+new\s+\w+\s*\(\s*"?([A-Za-z_]\w*)/);
      const begin = [...action.matchAll(/yybegin\s*\(\s*([A-Za-z_]\w*)\s*\)/g)].map(m => m[1]);
      for (const s of begin) if (!states.includes(s)) errors.push('Línea ' + ln + ': yybegin(' + s + ') usa un estado no declarado');
      let tokName = tok ? tok[1] : null;
      const emit = action.match(/\b\w+\s*\.\s*emit(\w*)\s*\(\s*([^)]*)\)/);
      if (!tokName && emit && !/error/i.test(emit[1])) {
        const arg = emit[2].match(/(?:\w+\s*\.\s*)+(\w+)\s*$/);
        tokName = arg ? arg[1] : emit[1].toUpperCase();
        if (/^(true|false)$/.test(emit[2].trim())) tokName = emit[2].trim().toUpperCase();
      }
      const isError = !tokName && /System\s*\.\s*(err|out)\s*\.\s*print|throw\s+new|[Ee]rror/.test(action);
      const value = tok && /yytext\s*\(\s*\)|new\s+Integer|Integer\s*\.\s*(parseInt|valueOf)|new\s+Double|Double\s*\.\s*parse/.test(action) ? true : false;
      rules.push({ states: st, reText, re, action: action.trim(), token: tokName, begin, isError, value, line: ln });
    }
    if (!rules.length && !errors.length) errors.push('No hay ninguna regla en la tercera sección');
    return { macros, states, flags, rules, errors, warnings };
  }

  function runJLex(spec, input, opts = {}) {
    const P = typeof spec === 'string' ? parseJLex(spec) : spec;
    if (P.errors.length) return { ok: false, errors: P.errors, warnings: P.warnings, tokens: [] };
    let pos = 0, state = 'YYINITIAL', line = 1;
    const tokens = [], lexErrors = [], trace = [];
    let guard = 0;
    while (pos < input.length && guard++ < 20000) {
      let best = -1, bestLen = 0;
      P.rules.forEach((r, k) => {
        if (r.states && !r.states.includes(state)) return;
        if (!r.re) return;
        const L = RxM.longestPrefix(r.re, input, pos);
        if (L > bestLen) { bestLen = L; best = k; }
      });
      if (best < 0) {
        lexErrors.push('Línea ' + line + ': ningún patrón reconoce "' + (input[pos] === '\n' ? '\\n' : input[pos]) + '" (estado ' + state + ')');
        if (input[pos] === '\n') line++;
        pos++; continue;
      }
      const r = P.rules[best]; const text = input.substr(pos, bestLen);
      trace.push({ text, rule: best, state, line });
      for (const s of r.begin) state = s;
      if (r.token) tokens.push({ token: r.token, text, line, rule: best });
      else if (r.isError) lexErrors.push('Línea ' + line + ': la regla de error (línea ' + r.line + ') salta con "' + text.replace(/\n/g, '\\n') + '"');
      line += (text.match(/\n/g) || []).length;
      pos += bestLen;
    }
    return { ok: true, tokens, lexErrors, trace, warnings: P.warnings, finalState: state, spec: P };
  }

  // ---------- CUP ----------
  function parseCUP(src) {
    const errors = [], warnings = [];
    // quitar bloques de código {: ... :} (se sustituyen por la marca @ACT, o se borran si son de declaración)
    let s = src.replace(/\r/g, '');
    s = s.replace(/(parser|action)\s+code\s*\{:[\s\S]*?:\}\s*;?/g, ' ').replace(/(init|scan)\s+with\s*\{:[\s\S]*?:\}\s*;?/g, ' ');
    s = s.replace(/\{:[\s\S]*?:\}/g, ' @ACT ');
    s = s.replace(/\/\/[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
    s = s.replace(/^\s*(import|package)\s+[^;]*;/gm, ' ');
    // tokenizar
    const tk = []; let i = 0;
    while (i < s.length) {
      if (/\s/.test(s[i])) { i++; continue; }
      if (s.startsWith('::=', i)) { tk.push('::='); i += 3; continue; }
      if (s.startsWith('@ACT', i)) { tk.push('@ACT'); i += 4; continue; }
      if (/[A-Za-z_$]/.test(s[i])) { let j = i; while (/[A-Za-z0-9_$.]/.test(s[j] || '')) j++; tk.push(s.slice(i, j)); i = j; continue; }
      if (s[i] === '%') { let j = i + 1; while (/[a-z]/.test(s[j] || '')) j++; tk.push(s.slice(i, j)); i = j; continue; }
      tk.push(s[i]); i++;
    }
    const terms = [], nonterms = [], prec = {}; const productions = []; let start = null; let precLevel = 0;
    const termType = {}, ntType = {};
    let p = 0;
    const readList = () => { const out = []; let cur = []; let depth = 0; while (p < tk.length && !(tk[p] === ';' && depth === 0)) { const t = tk[p++]; if (t === '<') depth++; if (t === '>') depth--; if (t === ',' && depth === 0) { out.push(cur); cur = []; } else cur.push(t); } p++; out.push(cur); return out.filter(x => x.length); };
    while (p < tk.length) {
      const t = tk[p];
      if (t === 'terminal' || (t === 'non' && tk[p + 1] === 'terminal') || t === 'nonterminal') {
        const isNT = t !== 'terminal'; p += (t === 'non') ? 2 : 1;
        const items = readList();
        let type = null;
        items.forEach((it, k) => {
          const ids = it.filter(x => /^[A-Za-z_$][\w$.]*$/.test(x));
          let name;
          if (k === 0 && it.length > 1) { name = it[it.length - 1]; type = it.slice(0, -1).join(''); }
          else name = ids[ids.length - 1];
          if (!name) return;
          if (terms.includes(name) || nonterms.includes(name)) errors.push('El símbolo ' + name + ' está declarado dos veces');
          (isNT ? nonterms : terms).push(name);
          if (type) (isNT ? ntType : termType)[name] = type;
        });
        continue;
      }
      if (t === 'precedence') {
        const assoc = tk[p + 1]; p += 2; precLevel++;
        const items = readList();
        for (const it of items) prec[it[it.length - 1]] = { level: precLevel, assoc };
        continue;
      }
      if (t === 'start' && tk[p + 1] === 'with') { start = tk[p + 2]; p += 3; if (tk[p] === ';') p++; continue; }
      if (/^[A-Za-z_$][\w$]*$/.test(t) && tk[p + 1] === '::=') {
        const lhs = t; p += 2;
        let alt = { syms: [], labels: [], prec: null, actions: [] };
        const alts = [alt];
        while (p < tk.length && tk[p] !== ';') {
          const x = tk[p++];
          if (x === '|') { alt = { syms: [], labels: [], prec: null, actions: [] }; alts.push(alt); continue; }
          if (x === '@ACT') { alt.actions.push(alt.syms.length); continue; }
          if (x === '%prec') { alt.prec = tk[p++]; continue; }
          if (x === ':') { alt.labels[alt.syms.length - 1] = tk[p++]; continue; }
          if (/^[A-Za-z_$][\w$]*$/.test(x)) { alt.syms.push(x); continue; }
          errors.push('Símbolo inesperado "' + x + '" en la producción de ' + lhs);
        }
        if (p >= tk.length) errors.push('Falta el ; final en la producción de ' + lhs);
        p++;
        productions.push({ lhs, alts });
        continue;
      }
      errors.push('No entiendo "' + t + '" (¿falta un ; o ::= ?)');
      p++;
    }
    // validaciones
    if (!productions.length) errors.push('No hay producciones');
    const all = new Set([...terms, ...nonterms, 'error']);
    let ntIdx = 0; const rules = []; const ruleInfo = [];
    const lhsSet = new Set(productions.map(x => x.lhs));
    for (const pr of productions) {
      if (!nonterms.includes(pr.lhs)) errors.push(pr.lhs + ' tiene producciones pero no está declarado como non terminal');
      for (const a of pr.alts) {
        for (const x of a.syms) if (!all.has(x)) errors.push('El símbolo ' + x + ' (en la producción de ' + pr.lhs + ') no está declarado');
        // acciones intermedias → no terminales NT$k → ε (como hace CUP)
        const syms = [];
        a.syms.forEach((x, k) => {
          if (a.actions.includes(k) && k > 0) { const nt = 'NT$' + (ntIdx++); syms.push(nt); rules.push({ lhs: nt, rhs: [] }); ruleInfo.push({ mid: true }); }
          syms.push(x);
        });
        if (a.actions.includes(0) && a.syms.length > 0) { const nt = 'NT$' + (ntIdx++); syms.unshift(nt); rules.push({ lhs: nt, rhs: [] }); ruleInfo.push({ mid: true }); }
        rules.push({ lhs: pr.lhs, rhs: syms }); ruleInfo.push({ prec: a.prec, labels: a.labels });
      }
    }
    for (const nt of nonterms) if (!lhsSet.has(nt)) warnings.push('El no terminal ' + nt + ' está declarado pero no tiene producciones');
    const usedSyms = new Set(rules.flatMap(r => r.rhs));
    for (const t of terms) if (!usedSyms.has(t)) warnings.push('El terminal ' + t + ' no se usa en ninguna producción');
    if (start && !nonterms.includes(start)) errors.push('start with ' + start + ': no es un no terminal declarado');
    const startSym = start || (productions[0] && productions[0].lhs);
    // reglas agrupadas: el símbolo inicial primero
    const ntOrder = [startSym, ...new Set(rules.map(r => r.lhs))].filter((x, k, a) => x && a.indexOf(x) === k);
    const g = GramM.make(rules, ntOrder, [...terms, 'error'].filter(t => usedSyms.has(t) || t !== 'error'), startSym);
    return { errors, warnings, terms, nonterms, prec, start: startSym, rules, ruleInfo, g, termType, ntType };
  }

  function analyzeCUP(src) {
    const P = parseCUP(src);
    if (P.errors.length) return { ok: false, P, errors: P.errors };
    let tab;
    try { tab = GramM.lalr(P.g, 'EOF'); } catch (e) { return { ok: false, P, errors: [e.message] }; }
    // resolución de conflictos por precedencia (como CUP)
    const rulePrec = k => {
      if (k === 0) return null;
      const info = P.ruleInfo[k - 1] || {};
      if (info.prec) return P.prec[info.prec] || null;
      const rhs = tab.aug.rules[k].rhs;
      for (let j = rhs.length - 1; j >= 0; j--) if (P.prec[rhs[j]]) return P.prec[rhs[j]];
      return null;
    };
    const unresolved = [];
    tab.action.forEach((row, s) => {
      for (const a in row) {
        let cell = row[a]; if (cell.length < 2) continue;
        const shifts = cell.filter(x => x[0] === 'd'), reds = cell.filter(x => x[0] === 'r');
        if (shifts.length === 1 && reds.length === 1) {
          const rp = rulePrec(+reds[0].slice(1)), tp = P.prec[a];
          if (rp && tp) {
            if (rp.level > tp.level) row[a] = reds;
            else if (rp.level < tp.level) row[a] = shifts;
            else row[a] = tp.assoc === 'left' ? reds : tp.assoc === 'right' ? shifts : [];
            continue;
          }
        }
        const c = tab.conflicts.find(c => c.state === s && c.sym === a);
        unresolved.push({ state: s, sym: a, kind: reds.length > 1 ? 'Reduce/Reduce' : 'Shift/Reduce', entries: cell.map(e => e[0] === 'r' ? GramM.ruleStr(tab.aug.rules[+e.slice(1)]) + ' (*)' : 'desplazar'), items: c ? c.items : [] });
      }
    });
    return { ok: unresolved.length === 0, P, tab, conflicts: unresolved, errors: [] };
  }
  function parseTokens(A, tokens) {
    // tokens: array de nombres de terminal
    const tab = { action: A.tab.action.map(r => { const o = {}; for (const k in r) o[k] = r[k].slice(0, 1); return o; }), goto: A.tab.goto };
    return GramM.parseLR(tab, A.tab.aug, tokens, 'EOF', 4000);
  }

  // Frases aleatorias de una gramática (para probar la del alumno)
  function randomSentences(g, n, rand = Math.random, maxLen = 60) {
    const minL = {}; for (const A of g.nts) minL[A] = Infinity;
    let ch = true; while (ch) { ch = false; for (const r of g.rules) { const v = r.rhs.reduce((s, X) => s + (g.isNT(X) ? minL[X] : 1), 0); if (v < minL[r.lhs]) { minL[r.lhs] = v; ch = true; } } }
    const out = new Set();
    for (let t = 0; t < n * 6 && out.size < n; t++) {
      const res = []; let budget = 8 + Math.floor(rand() * 30);
      const expand = (X, depth) => {
        if (res.length > maxLen) return;
        if (!g.isNT(X)) { if (X !== 'error') res.push(X); return; }
        const opts = g.rules.filter(r => r.lhs === X && !r.rhs.includes('error'));
        let choice;
        if (depth > 12 || budget <= 0) choice = opts.reduce((b, r) => { const v = r.rhs.reduce((s, Y) => s + (g.isNT(Y) ? minL[Y] : 1), 0); return !b || v < b.v ? { r, v } : b; }, null).r;
        else choice = opts[Math.floor(rand() * opts.length)];
        budget -= choice.rhs.length;
        for (const Y of choice.rhs) expand(Y, depth + 1);
      };
      expand(g.start, 0);
      if (res.length <= maxLen) out.add(res.join(' '));
    }
    return [...out].map(s => s ? s.split(' ') : []);
  }

  const api = { parseJLex, runJLex, parseCUP, analyzeCUP, parseTokens, randomSentences, readBraces };
  if (typeof module !== 'undefined') module.exports = api; else root.Tools = api;
})(typeof window !== 'undefined' ? window : globalThis);
