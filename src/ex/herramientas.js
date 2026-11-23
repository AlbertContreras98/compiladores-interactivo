// ===== Herramientas: patrones de gramáticas CUP y problema de examen JLex + CUP =====
(function () {
  const { h, div, btn, esc } = U;

  const T_CUP = `
    <h4>Estructura de un fichero CUP</h4>
    <pre class="box">import java_cup.runtime.*;
parser code {: … métodos y atributos estáticos de la clase parser … :}

terminal LBRACE, RBRACE, COMMA;          // terminales sin valor
terminal String STRING;                  // terminal con valor (tipo Java)
terminal Integer NUMBER;
non terminal file, item_list;            // no terminales
non terminal Integer total;              // no terminal con valor (RESULT)

precedence left PLUS, MINUS;             // menos prioridad
precedence left TIMES, DIV;              // más prioridad (va después)

start with file;                         // opcional: por defecto, el primero

file      ::= LBRACE item_list RBRACE ;
item_list ::= item_list COMMA STRING:s  {: System.out.println(s); :}
            | STRING
            ;</pre>
    <ul>
      <li>Cada regla: <span class="mono">izq ::= alternativa | alternativa ;</span>. Una alternativa vacía es ε (pon un comentario <span class="mono">/* vacío */</span> para que se vea).</li>
      <li>Los nombres de los terminales tienen que coincidir con los <span class="mono">sym.NOMBRE</span> que devuelve JLex.</li>
      <li><span class="mono">STRING:s</span> pone la etiqueta s al valor del símbolo; en la acción <span class="mono">{: … :}</span> se usa como variable Java. <span class="mono">RESULT</span> es el valor del lado izquierdo.</li>
      <li>CUP genera un analizador <b>LALR(1)</b>: si la gramática tiene conflictos desplazamiento/reducción o reducción/reducción, CUP avisa y no genera el analizador (salvo con <span class="mono">-expect</span>).</li>
    </ul>
    <h4>Patrones que caen siempre</h4>
    <table class="grid"><tr><th class="left">Lo que dice el enunciado</th><th class="left">En CUP</th></tr>
      <tr><td class="left">Uno o más X separados por comas</td><td class="left mono">l ::= l COMMA X | X ;</td></tr>
      <tr><td class="left">Cero o más X separados por comas</td><td class="left mono">o ::= l | ;   l ::= l COMMA X | X ;</td></tr>
      <tr><td class="left">Uno o más X sin separador</td><td class="left mono">l ::= l X | X ;</td></tr>
      <tr><td class="left">Cero o más X sin separador</td><td class="left mono">l ::= l X | ;</td></tr>
      <tr><td class="left">Campo opcional</td><td class="left mono">opt ::= CAMPO … | ;</td></tr>
      <tr><td class="left">A y B en cualquier orden</td><td class="left mono">f ::= a COMMA b | b COMMA a ;</td></tr>
      <tr><td class="left">A, B y C en cualquier orden</td><td class="left">las 6 permutaciones</td></tr>
      <tr><td class="left">Al menos dos X separados por comas</td><td class="left mono">l ::= l COMMA X | X COMMA X ;</td></tr></table>
    <div class="tip">Error clásico: escribir <span class="mono">l ::= l COMMA X | ;</span> para "cero o más separados por comas". Acepta ", X" y rechaza "X": la ε tiene que ir fuera de la lista con separadores. En CUP se prefiere la recursividad <b>por la izquierda</b> (l ::= l COMMA X): no gasta pila.</div>`;

  // ---------- comprobación de una gramática CUP frente a otra de referencia ----------
  function wrapCup(text, terminals) {
    if (/\bterminal\b/.test(text)) return text;
    const lhs = [...new Set([...text.matchAll(/^\s*([A-Za-z_]\w*)\s*::=/gm)].map(m => m[1]))];
    return 'terminal ' + terminals.join(', ') + ';\n' + (lhs.length ? 'non terminal ' + lhs.join(', ') + ';\n' : '') + text;
  }
  function conflictHtml(A) {
    return 'CUP no generaría el analizador: hay ' + A.conflicts.length + ' conflicto(s).' + U.list(A.conflicts.slice(0, 4).map(c => '<b>' + c.kind + '</b> en el estado ' + c.state + ' con <span class="mono">' + esc(c.sym) + '</span>: ' + c.entries.map(esc).join(' / ') + (c.items.length ? '<br><span class="muted mono">' + c.items.slice(0, 4).map(esc).join('<br>') + '</span>' : '')));
  }
  function negativesFrom(pos, terminals, accepts, n, rand = Math.random) {
    const out = new Set(); const R = k => Math.floor(rand() * k);
    for (let t = 0; t < n * 12 && out.size < n; t++) {
      const s = pos[R(pos.length)].slice(); if (!s.length) { s.push(terminals[R(terminals.length)]); }
      const op = R(4); const i = R(s.length);
      if (op === 0) s.splice(i, 1);
      else if (op === 1) s.splice(i, 0, s[i]);
      else if (op === 2 && s.length > 1) { const j = Math.min(i + 1, s.length - 1); [s[i], s[j]] = [s[j], s[i]]; }
      else s[i] = terminals[R(terminals.length)];
      const k = s.join(' ');
      if (!out.has(k) && !accepts(s)) out.add(k);
    }
    return [...out].map(k => k ? k.split(' ') : []);
  }
  // Compara la gramática del alumno (texto CUP) con la de referencia
  function compareCup(userText, refText, opts = {}) {
    const terminals = opts.terminals;
    const A = Tools.analyzeCUP(wrapCup(userText, terminals));
    if (A.errors.length) return { ok: false, html: 'Errores en el fichero CUP:' + U.list(A.errors.map(esc)) };
    const missing = (opts.required || []).filter(t => !A.P.terms.includes(t));
    if (missing.length) return { ok: false, html: 'Faltan terminales por declarar (usa los nombres del enunciado): <span class="mono">' + missing.join(', ') + '</span>' };
    if (A.conflicts.length) return { ok: false, html: conflictHtml(A) };
    const R = opts.refA || Tools.analyzeCUP(wrapCup(refText, terminals));
    const acceptsU = s => Tools.parseTokens(A, s).ok, acceptsR = s => Tools.parseTokens(R, s).ok;
    const show = opts.show || (s => s.join(' ') || '(vacío)');
    for (const t of (opts.validFiles || [])) if (!acceptsU(t.tokens)) return { ok: false, html: 'Tu gramática <b>rechaza</b> ' + t.label + ', que es correcto:<pre class="box">' + esc(t.text || show(t.tokens)) + '</pre>' };
    for (const t of (opts.invalidFiles || [])) if (acceptsU(t.tokens)) return { ok: false, html: 'Tu gramática <b>acepta</b> un fichero incorrecto (' + esc(t.why) + '):<pre class="box">' + esc(t.text) + '</pre>' };
    const pos = Tools.randomSentences(R.P.g, opts.nPos || 40, Math.random, opts.maxLen || 70);
    if (opts.bounded) {
      const cmp = Gram.compareLang(R.P.g, A.P.g, opts.bounded);
      if (cmp.onlyA.length) return { ok: false, html: 'Tu gramática <b>no acepta</b> esta secuencia válida:<pre class="box">' + esc(show(cmp.onlyA[0].split(' ').filter(Boolean))) + '</pre>' };
      if (cmp.onlyB.length) return { ok: false, html: 'Tu gramática <b>acepta</b> esta secuencia, que no es válida:<pre class="box">' + esc(show(cmp.onlyB[0].split(' ').filter(Boolean))) + '</pre>' };
    }
    for (const s of pos) if (!acceptsU(s)) return { ok: false, html: 'Tu gramática <b>no acepta</b> esta secuencia válida:<pre class="box">' + esc(show(s)) + '</pre>' };
    const negs = negativesFrom(pos.length ? pos : [[]], R.P.terms.filter(t => t !== 'error'), acceptsR, opts.nNeg || 40);
    for (const s of negs) if (acceptsU(s)) return { ok: false, html: 'Tu gramática <b>acepta</b> esta secuencia, que no es válida:<pre class="box">' + esc(show(s)) + '</pre>' };
    const warns = A.P.warnings.filter(w => !/error/.test(w));
    return { ok: true, A, html: '¡Correcto! Sin conflictos LALR(1); acepta ' + (pos.length + (opts.validFiles || []).length) + ' entradas válidas y rechaza ' + (negs.length + (opts.invalidFiles || []).length) + ' incorrectas.' + (warns.length ? '<br><i>Avisos de CUP: ' + warns.map(esc).join('; ') + '</i>' : '') };
  }
  window.CupCheck = { compareCup, wrapCup, conflictHtml };

  // ===================== Patrones CUP =====================
  const THEMES = [
    { X: 'ID', xs: 'identificadores (ID)', ex: 'x' }, { X: 'NUMBER', xs: 'números (NUMBER)', ex: '7' }, { X: 'STRING', xs: 'cadenas (STRING)', ex: '"a"' }
  ];
  const PATTERNS = [
    { lv: 'easy', make: t => ({ d: `Una lista <b>no vacía</b> de ${t.xs} separados por comas, entre corchetes. Ej.: <span class="mono">[ ${t.ex}, ${t.ex}, ${t.ex} ]</span>`, ts: ['LBRACKET', 'RBRACKET', 'COMMA', t.X], ref: `s ::= LBRACKET l RBRACKET ;\nl ::= l COMMA ${t.X} | ${t.X} ;` }) },
    { lv: 'easy', make: t => ({ d: `Una lista de ${t.xs} separados por comas, entre corchetes, que <b>puede estar vacía</b>. Ej.: <span class="mono">[ ]</span> o <span class="mono">[ ${t.ex}, ${t.ex} ]</span>`, ts: ['LBRACKET', 'RBRACKET', 'COMMA', t.X], ref: `s ::= LBRACKET o RBRACKET ;\no ::= l | ;\nl ::= l COMMA ${t.X} | ${t.X} ;` }) },
    { lv: 'easy', make: t => ({ d: `<b>Uno o más</b> ${t.xs}, cada uno terminado en punto y coma. Ej.: <span class="mono">${t.ex}; ${t.ex};</span>`, ts: ['SEMICOLON', t.X], ref: `s ::= s ${t.X} SEMICOLON | ${t.X} SEMICOLON ;` }) },
    { lv: 'medium', make: t => ({ d: `Entre llaves, <b>cero o más</b> ${t.xs} sin separador. Ej.: <span class="mono">{ }</span> o <span class="mono">{ ${t.ex} ${t.ex} }</span>`, ts: ['LBRACE', 'RBRACE', t.X], ref: `s ::= LBRACE l RBRACE ;\nl ::= l ${t.X} | ;` }) },
    { lv: 'medium', make: () => ({ d: 'Un registro: <span class="mono">NAME COLON STRING</span> seguido, <b>opcionalmente</b>, de <span class="mono">COMMA AGE COLON NUMBER</span>. Ej.: <span class="mono">name: "Ana"</span> o <span class="mono">name: "Ana", age: 30</span>', ts: ['NAME', 'AGE', 'COLON', 'COMMA', 'STRING', 'NUMBER'], ref: 's ::= NAME COLON STRING opt ;\nopt ::= COMMA AGE COLON NUMBER | ;' }) },
    { lv: 'medium', make: () => ({ d: 'Entre llaves, dos campos <b>en cualquier orden</b> separados por coma: <span class="mono">SIZE COLON NUMBER</span> y <span class="mono">COLOR COLON STRING</span>. Ej.: <span class="mono">{ color: "red", size: 3 }</span>', ts: ['LBRACE', 'RBRACE', 'COMMA', 'COLON', 'SIZE', 'COLOR', 'NUMBER', 'STRING'], ref: 's ::= LBRACE f RBRACE ;\nf ::= a COMMA b | b COMMA a ;\na ::= SIZE COLON NUMBER ;\nb ::= COLOR COLON STRING ;' }) },
    { lv: 'hard', make: () => ({ d: 'Entre llaves, tres campos obligatorios <b>en cualquier orden</b> separados por comas: <span class="mono">CPU COLON NUMBER</span>, <span class="mono">RAM COLON NUMBER</span> y <span class="mono">SSD COLON NUMBER</span> (como en el examen de servidores).', ts: ['LBRACE', 'RBRACE', 'COMMA', 'COLON', 'CPU', 'RAM', 'SSD', 'NUMBER'], ref: 's ::= LBRACE f RBRACE ;\nf ::= c COMMA r COMMA d | c COMMA d COMMA r | r COMMA c COMMA d | r COMMA d COMMA c | d COMMA c COMMA r | d COMMA r COMMA c ;\nc ::= CPU COLON NUMBER ;\nr ::= RAM COLON NUMBER ;\nd ::= SSD COLON NUMBER ;' }) },
    { lv: 'hard', make: t => ({ d: `<b>Uno o más</b> bloques separados por comas. Cada bloque va entre llaves y contiene <span class="mono">NAME COLON STRING COMMA ITEMS COLON</span> y una lista de ${t.xs} entre corchetes separados por comas que <b>puede estar vacía</b>.`, ts: ['LBRACE', 'RBRACE', 'LBRACKET', 'RBRACKET', 'COMMA', 'COLON', 'NAME', 'ITEMS', 'STRING', t.X].filter((x, k, a) => a.indexOf(x) === k), ref: `s ::= s COMMA b | b ;\nb ::= LBRACE NAME COLON STRING COMMA ITEMS COLON LBRACKET o RBRACKET RBRACE ;\no ::= l | ;\nl ::= l COMMA ${t.X} | ${t.X} ;` }) },
    { lv: 'hard', make: () => ({ d: 'Expresiones aritméticas con NUMBER, <span class="mono">PLUS MINUS TIMES DIV</span> y paréntesis <span class="mono">LPAREN RPAREN</span>, <b>sin conflictos</b>. Puedes usar una gramática estratificada (E, T, F) o una ambigua con declaraciones <span class="mono">precedence</span>.', ts: ['NUMBER', 'PLUS', 'MINUS', 'TIMES', 'DIV', 'LPAREN', 'RPAREN'], ref: 'e ::= e PLUS t | e MINUS t | t ;\nt ::= t TIMES f | t DIV f | f ;\nf ::= LPAREN e RPAREN | NUMBER ;', bounded: 7 }) },
    { lv: 'veryhard', make: t => ({ d: `<b>Al menos dos</b> ${t.xs} separados por comas, entre paréntesis.`, ts: ['LPAREN', 'RPAREN', 'COMMA', t.X], ref: `s ::= LPAREN l RPAREN ;\nl ::= l COMMA ${t.X} | ${t.X} COMMA ${t.X} ;` }) },
    { lv: 'veryhard', make: () => ({ d: 'Entre llaves, el campo obligatorio <span class="mono">ID_KW COLON ID</span> y el campo <b>opcional</b> <span class="mono">TAG COLON STRING</span>, <b>en cualquier orden</b> y separados por coma si están los dos.', ts: ['LBRACE', 'RBRACE', 'COMMA', 'COLON', 'ID_KW', 'TAG', 'ID', 'STRING'], ref: 's ::= LBRACE f RBRACE ;\nf ::= a | a COMMA b | b COMMA a ;\na ::= ID_KW COLON ID ;\nb ::= TAG COLON STRING ;' }) },
    { lv: 'veryhard', make: t => ({ d: `Una secuencia de secciones <b>opcionales en orden fijo</b>: primero, opcionalmente, <span class="mono">HEADER STRING SEMICOLON</span>; después <b>cero o más</b> <span class="mono">ITEM ${t.X} SEMICOLON</span>; y por último, opcionalmente, <span class="mono">FOOTER SEMICOLON</span>. La entrada vacía es válida.`, ts: ['HEADER', 'ITEM', 'FOOTER', 'SEMICOLON', 'STRING', t.X].filter((x, k, a) => a.indexOf(x) === k), ref: `s ::= h l f ;\nh ::= HEADER STRING SEMICOLON | ;\nl ::= l ITEM ${t.X} SEMICOLON | ;\nf ::= FOOTER SEMICOLON | ;` }) }
  ];
  App.register({
    id: 'cuppat', block: 'tools', exam: true, title: 'Patrones de gramáticas CUP', short: 'Listas, opcionales, cualquier orden, precedencia',
    intro: 'Escribe solo las <b>producciones</b> CUP (las declaraciones de terminales y no terminales se añaden solas si no las pones). La app comprueba que no haya conflictos LALR(1) y que tu gramática acepte exactamente el lenguaje pedido.',
    theory: T_CUP,
    create(ctx) {
      const lvOrder = ['easy', 'medium', 'hard', 'veryhard'];
      const pool = PATTERNS.filter(p => p.lv === ctx.level || (ctx.level === 'veryhard' && p.lv === 'hard'));
      const p = U.pick(pool.length ? pool : PATTERNS).make(U.pick(THEMES));
      const ta = U.code('', 7, 's ::= … ;');
      return {
        statement: h('div', null, h('p', { html: p.d }), h('p', { html: 'Terminales: <span class="mono">' + p.ts.join(', ') + '</span>. Usa <b>s</b> (u otro nombre) como símbolo inicial en la primera regla.' })),
        body: ta,
        check() {
          if (!ta.value.trim()) return { ok: false, html: 'Escribe las producciones.' };
          return compareCup(ta.value, p.ref, { terminals: p.ts, required: p.ts, bounded: p.bounded || 9, nPos: 30, nNeg: 40, maxLen: 30 });
        },
        solution() { return h('div', null, h('pre', { class: 'box' }, p.ref), h('p', { class: 'muted' }, 'Cualquier gramática sin conflictos que acepte el mismo lenguaje es válida.')); }
      };
    }
  });
})();
