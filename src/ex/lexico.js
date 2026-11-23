// ===== Ejercicios de análisis léxico: expresiones regulares JLex y simulación de JLex =====
(function () {
  const { h, div, btn, esc } = U;

  const RX_BANK = {
    easy: [
      ['Un número entero sin signo (uno o más dígitos).', '[0-9]+'],
      ['Un identificador: empieza por una letra (mayúscula o minúscula) seguida de cero o más letras, dígitos o guiones bajos.', '[a-zA-Z][a-zA-Z0-9_]*'],
      ['La palabra reservada <b>while</b>.', '"while"'],
      ['Un número binario: uno o más ceros y unos.', '[01]+'],
      ['Identificador de parada (examen): una letra mayúscula seguida de una o más letras minúsculas. Ej.: Barcelona, Tarragona.', '[A-Z][a-z]+'],
      ['Cadenas formadas solo por a y b que terminan en b (al menos la b final).', '[ab]*b'],
      ['El operador de asignación <b>:=</b>', '":="'],
      ['Un entero con signo opcional (+ o -) delante.', '("+"|"-")?[0-9]+'],
      ['Una o más letras minúsculas.', '[a-z]+'],
      ['La palabra <b>route</b> o la palabra <b>stops</b>.', '"route"|"stops"'],
      ['Uno o más espacios o tabuladores.', '[ \\t]+'],
      ['Un salto de línea en Windows (\\r\\n) o en Unix (\\n).', '\\r?\\n']
    ],
    medium: [
      ['Matrícula de autobús (examen): una letra mayúscula, 4 dígitos y 3 letras mayúsculas. Ej.: B1234ABC.', '[A-Z][0-9][0-9][0-9][0-9][A-Z][A-Z][A-Z]'],
      ['Identificador de menú (examen): la palabra MENU seguida de exactamente 4 dígitos. Ej.: MENU1234.', 'MENU[0-9][0-9][0-9][0-9]'],
      ['Identificador de servidor (examen): 4 dígitos seguidos de 4 letras minúsculas. Ej.: 1234qwer.', '[0-9][0-9][0-9][0-9][a-z][a-z][a-z][a-z]'],
      ['Cadena de caracteres: empieza y termina con comillas dobles y en medio puede haber cualquier carácter excepto comillas y saltos de línea.', '\\"[^\\"\\n]*\\"'],
      ['Número real: uno o más dígitos, un punto y uno o más dígitos (las dos partes son obligatorias).', '[0-9]+"."[0-9]+'],
      ['Número con parte decimal opcional: 12, 3.5, 100.25 (si hay punto, detrás hay al menos un dígito).', '[0-9]+("."[0-9]+)?'],
      ['Comentario de línea: empieza por // y llega hasta el final de la línea (sin incluir el salto).', '"//"[^\\n]*'],
      ['Hora hh:mm: dos dígitos, dos puntos y dos dígitos (no hace falta validar el rango).', '[0-9][0-9]":"[0-9][0-9]'],
      ['Tipo de servidor (examen): CX11, CX21 o CX31.', '"CX11"|"CX21"|"CX31"'],
      ['Plato (examen): una mayúscula seguida de al menos una minúscula y, opcionalmente, más palabras en minúsculas separadas por un único espacio. Ej.: Chicken curry, Fish and chips, Rice.', '[A-Z][a-z]+(" "[a-z]+)*'],
      ['Comentario que empieza por -- (dos guiones) hasta el final de la línea (PEC1 2026).', '"--"[^\\n]*'],
      ['Un número de teléfono de 9 dígitos que empieza por 6 o 7.', '[67][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'],
      ['DNI (PEC1): ocho dígitos seguidos de una letra de control, que puede ser una de TRWAGMYFPDXBNJZSQVHLCKE.', '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][TRWAGMYFPDXBNJZSQVHLCKE]'],
      ['Identificador (PEC1): empieza por una letra y sigue con letras, dígitos, guiones bajos o guiones (-).', '[a-zA-Z][a-zA-Z0-9_\\-]*']
    ],
    hard: [
      ['Entero sin ceros a la izquierda: el 0 solo es válido como número "0".', '0|[1-9][0-9]*'],
      ['Entero positivo o negativo (signo + o - opcional) cuyo dígito más significativo no es 0, salvo el propio 0 (PEC1).', '("+"|"-")?(0|[1-9][0-9]*)'],
      ['Números binarios pares sin ceros a la izquierda (el 0 sí es válido).', '0|1[01]*0'],
      ['Dirección IPv4 simplificada: cuatro grupos de 1 a 3 dígitos separados por puntos (sin validar el rango).', '[0-9][0-9]?[0-9]?"."[0-9][0-9]?[0-9]?"."[0-9][0-9]?[0-9]?"."[0-9][0-9]?[0-9]?'],
      ['Número real con exponente opcional: 3.14, 2.0e10, 1.5E-3 (el exponente es e o E, signo opcional y dígitos).', '[0-9]+"."[0-9]+([eE]("+"|"-")?[0-9]+)?'],
      ['Cadenas de a y b con un número par de a.', 'b*(ab*ab*)*'],
      ['Fecha dd/mm/aaaa (solo la forma, sin validar).', '[0-9][0-9]"/"[0-9][0-9]"/"[0-9][0-9][0-9][0-9]'],
      ['Cadena entre comillas dobles en la que se permiten comillas escapadas como \\" (sin saltos de línea).', '\\"([^\\"\\\\\\n]|\\\\[^\\n])*\\"'],
      ['Número hexadecimal de C: 0x o 0X seguido de uno o más dígitos hexadecimales.', '0[xX][0-9a-fA-F]+'],
      ['Cadena de comillas triples \'\'\' … \'\'\' que no contiene apóstrofes en medio (PEC 2026).', '"\'\'\'"[^\']*"\'\'\'"']
    ],
    veryhard: [
      ['Cadenas sobre {a, b} que no contienen la subcadena ab.', 'b*a*'],
      ['Cadenas sobre {a, b} que contienen aa en alguna posición.', '[ab]*aa[ab]*'],
      ['Identificador con letras, dígitos y guiones bajos que empieza por letra, no termina en _ y no tiene dos _ seguidos.', '[a-zA-Z]([a-zA-Z0-9]|_[a-zA-Z0-9])*'],
      ['Correo simplificado: letras, dígitos o puntos; una @; y un dominio formado por grupos de letras/dígitos separados por puntos (al menos un punto).', '[a-zA-Z0-9.]+"@"[a-zA-Z0-9]+("."[a-zA-Z0-9]+)+'],
      ['URL que empieza por http:// o https:// seguida de uno o más caracteres que no sean espacio, tabulador ni salto de línea.', '"http""s"?"://"[^ \\t\\n]+'],
      ['Comentario de bloque de C: empieza por /* y termina en el primer */.', '"/*"([^*]|"*"+[^*/])*"*"+"/"'],
      ['Cadenas sobre {0, 1} en las que cada 1 va seguido inmediatamente de un 0.', '(0|10)*'],
      ['Números reales en los que la parte entera o la decimal puede faltar, pero no las dos: 3., .5, 2.75', '[0-9]+"."[0-9]*|"."[0-9]+'],
      ['Dirección IP pública (PEC1): del rango 192.168.0.0 a 192.168.255.255; cada uno de los dos últimos grupos es un número de 0 a 255 sin ceros a la izquierda.', '"192.168."([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])"."([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])']
    ]
  };

  const T_RX = `
    <h4>Sintaxis de las expresiones regulares en JLex</h4>
    <ul>
      <li><span class="mono">a b</span> → concatenación escribiendo uno detrás de otro: <span class="mono">ab</span>.</li>
      <li><span class="mono">r|s</span> alternativa · <span class="mono">r*</span> cero o más · <span class="mono">r+</span> una o más · <span class="mono">r?</span> opcional · <span class="mono">( )</span> agrupar.</li>
      <li><span class="mono">[abc]</span> uno de esos caracteres · <span class="mono">[a-z]</span> rango · <span class="mono">[^…]</span> cualquier carácter <b>excepto</b> esos.</li>
      <li><span class="mono">.</span> cualquier carácter excepto el salto de línea <span class="mono">\\n</span>.</li>
      <li><span class="mono">"…"</span> texto literal: dentro de las comillas los metacaracteres pierden su significado (<span class="mono">"+"</span>, <span class="mono">"/*"</span>).</li>
      <li><span class="mono">\\</span> escapa un carácter: <span class="mono">\\"</span>, <span class="mono">\\.</span>, <span class="mono">\\n</span>, <span class="mono">\\t</span>, <span class="mono">\\040</span> (espacio en octal).</li>
      <li><span class="mono">{NOMBRE}</span> usa una <b>macro</b> definida en la segunda sección: <span class="mono">DIGITO=[0-9]</span>.</li>
    </ul>
    <div class="tip"><b>Trampas de examen:</b><br>
      · JLex <b>no tiene</b> repeticiones <span class="mono">{4}</span>: las llaves son para macros. Para "4 dígitos" escribe <span class="mono">[0-9][0-9][0-9][0-9]</span> (o una macro y repítela).<br>
      · Un <b>espacio sin comillas termina</b> la expresión regular en la sección de reglas. Para un espacio usa <span class="mono">" "</span>, <span class="mono">[ ]</span> o <span class="mono">\\040</span>.<br>
      · Para cadenas entre comillas usa <span class="mono">\\"[^\\"\\n]*\\"</span> y no <span class="mono">\\".*\\"</span>: por la regla del emparejamiento más largo, la segunda se tragaría <span class="mono">"a", "b"</span> entero.<br>
      · El <span class="mono">-</span> dentro de corchetes es un rango; si lo quieres literal, ponlo al principio o al final, o usa <span class="mono">("+"|"-")</span>.</div>`;

  // ===================== Escribir expresiones regulares =====================
  App.register({
    id: 'regex', block: 'lex', exam: true, title: 'Expresiones regulares en JLex', short: 'Escribe la ER; se compara de forma exacta con la solución',
    intro: 'Escribe la expresión regular con la sintaxis de JLex. La app comprueba si <b>reconoce exactamente el mismo lenguaje</b> que la solución y, si no, te da una cadena en la que fallas.',
    theory: T_RX,
    custom: { label: 'Escribe una expresión regular JLex para ver qué reconoce (te mostrará ejemplos). Puedes poner macros en líneas anteriores: <span class="mono">D=[0-9]</span>.', example: 'D=[0-9]\n{D}+("."{D}+)?', rows: 4 },
    create(ctx) {
      if (ctx.custom) {
        const lines = ctx.custom.split('\n').filter(l => l.trim());
        const macros = {}; let re = '';
        for (const l of lines) { const m = l.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.+)$/); if (m && lines.indexOf(l) < lines.length - 1) macros[m[1]] = m[2].trim(); else re = l.trim(); }
        const c = Rx.compile(re, { macros });
        const test = U.input('', 'prueba una cadena…'); test.style.width = '100%';
        const out = div('');
        test.oninput = () => { const ok = Rx.matches(c, test.value); U.msg(out, ok ? 'ok' : 'bad', ok ? 'La reconoce' : 'No la reconoce'); };
        return { statement: h('div', null, h('p', { html: 'Expresión: <span class="mono">' + esc(re) + '</span>' }), h('p', null, 'Algunas cadenas que reconoce:'), U.pre(Rx.samples(c, 10).map(Rx.show).join('\n')), c.warnings.length ? h('div', { class: 'msg warn', html: c.warnings.map(esc).join('<br>') }) : null), body: test };
      }
      const [desc, ref] = U.pick(RX_BANK[ctx.level] || RX_BANK.medium);
      const refRe = Rx.compile(ref);
      const inp = U.input('', 'expresión regular JLex'); inp.style.width = '100%';
      const live = div('');
      return {
        statement: h('div', null, h('p', { html: desc }), h('p', { class: 'muted', html: 'Ejemplos que debe reconocer: ' + Rx.samples(refRe, 4, 14).map(s => '<span class="mono">' + esc(Rx.show(s)) + '</span>').join(' · ') })),
        body: h('div', null, inp, live),
        check() {
          const src = inp.value.trim();
          if (!src) return { ok: false, html: 'Escribe una expresión.' };
          let c; try { c = Rx.compile(src); } catch (e) { return { ok: false, html: esc(e.message) }; }
          const r = Rx.equivalent(c, refRe);
          const warn = c.warnings.length ? '<br><i>' + c.warnings.map(esc).join('<br>') + '</i>' : '';
          if (r.equal === null) return { ok: false, warn: true, html: 'No he podido comprobar la equivalencia (demasiado grande).' };
          if (r.equal) return { ok: true, html: '¡Correcto! Reconoce exactamente el mismo lenguaje.' + warn };
          return { ok: false, html: (r.inA ? 'Tu expresión <b>acepta</b> ' : 'Tu expresión <b>no acepta</b> ') + '<span class="mono">' + esc(Rx.show(r.example)) + '</span>, ' + (r.inA ? 'que no debería.' : 'que sí debería.') + warn };
        },
        solution() { return h('div', null, h('pre', { class: 'box' }, ref), h('p', { class: 'muted' }, 'Hay muchas expresiones equivalentes; cualquiera que reconozca el mismo lenguaje es válida.')); }
      };
    }
  });

  // ===================== Leer expresiones regulares =====================
  function mutate(s, alphabet) {
    const ops = [
      () => s.slice(0, -1),
      () => s.slice(1),
      () => s + U.pick(alphabet),
      () => { if (!s) return U.pick(alphabet); const i = U.R(s.length); return s.slice(0, i) + U.pick(alphabet) + s.slice(i + 1); },
      () => { if (s.length < 2) return s + s; const i = U.R(s.length - 1); return s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2); },
      () => U.pick(alphabet) + s
    ];
    return U.pick(ops)();
  }
  App.register({
    id: 'readrx', block: 'lex', title: 'Leer expresiones regulares', short: '¿Qué cadenas reconoce esta ER?',
    intro: 'Marca todas las cadenas que reconoce la expresión regular (completas, de principio a fin).',
    theory: T_RX,
    create(ctx) {
      const pool = [...RX_BANK[ctx.level === 'veryhard' ? 'hard' : ctx.level] || [], ...(ctx.level === 'veryhard' ? RX_BANK.veryhard : [])];
      const [desc, ref] = U.pick(pool);
      const re = Rx.compile(ref);
      const pos = U.shuffle(Rx.samples(re, 12, 16)).slice(0, 3);
      const alphabet = [...new Set(pos.join('').split(''))].concat(['a', '1', ' ', '.']).filter(c => c !== '\n');
      const cands = new Set(pos);
      let guard = 0;
      while (cands.size < 7 && guard++ < 200) { const m = mutate(U.pick(pos.length ? pos : ['a']), alphabet); if (m.length <= 24) cands.add(m); }
      const list = U.shuffle([...cands]).slice(0, 7);
      const correct = list.map((s, k) => Rx.matches(re, s) ? k : -1).filter(k => k >= 0);
      const ch = U.choice(list.map(s => '<span class="mono">' + esc(Rx.show(s)) + '</span>'), true);
      return {
        statement: h('div', null, h('p', { html: 'Expresión regular: <b class="mono">' + esc(ref) + '</b>' })),
        body: ch.el,
        check() { const s = ch.selected(); ch.mark(correct); const ok = s.length === correct.length && s.every(k => correct.includes(k)); return ok ? { ok: true, html: '¡Correcto!' } : { ok: false, html: 'No es exacto: en verde las que reconoce.' }; },
        solution() { return h('div', { html: '<p>Describe: ' + desc + '</p><p>Reconoce: ' + correct.map(k => '<span class="mono">' + esc(Rx.show(list[k])) + '</span>').join(', ') + '</p>' }); }
      };
    }
  });

  // ===================== Simulador de JLex =====================
  const T_JLEX = `
    <h4>Estructura de un fichero JLex</h4>
    <pre class="box">código de usuario (imports)
%%
directivas (%cup, %line, %ignorecase, %state…) y macros  NOMBRE=expresión
%%
reglas:   [&lt;ESTADOS&gt;] expresión   { acción Java }</pre>
    <h4>Cómo decide JLex qué regla aplica</h4>
    <ol>
      <li><b>Emparejamiento más largo</b>: de todas las reglas activas, gana la que reconoce el prefijo más largo de la entrada que queda.</li>
      <li><b>Empate</b>: si varias reconocen la misma longitud máxima, gana la que aparece <b>antes</b> en el fichero.</li>
      <li>Se ejecuta la acción: si hace <span class="mono">return</span>, se devuelve ese token al analizador sintáctico; si no devuelve nada (p. ej. espacios o comentarios), el texto se descarta y se sigue leyendo.</li>
    </ol>
    <p>Por eso las palabras reservadas se ponen <b>antes</b> que el identificador: con <span class="mono">if</span> empatan las dos y gana la primera; con <span class="mono">ifx</span> gana el identificador porque es más largo.</p>
    <h4>Estados léxicos</h4>
    <p>Con <span class="mono">%state COMENTARIO</span> se declara un estado. Una regla con <span class="mono">&lt;COMENTARIO&gt;</span> delante solo está activa en ese estado; una regla <b>sin lista de estados está activa en todos</b>. <span class="mono">yybegin(COMENTARIO)</span> cambia de estado; el inicial es <span class="mono">YYINITIAL</span>.</p>
    <h4>Otras directivas</h4>
    <ul><li><span class="mono">%cup</span>: integra el analizador con CUP (las acciones devuelven <span class="mono">new Symbol(sym.NOMBRE)</span>).</li><li><span class="mono">%line</span>: activa <span class="mono">yyline</span> (número de línea, empieza en 0).</li><li><span class="mono">%ignorecase</span>: el lenguaje no distingue mayúsculas de minúsculas.</li><li><span class="mono">yytext()</span>: el texto reconocido.</li></ul>`;

  function buildSpec(level) {
    const kwPool = [['if', 'IF'], ['while', 'WHILE'], ['int', 'INT'], ['else', 'ELSE'], ['for', 'FOR'], ['print', 'PRINT']];
    const kws = U.sample(kwPool, level === 'easy' ? 2 : 3);
    const opsPool = [['"<="', 'LE', '<='], ['"<"', 'LT', '<'], ['"=="', 'EQ', '=='], ['"="', 'ASIG', '='], ['"+"', 'MAS', '+'], ['"++"', 'INC', '++'], ['"*"', 'POR', '*'], ['"("', 'PAR_A', '('], ['")"', 'PAR_C', ')'], ['";"', 'PYC', ';']];
    let ops = U.sample(opsPool, level === 'easy' ? 3 : 5);
    // asegurar pares engañosos
    if (level !== 'easy' && !ops.some(o => o[1] === 'LE')) ops.push(opsPool[0], opsPool[1]);
    if (level !== 'easy' && Math.random() < 0.5 && !ops.some(o => o[1] === 'INC')) ops.push(opsPool[5], opsPool[4]);
    ops = ops.filter((o, k, a) => a.findIndex(x => x[1] === o[1]) === k);
    const rules = [];
    const idFirst = level !== 'easy' && Math.random() < 0.35;
    const kwRules = kws.map(([w, T]) => ({ re: '"' + w + '"', tok: T }));
    const idRule = { re: '[a-zA-Z][a-zA-Z0-9]*', tok: 'ID', value: true };
    if (idFirst) rules.push(idRule, ...kwRules); else rules.push(...kwRules, idRule);
    rules.push({ re: '[0-9]+', tok: 'NUM', value: true });
    if (level === 'hard' || level === 'veryhard') rules.push({ re: '[0-9]+"."[0-9]+', tok: 'REAL', value: true });
    const opRules = U.shuffle(ops).map(([re, T]) => ({ re, tok: T }));
    rules.push(...opRules);
    let states = [];
    if (level === 'veryhard') {
      states = ['COMENT'];
      rules.push({ re: '"/*"', begin: 'COMENT' }, { re: '"*/"', st: 'COMENT', begin: 'YYINITIAL' }, { re: '[^*]|"*"', st: 'COMENT', skip: true });
    } else if (level === 'hard') rules.push({ re: '"//"[^\\n]*', skip: true });
    rules.push({ re: '[ \\t\\n]+', skip: true });
    rules.push({ re: '.', err: true });
    const lines = ['import java_cup.runtime.Symbol;', '%%', '%cup', '%line'];
    if (states.length) lines.push('%state ' + states.join(', '));
    lines.push('%%');
    const fixInComent = r => r.st === undefined && states.length && !r.begin ? '<YYINITIAL> ' : '';
    for (const r of rules) {
      const pre = r.st ? '<' + r.st + '> ' : fixInComent(r);
      let act;
      if (r.tok) act = '{ return new Symbol(sym.' + r.tok + (r.value ? ', yytext()' : '') + '); }';
      else if (r.begin) act = '{ yybegin(' + r.begin + '); }';
      else if (r.err) act = '{ System.err.println("Error léxico: " + yytext()); }';
      else act = '{ }';
      lines.push(pre + r.re.padEnd(Math.max(20 - pre.length, 4)) + ' ' + act);
    }
    return { spec: lines.join('\n'), kws, ops, idFirst, states };
  }
  function buildInput(level, S) {
    const parts = [];
    const n = level === 'easy' ? 5 : level === 'medium' ? 7 : 9;
    const ids = ['x', 'cont', 'if2', 'whilex', 'a1', 'total', 'i'];
    for (let k = 0; k < n; k++) {
      const r = Math.random();
      if (r < 0.2) parts.push(U.pick(S.kws)[0]);
      else if (r < 0.32) parts.push(U.pick(S.kws)[0] + U.pick(['x', '1', 'a']));
      else if (r < 0.5) parts.push(U.pick(ids));
      else if (r < 0.62) parts.push(String(U.R(200)) + (level === 'hard' || level === 'veryhard' ? U.pick(['', '', '.5', 'abc']) : U.pick(['', '', 'x'])));
      else parts.push(U.pick(S.ops)[2] + (Math.random() < 0.25 ? U.pick(S.ops)[2] : ''));
    }
    if (level === 'hard') parts.splice(1 + U.R(parts.length - 1), 0, '// comentario ' + U.pick(S.kws)[0] + '\n');
    if (level === 'veryhard') parts.splice(1 + U.R(parts.length - 1), 0, '/* ' + U.pick(S.kws)[0] + ' * x */');
    if (level !== 'easy' && Math.random() < 0.5) parts.splice(U.R(parts.length), 0, U.pick(['#', '@', '$']));
    let s = '';
    parts.forEach((p, k) => { s += p; if (k < parts.length - 1) s += Math.random() < 0.55 ? ' ' : ''; });
    return s;
  }
  function expectedTokens(spec, input) {
    const r = Tools.runJLex(spec, input);
    const P = r.spec; const out = [];
    for (const t of r.trace) { const rule = P.rules[t.rule]; if (rule.token) out.push({ tok: rule.token, text: t.text }); else if (rule.isError) out.push({ tok: 'ERROR', text: t.text }); }
    for (const e of r.lexErrors) if (/ningún patrón/.test(e)) out.push({ tok: 'ERROR', text: '?' });
    return { list: out, trace: r.trace, P };
  }
  App.register({
    id: 'jlexsim', block: 'lex', title: 'Simulador de JLex', short: 'Emparejamiento más largo, prioridad y estados',
    intro: 'Lee la especificación JLex y escribe la secuencia de tokens que devuelve para la entrada. Escribe los nombres separados por espacios; si salta la regla de error, escribe <b>ERROR</b>.',
    theory: T_JLEX,
    custom: { label: 'Pega una especificación JLex completa; después escribe una entrada y verás los tokens que produce.', example: 'import java_cup.runtime.Symbol;\n%%\n%cup\n%%\n"if"        { return new Symbol(sym.IF); }\n[a-z]+      { return new Symbol(sym.ID); }\n[0-9]+      { return new Symbol(sym.NUM); }\n[ \\t\\n]+    { }\n.           { System.err.println("Error"); }', rows: 10 },
    create(ctx) {
      if (ctx.custom) {
        const P = Tools.parseJLex(ctx.custom);
        const inp = U.code('if x 42', 4); const out = div('');
        const run = () => {
          if (P.errors.length) { U.msg(out, 'bad', U.list(P.errors.map(esc))); return; }
          const r = Tools.runJLex(P, inp.value);
          out.innerHTML = '';
          out.appendChild(h('div', { class: 'tokens' }, ...r.trace.map(t => { const rule = P.rules[t.rule]; return h('span', { class: rule.isError ? 'bad' : '', title: 'regla de la línea ' + rule.line }, (rule.token || (rule.isError ? 'ERROR' : '·')) + ' «' + t.text.replace(/\n/g, '\\n') + '»'); })));
          if (r.lexErrors.length) out.appendChild(h('div', { class: 'msg warn', html: r.lexErrors.map(esc).join('<br>') }));
          if (P.warnings.length) out.appendChild(h('div', { class: 'msg warn', html: P.warnings.map(esc).join('<br>') }));
        };
        inp.oninput = run; setTimeout(run, 0);
        return { statement: h('p', { class: 'muted' }, 'Los elementos marcados con · se reconocen pero no devuelven token (se ignoran).'), body: h('div', null, h('p', null, 'Entrada:'), inp, out) };
      }
      const S = buildSpec(ctx.level);
      let input, exp;
      for (let t = 0; t < 20; t++) { input = buildInput(ctx.level, S); exp = expectedTokens(S.spec, input); if (exp.list.length >= 3) break; }
      const inp = U.input('', 'p. ej.: IF ID LT NUM'); inp.style.width = '100%';
      return {
        statement: h('div', null, h('p', null, 'Especificación:'), U.pre(S.spec), h('p', null, 'Entrada (entre las marcas ⟦ ⟧):'), h('pre', { class: 'box' }, '⟦' + input + '⟧')),
        body: inp,
        check() {
          const got = inp.value.trim().toUpperCase().split(/[\s,]+/).filter(Boolean);
          const e = exp.list.map(x => x.tok);
          if (got.join(' ') === e.join(' ')) return { ok: true, html: '¡Correcto! ' + e.length + ' tokens.' };
          let k = 0; while (k < got.length && k < e.length && got[k] === e[k]) k++;
          const where = k < e.length ? 'El token nº ' + (k + 1) + ' es incorrecto: el texto <span class="mono">«' + esc(exp.list[k].text) + '»</span> ' + (got[k] ? 'no da ' + esc(got[k]) + '.' : 'falta.') : 'Te sobran tokens al final.';
          return { ok: false, html: 'Los ' + k + ' primeros están bien. ' + where + ' Recuerda: gana el prefijo más largo y, si empatan, la regla que va antes.' };
        },
        solution() {
          const d = div('');
          d.appendChild(h('p', null, exp.list.map(x => x.tok).join(' ')));
          d.appendChild(U.table(exp.trace.map((_, k) => String(k + 1)), ['Texto', 'Regla (línea)', 'Resultado'], (r, c) => { const t = exp.trace[r]; const rule = exp.P.rules[t.rule]; return [JSON.stringify(t.text), rule.reText, rule.token || (rule.isError ? 'ERROR' : rule.begin.length ? 'yybegin(' + rule.begin + ')' : 'se ignora')][c]; }));
          if (S.idFirst) d.appendChild(h('div', { class: 'msg warn', html: 'Ojo: aquí la regla del identificador va <b>antes</b> que las palabras reservadas, así que "' + S.kws[0][0] + '" se reconoce como ID (empate de longitud → gana la primera regla).' }));
          return d;
        }
      };
    }
  });
})();
