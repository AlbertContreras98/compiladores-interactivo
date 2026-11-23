// ===== Problema de examen: analizador JLex + CUP de un lenguaje de ficheros =====
(function () {
  const { h, div, btn, esc } = U;
  const cache = {};
  function ref(L) {
    if (cache[L.id]) return cache[L.id];
    const P = Tools.parseJLex(L.jlex);
    const A = Tools.analyzeCUP(L.cup);
    // ejemplo de lexema para cada testigo (para mostrar secuencias como texto)
    const ex = {};
    for (const s of L.samples) for (const t of Tools.runJLex(P, s).tokens) if (!(t.token in ex)) ex[t.token] = t.text;
    for (const k in L.tokens) if (!(k in ex)) ex[k] = L.tokens[k];
    const tok = text => Tools.runJLex(P, text).tokens.map(t => t.token);
    return cache[L.id] = { P, A, ex, tok };
  }
  function seqOf(P, input) {
    const r = Tools.runJLex(P, input);
    const out = [];
    for (const t of r.trace) {
      const rule = P.rules[t.rule];
      const name = rule.token || (rule.isError ? 'ERROR' : null);
      if (!name) continue;
      if (name === 'ERROR' && out.length && out[out.length - 1].tok === 'ERROR') continue;
      out.push({ tok: name, text: t.text, line: t.line });
    }
    return { out, r };
  }
  function showTokens(R, s) {
    const line = s.map(t => R.ex[t] !== undefined ? R.ex[t] : t).join(' ');
    return line + '\n\n(testigos: ' + s.join(' ') + ')';
  }

  function checkLexer(L, text) {
    const R = ref(L);
    let P;
    try { P = Tools.parseJLex(text); } catch (e) { return { ok: false, html: esc(e.message) }; }
    if (P.errors.length) return { ok: false, html: 'Errores en la especificación JLex:' + U.list(P.errors.map(esc)) };
    const warns = [...P.warnings];
    if (!P.flags.cup) warns.push('Falta la directiva <b>%cup</b>: sin ella JLex no se integra con CUP.');
    const allowed = new Set(Object.keys(L.tokens));
    const unknown = [...new Set(P.rules.filter(r => r.token && !allowed.has(r.token)).map(r => r.token))];
    if (unknown.length) return { ok: false, html: 'Usas testigos que no están en la lista del enunciado: <span class="mono">' + unknown.map(esc).join(', ') + '</span>. Usa exactamente los nombres de la tabla.' };
    const inputs = [
      ...L.samples.map((s, k) => ({ s, label: k === 0 ? 'el ejemplo del enunciado' : 'el fichero de prueba ' + (k + 1) })),
      ...L.invalid.map(([s], k) => ({ s, label: 'el fichero incorrecto ' + (k + 1) })),
      ...L.probes.map(s => ({ s, label: 'una prueba de casos límite' }))
    ];
    for (const inp of inputs) {
      const e = seqOf(R.P, inp.s).out, g = seqOf(P, inp.s).out;
      let k = 0; while (k < e.length && k < g.length && e[k].tok === g[k].tok) k++;
      if (k === e.length && k === g.length) continue;
      const exp = e[k], got = g[k];
      let why;
      if (exp && got) why = 'en la línea ' + exp.line + ', con «<span class="mono">' + esc(exp.text) + '</span>» debería salir <b>' + exp.tok + '</b> y tu analizador da <b>' + got.tok + '</b>' + (got.text !== exp.text ? ' (reconociendo «<span class="mono">' + esc(got.text) + '</span>»)' : '') + '.';
      else if (exp) why = 'tu analizador se para antes: falta <b>' + exp.tok + '</b> para «<span class="mono">' + esc(exp.text) + '</span>».';
      else why = 'tu analizador produce de más: <b>' + got.tok + '</b> para «<span class="mono">' + esc(got.text) + '</span>».';
      if (exp && exp.tok === 'ERROR') why += ' Aquí debería saltar la regla de error (el texto no es válido en este lenguaje).';
      if (got && got.tok === 'ERROR' && exp) why += ' Tu analizador no reconoce ese texto.';
      return { ok: false, html: 'Fallo con ' + inp.label + ':<pre class="box">' + esc(inp.s) + '</pre>' + why + (warns.length ? '<br><i>' + warns.join('<br>') + '</i>' : '') };
    }
    // valores
    const needVal = new Set(R.P.rules.filter(r => r.token && r.value).map(r => r.token));
    const noVal = [...new Set(P.rules.filter(r => r.token && needVal.has(r.token) && !r.value).map(r => r.token))];
    if (noVal.length) warns.push('Los testigos ' + noVal.join(', ') + ' no pasan su valor (yytext()); lo necesitarás en las comprobaciones semánticas.');
    return { ok: true, html: '¡El analizador léxico funciona! Da los mismos testigos que la solución en ' + inputs.length + ' entradas (ejemplos, ficheros incorrectos y casos límite).' + (warns.length ? '<br><i>' + warns.join('<br>') + '</i>' : '') };
  }
  function checkParser(L, text) {
    const R = ref(L);
    return CupCheck.compareCup(text, L.cup, {
      terminals: Object.keys(L.tokens), required: Object.keys(L.tokens), refA: R.A,
      validFiles: L.samples.map((s, k) => ({ tokens: R.tok(s), text: s || '(fichero vacío)', label: k === 0 ? 'el ejemplo del enunciado' : 'este fichero' })),
      invalidFiles: L.invalid.map(([s, why]) => ({ tokens: R.tok(s), text: s || '(fichero vacío)', why })),
      show: s => showTokens(R, s), nPos: 50, nNeg: 60, maxLen: 90
    });
  }

  App.register({
    id: 'exam', block: 'tools', exam: true, title: 'Problema de examen: JLex + CUP', short: 'La pregunta del 70 %: léxico y sintáctico de un lenguaje',
    intro: 'Como la pregunta 2 del examen: escribe el analizador léxico (JLex) y el sintáctico (CUP) del lenguaje. Cada parte se comprueba por separado contra los ejemplos, ficheros incorrectos, casos límite y entradas generadas a partir de la solución.',
    variants: [{ id: 'random', name: 'Al azar' }, ...LANGS.map(L => ({ id: L.id, name: L.name + ' (' + L.from + ')' }))], variantLabel: 'Lenguaje', levels: ['hard'],
    theory: `<h4>Cómo atacar la pregunta (2 horas para todo el examen)</h4><ol>
      <li><b>Lista de testigos</b>: subraya en el enunciado las palabras reservadas, los símbolos ({ } [ ] , :) y las categorías con valor (cadenas, enteros, identificadores especiales). Aquí la app te da los nombres para poder corregirte.</li>
      <li><b>JLex</b>: primero las palabras reservadas, después los símbolos, después las expresiones de las categorías (de la más específica a la más general) y al final espacios y la regla de error <span class="mono">.</span>.</li>
      <li>Mira si el lenguaje es sensible a mayúsculas: si no, <b>%ignorecase</b>.</li>
      <li><b>CUP</b>: declara los terminales (con su tipo si llevan valor) y los no terminales; escribe la gramática de arriba abajo: fichero → lista de elementos → elemento → campos.</li>
      <li>Identifica los patrones: lista con separador (¿puede estar vacía?), campos en cualquier orden (permutaciones), campos opcionales.</li></ol>
      <h4>Comprobaciones semánticas (PEC3)</h4><p>Se hacen con acciones <span class="mono">{: … :}</span> que llaman a métodos estáticos de <span class="mono">parser code</span>, con estructuras como <span class="mono">HashSet</span> (duplicados) y <span class="mono">HashMap</span> (agrupar por clave). Las etiquetas (<span class="mono">ID:e1</span>) dan acceso al valor del testigo, y <span class="mono">yyline</span> (con <span class="mono">%line</span>) a la línea para los mensajes.</p>
      <div class="tip">Los errores que más puntos quitan: listas vacías mal hechas, olvidar una de las permutaciones, poner las palabras reservadas después del identificador, usar {4} en JLex y espacios sin comillas en las expresiones regulares.</div>`,
    create(ctx) {
      const L = ctx.variant && ctx.variant !== 'random' ? LANGS.find(x => x.id === ctx.variant) : U.pick(LANGS);
      const R = ref(L);
      const KEY = 'compiladores-exam-' + L.id;
      let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { }
      const jl = U.code(saved.jlex || SKEL_JLEX + '\n%%\n\n', 18);
      const cp = U.code(saved.cup || SKEL_CUP, 18);
      const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ jlex: jl.value, cup: cp.value })); } catch (e) { } };
      jl.addEventListener('input', save); cp.addEventListener('input', save);
      const fbL = div(''), fbC = div(''), tryOut = div('');
      let okL = false, okC = false;
      const tokTable = U.table(Object.keys(L.tokens), ['Significado'], r => L.tokens[Object.keys(L.tokens)[r]], { corner: 'Testigo' });
      const tryIn = U.code(L.samples[0], 6);
      const runTry = () => {
        tryOut.innerHTML = '';
        const P = Tools.parseJLex(jl.value);
        if (P.errors.length) { U.msg(tryOut, 'bad', U.list(P.errors.map(esc))); return; }
        const r = Tools.runJLex(P, tryIn.value);
        tryOut.appendChild(h('div', { class: 'tokens' }, ...r.trace.filter(t => { const ru = P.rules[t.rule]; return ru.token || ru.isError; }).map(t => { const ru = P.rules[t.rule]; return h('span', { class: ru.isError ? 'bad' : '', title: 'línea ' + t.line }, ru.token || 'ERROR'); })));
        if (r.lexErrors.length) tryOut.appendChild(h('div', { class: 'msg warn', html: r.lexErrors.slice(0, 6).map(esc).join('<br>') }));
        const A = Tools.analyzeCUP(cp.value);
        if (!A.errors.length && !A.conflicts.length) {
          const pr = Tools.parseTokens(A, r.tokens.map(t => t.token));
          tryOut.appendChild(h('div', { class: 'msg ' + (pr.ok ? 'ok' : 'bad') }, pr.ok ? 'Tu CUP acepta esta entrada.' : 'Tu CUP rechaza esta entrada (error sintáctico cerca de: ' + (pr.trace.slice(-1)[0] || {}).input.split(' ').slice(0, 5).join(' ') + ').'));
        }
      };
      const insertTerms = () => {
        const withVal = new Set(R.P.rules.filter(r => r.token && r.value).map(r => r.token));
        const plain = Object.keys(L.tokens).filter(t => !withVal.has(t)), vals = Object.keys(L.tokens).filter(t => withVal.has(t));
        const decl = 'terminal ' + plain.join(', ') + ';\n' + (vals.length ? 'terminal String ' + vals.join(', ') + ';\n' : '');
        cp.value = cp.value.replace('/* Declaración de terminales */\n', '/* Declaración de terminales */\n' + decl);
        if (!cp.value.includes(decl)) cp.value += '\n' + decl;
        save();
      };
      return {
        statement: h('div', null,
          h('p', null, h('span', { class: 'tag' }, L.from)),
          U.htmlEl(L.statement),
          h('p', null, 'Ejemplo de fichero correcto:'), U.pre(L.samples[0] || '(vacío)'),
          h('details', null, h('summary', null, 'Nombres de los testigos que debes usar'), h('p', { class: 'muted' }, 'Para que la app pueda corregir tu analizador, usa estos nombres en sym.NOMBRE y en las declaraciones terminal.'), tokTable)),
        body: h('div', null,
          h('div', { class: 'step' + (okL ? ' done' : '') }, h('div', { class: 'stitle' }, 'a) Analizador léxico (JLex)'), jl,
            h('div', { class: 'btnrow' }, btn('Comprobar JLex', () => { const r = checkLexer(L, jl.value); okL = r.ok; ctx.tried(); U.msg(fbL, r.ok ? 'ok' : 'bad', r.html); if (okL && okC) ctx.solved(); }, 'small'), btn('Restaurar plantilla', () => { if (confirm('¿Borrar tu JLex?')) { jl.value = SKEL_JLEX + '\n%%\n\n'; save(); } }, 'small ghost')), fbL),
          h('div', { class: 'step' }, h('div', { class: 'stitle' }, 'b) Analizador sintáctico (CUP)'), h('p', { class: 'muted' }, 'Se prueba con los testigos que da la solución de referencia, así que puedes hacer esta parte aunque tu JLex aún no esté bien.'), cp,
            h('div', { class: 'btnrow' }, btn('Comprobar CUP', () => { const r = checkParser(L, cp.value); okC = r.ok; ctx.tried(); U.msg(fbC, r.ok ? 'ok' : 'bad', r.html); if (okL && okC) ctx.solved(); }, 'small'), btn('Insertar declaración de terminales', insertTerms, 'small ghost'), btn('Restaurar plantilla', () => { if (confirm('¿Borrar tu CUP?')) { cp.value = SKEL_CUP; save(); } }, 'small ghost')), fbC),
          h('div', { class: 'step' }, h('div', { class: 'stitle' }, 'Probar con tu propia entrada'), tryIn, h('div', { class: 'btnrow' }, btn('Ejecutar mi JLex + CUP', runTry, 'small ghost')), tryOut),
          L.semantic ? h('details', { class: 'step' }, h('summary', { class: 'stitle' }, 'c) Comprobaciones semánticas (estilo PEC3)'), U.htmlEl('<p>Reglas:</p>' + U.list(L.semantic.rules.map(esc)) + '<p class="muted">Piensa qué estructura usarías y en qué producción pondrías cada acción; después compara con la propuesta:</p>'), h('details', null, h('summary', null, 'Ver propuesta'), U.pre(L.semantic.code))) : null),
        check() {
          const a = checkLexer(L, jl.value), b = checkParser(L, cp.value);
          U.msg(fbL, a.ok ? 'ok' : 'bad', a.html); U.msg(fbC, b.ok ? 'ok' : 'bad', b.html);
          okL = a.ok; okC = b.ok;
          return a.ok && b.ok ? { ok: true, html: '¡Problema completo! Léxico y sintáctico correctos.' } : { ok: false, html: 'Léxico: ' + (a.ok ? '✔' : '✘') + ' · Sintáctico: ' + (b.ok ? '✔' : '✘') + '. Mira los mensajes de cada apartado.' };
        },
        solution() {
          return h('div', null, h('h3', null, 'JLex'), U.pre(L.jlex), h('h3', null, 'CUP (declaraciones y reglas)'), U.pre(L.cup),
            h('h3', null, 'Claves de este ejercicio'), U.htmlEl(U.list(L.notes)),
            h('p', { class: 'muted' }, 'Tu solución no tiene que ser idéntica: basta con que dé los mismos testigos y acepte el mismo lenguaje sin conflictos.'));
        }
      };
    }
  });
})();
