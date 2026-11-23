// ===== Ejercicios de análisis sintáctico =====
(function () {
  const { h, div, btn, esc } = U;
  const EPS = Gram.EPS, END = Gram.END;

  // ---------- utilidades comunes ----------
  function grammarPre(g, opts = {}) {
    const lines = [];
    if (opts.aug) lines.push((opts.numbered ? '0) ' : '') + opts.aug.Sp + ' → ' + g.start + ' #');
    g.rules.forEach((r, i) => lines.push((opts.numbered ? (i + 1) + ') ' : '') + Gram.ruleStr(r)));
    return h('pre', { class: 'box' }, lines.join('\n'));
  }
  function grammarCompact(g) { return Gram.toText(g); }
  function symsHtml(g) { return 'No terminales: <code class="k">' + g.nts.join(' ') + '</code> · terminales: <code class="k">' + g.ts.join(' ') + '</code>'; }
  function customGrammar(ctx) {
    if (!ctx.custom) return null;
    const g = Gram.parse(ctx.custom);
    if (!g.ts.length) throw new Error('La gramática no tiene terminales');
    return g;
  }
  const CUSTOM_G = (ex) => ({ label: 'Escribe la gramática (una línea por no terminal, alternativas con |, ε para la cadena vacía). Separa los símbolos con espacios si tienen más de un carácter.', example: ex, rows: 5 });
  function setFeedback(name, got, exp, order) {
    const d = U.diffSet(got, exp);
    const parts = [];
    if (d.missing.length) parts.push('falta ' + d.missing.join(', '));
    if (d.extra.length) parts.push('sobra ' + d.extra.join(', '));
    return name + ': ' + parts.join('; ');
  }
  function stepBox(title, content, extra) {
    const s = h('div', { class: 'step' }, h('div', { class: 'stitle', html: title }), content);
    if (extra) s.appendChild(extra);
    return s;
  }

  // ---------- Teoría ----------
  const T_FF = `
    <h4>Primeros (FIRST)</h4>
    <p><b>Primeros(α)</b> es el conjunto de terminales por los que puede empezar una cadena derivada de α; incluye ε si α puede derivar la cadena vacía.</p>
    <ul>
      <li>Si X es terminal: Primeros(X) = { X }.</li>
      <li>Si X → ε es una regla: ε ∈ Primeros(X).</li>
      <li>Si X → Y<sub>1</sub>Y<sub>2</sub>…Y<sub>k</sub>: añade Primeros(Y<sub>1</sub>) − {ε}; si Y<sub>1</sub> puede ser ε, añade también Primeros(Y<sub>2</sub>) − {ε}, y así sucesivamente. Si <i>todos</i> pueden ser ε, añade ε.</li>
    </ul>
    <h4>Siguientes (FOLLOW)</h4>
    <p><b>Siguientes(A)</b> son los terminales que pueden aparecer justo a la derecha de A en alguna forma sentencial. <b>Nunca contiene ε</b>; en su lugar aparece el fin de cadena <b>#</b>.</p>
    <ul>
      <li># ∈ Siguientes(S), con S el axioma.</li>
      <li>Si A → α B β: añade Primeros(β) − {ε} a Siguientes(B).</li>
      <li>Si A → α B, o A → α B β con ε ∈ Primeros(β): añade Siguientes(A) a Siguientes(B).</li>
    </ul>
    <p>Se repite hasta que ningún conjunto cambie (punto fijo).</p>
    <div class="tip">Errores típicos: poner ε en Siguientes; olvidar que si Y<sub>1</sub> es anulable hay que seguir mirando Y<sub>2</sub>; olvidar el # del axioma; y no propagar Siguientes(A) → Siguientes(B) cuando B está al final.</div>`;
  const T_LL = `
    <h4>Conjunto de predicción</h4>
    <p>Para cada regla A → α:</p>
    <p class="mono">Pred(A → α) = (Primeros(α) − {ε}) ∪ (Siguientes(A) si ε ∈ Primeros(α))</p>
    <h4>Tabla de análisis descendente LL(1)</h4>
    <p>Filas: no terminales. Columnas: terminales y #. Para cada regla A → α y cada a ∈ Pred(A → α), se escribe la regla en la celda M[A, a]. Las celdas vacías son errores.</p>
    <h4>¿Es LL(1)?</h4>
    <p>Una gramática es LL(1) si y solo si, para cada no terminal, los conjuntos de predicción de sus reglas son <b>disjuntos dos a dos</b>; es decir, si ninguna celda de la tabla tiene dos reglas.</p>
    <p>Una gramática con <b>recursividad por la izquierda</b> o con <b>prefijos comunes</b> nunca es LL(1); tampoco una ambigua.</p>
    <h4>Algoritmo de análisis</h4>
    <p>Pila inicial: <span class="mono"># S</span> (cima a la derecha en esta app: se escribe la pila con la cima a la izquierda en la traza). En cada paso, con X en la cima y a el símbolo actual:</p>
    <ul><li>X = a = # → aceptar.</li><li>X terminal y X = a → extraer (se desapila y se avanza la entrada).</li><li>X no terminal → se consulta M[X, a]; si hay una regla X → Y<sub>1</sub>…Y<sub>k</sub> se sustituye X por Y<sub>1</sub>…Y<sub>k</sub> (Y<sub>1</sub> queda en la cima). Si está vacía → error.</li></ul>`;
  const T_LR0 = `
    <h4>Elementos LR(0)</h4>
    <p>Un elemento es una regla con un punto en la parte derecha: <span class="mono">A → α • β</span> indica que ya se ha visto α y se espera β. Para una regla A → ε solo existe el elemento <span class="mono">A → •</span>.</p>
    <h4>Gramática aumentada</h4>
    <p>Se añade la regla <span class="mono">S' → S #</span>. Las reglas originales se numeran desde 1 (la aumentada no lleva número).</p>
    <h4>Clausura(I)</h4>
    <p>Se parte de los elementos de I. Para cada elemento <span class="mono">A → α • B β</span> con B no terminal, se añaden todos los <span class="mono">B → • γ</span>. Se repite hasta que no se añada nada.</p>
    <h4>Ir_a(I, X)</h4>
    <p>Se toman los elementos de I con el punto delante de X, se avanza el punto por encima de X y se calcula la clausura del resultado.</p>
    <h4>Colección canónica</h4>
    <ol><li>I0 = Clausura(S' → • S #).</li><li>Para cada estado, en orden, se calcula Ir_a con cada símbolo que aparece tras un punto: <b>primero los no terminales y después los terminales, en el orden de aparición en la gramática</b> (es el orden que usan los módulos y las soluciones).</li><li>Si el conjunto obtenido es nuevo, recibe el siguiente número; si ya existe, se reutiliza.</li><li>No se hace Ir_a con #: el elemento S' → S • # indica aceptación.</li></ol>
    <div class="tip">Truco: dos estados son el mismo si tienen exactamente los mismos elementos. Basta comparar el núcleo (los elementos que no vienen de la clausura).</div>`;
  const T_SLR = `
    <h4>Tabla de estados (transiciones)</h4>
    <p>Es la función Ir_a escrita como tabla: para cada estado y cada símbolo (terminal o no terminal), el estado al que se va.</p>
    <h4>Tabla SLR(1)</h4>
    <p>Columnas de <b>acción</b> (terminales y #) y de <b>Ir_a</b> (no terminales). Para cada estado I<sub>x</sub>:</p>
    <ul>
      <li>Si <span class="mono">A → α • a β</span> ∈ I<sub>x</sub> con a terminal e Ir_a(I<sub>x</sub>, a) = I<sub>k</sub>: <b>dk</b> (desplazar e ir a k).</li>
      <li>Si <span class="mono">A → α •</span> ∈ I<sub>x</sub> (punto al final, regla número n): <b>rn</b> en todas las columnas de <b>Siguientes(A)</b>.</li>
      <li>Si <span class="mono">S' → S • #</span> ∈ I<sub>x</sub>: <b>aceptar</b> (OK) en la columna #.</li>
      <li>Ir_a(I<sub>x</sub>, B) = I<sub>k</sub> con B no terminal: se escribe <b>k</b> en la columna B.</li>
    </ul>
    <h4>¿Es SLR(1)?</h4>
    <p>Lo es si ninguna celda tiene dos acciones. Un conflicto se escribe con las dos entradas, por ejemplo <span class="mono">d6/r3</span> (desplazamiento/reducción) o <span class="mono">r2/r5</span> (reducción/reducción). En un conflicto d/r la solución habitual es desplazar.</p>
    <div class="tip">En la app: escribe <b>d5</b>, <b>r2</b>, <b>OK</b> (o "aceptar") y los conflictos separados por /. En las columnas de no terminales, solo el número.</div>`;
  const T_TRACE_LR = `
    <h4>Algoritmo de análisis ascendente</h4>
    <p>Se usa una pila de estados que empieza con 0. Con s en la cima y a el símbolo actual, se mira Acción[s, a]:</p>
    <ul>
      <li><b>dk</b>: se apila k y se avanza en la entrada.</li>
      <li><b>rn</b> con la regla n: A → β: se desapilan |β| estados (tantos como símbolos tiene β; ninguno si β = ε). Con t en la cima, se apila Ir_a[t, A].</li>
      <li><b>OK</b>: se acepta la cadena.</li>
      <li>Celda vacía: error.</li>
    </ul>
    <div class="tip">Escribe la acción como <b>d5</b>, <b>r3</b>, <b>OK</b> o <b>error</b>.</div>`;

  // ---------- normalización de celdas ----------
  function normAction(s) {
    s = String(s || '').trim().toLowerCase();
    if (!s || s === '-' || s === '·') return [];
    return [...new Set(s.split(/[\/,;|]|\s+o\s+/).map(x => x.trim()).filter(Boolean).map(x => {
      x = x.replace(/\s+/g, '');
      if (/^(ok|acc|aceptar|acept|accept|acepta)$/.test(x)) return 'OK';
      let m = x.match(/^(d|s|desplazar|shift)(\d+)$/); if (m) return 'd' + m[2];
      m = x.match(/^(r|reducir|reduce)(\d+)$/); if (m) return 'r' + m[2];
      return '?' + x;
    }))].sort();
  }
  const sameArr = (a, b) => a.length === b.length && a.every((x, k) => x === b[k]);

  // ===================== Primeros y Siguientes =====================
  App.register({
    id: 'firstfollow', block: 'sin', exam: true, title: 'Primeros y Siguientes', short: 'Conjuntos FIRST y FOLLOW de cada no terminal',
    intro: 'Calcula Primeros y Siguientes de cada no terminal. Escribe los conjuntos separados por comas (ε como "ε" o "eps").',
    theory: T_FF, custom: CUSTOM_G('S → A B\nA → a A | ε\nB → b | c'),
    create(ctx) {
      const g = customGrammar(ctx) || GramGen.forLL(ctx.level, Math.random, { bankProb: 0.2 });
      const a = Gram.analyze(g);
      const F = U.setRows(g.nts.map(A => 'Primeros(' + A + ') ='), { terms: g.ts });
      const S = U.setRows(g.nts.map(A => 'Siguientes(' + A + ') ='), { ph: 'a, #', terms: g.ts });
      return {
        statement: h('div', null, h('p', { html: 'Dada la gramática' + (g.from ? ' <span class="tag">' + esc(g.from) + '</span>' : '') + ':' }), grammarPre(g), h('p', { class: 'muted', html: symsHtml(g) + ' · axioma: <b>' + g.start + '</b>' })),
        body: h('div', null, h('h3', null, 'a) Primeros'), F.el, h('h3', null, 'b) Siguientes'), S.el),
        check() {
          const errs = []; const fv = F.values(), sv = S.values();
          g.nts.forEach((A, k) => {
            const okF = U.sameSet(fv[k], a.F[A]); F.mark(k, okF); if (!okF) errs.push(setFeedback('Primeros(' + A + ')', fv[k], a.F[A]));
            const okS = U.sameSet(sv[k], a.S[A]); S.mark(k, okS); if (!okS) errs.push(setFeedback('Siguientes(' + A + ')', sv[k], a.S[A]));
          });
          if (sv.some(s => s.has(EPS))) errs.push('Recuerda: ε <b>nunca</b> está en un conjunto de Siguientes.');
          return errs.length ? { ok: false, html: 'Revisa:' + U.list(errs) } : { ok: true, html: '¡Correcto! Todos los conjuntos coinciden.' };
        },
        solution() {
          const d = div('');
          d.appendChild(U.table(g.nts, ['Primeros', 'Siguientes'], (r, c) => U.setStr(c ? a.S[g.nts[r]] : a.F[g.nts[r]], [...g.ts, END, EPS])));
          d.appendChild(h('p', { class: 'muted', html: explainFirst(g, a) }));
          return d;
        }
      };
    }
  });
  function explainFirst(g, a) {
    const nullable = g.nts.filter(A => a.F[A].has(EPS));
    return (nullable.length ? 'Anulables (pueden derivar ε): <b>' + nullable.join(', ') + '</b>. ' : 'Ningún no terminal es anulable. ') + 'El axioma ' + g.start + ' tiene # en Siguientes.';
  }

  // ===================== Predicción y tabla LL(1) =====================
  App.register({
    id: 'll1', block: 'sin', exam: true, title: 'Predicción y tabla LL(1)', short: 'Primeros, Siguientes, Pred, tabla descendente y ¿es LL(1)?',
    intro: 'Como la pregunta 1 de examen: primeros, siguientes, conjuntos de predicción, tabla de análisis descendente y decidir si es LL(1).',
    theory: T_FF + T_LL, custom: CUSTOM_G('S → A + S | A\nA → ( B ) | B\nB → x | y'),
    create(ctx) {
      const g = customGrammar(ctx) || GramGen.forLL(ctx.level);
      const a = Gram.analyze(g);
      const F = U.setRows(g.nts.map(A => 'Primeros(' + A + ') ='), { terms: g.ts });
      const S = U.setRows(g.nts.map(A => 'Siguientes(' + A + ') ='), { ph: 'a, #', terms: g.ts });
      const P = U.setRows(g.rules.map((r, i) => 'Pred(' + (i + 1) + ': ' + esc(Gram.ruleStr(r)) + ') ='), { ph: 'a, b', terms: g.ts });
      const cols = a.cols;
      const T = U.tableInput(g.nts, cols, { width: 70 });
      const isLL = U.choice(['Sí, es LL(1)', 'No, no es LL(1)']);
      const why = h('p', { class: 'muted' });
      return {
        statement: h('div', null, h('p', { html: 'Dada la gramática' + (g.from ? ' <span class="tag">' + esc(g.from) + '</span>' : '') + ' (reglas numeradas):' }), grammarPre(g, { numbered: true }), h('p', { class: 'muted', html: symsHtml(g) })),
        body: h('div', null,
          h('h3', null, 'a) Primeros'), F.el, h('h3', null, 'b) Siguientes'), S.el,
          h('h3', null, 'c) Conjuntos de predicción'), P.el,
          h('h3', null, 'd) Tabla de análisis descendente'), h('p', { class: 'muted', html: 'En cada celda escribe el <b>número de regla</b> (o la regla). Si hay más de una, sepáralas con <b>/</b>. Deja vacías las celdas de error.' }), T.el,
          h('h3', null, 'e) ¿Es LL(1)?'), isLL.el, why),
        check() {
          const errs = []; const fv = F.values(), sv = S.values(), pv = P.values();
          g.nts.forEach((A, k) => {
            const okF = U.sameSet(fv[k], a.F[A]); F.mark(k, okF); if (!okF) errs.push(setFeedback('Primeros(' + A + ')', fv[k], a.F[A]));
            const okS = U.sameSet(sv[k], a.S[A]); S.mark(k, okS); if (!okS) errs.push(setFeedback('Siguientes(' + A + ')', sv[k], a.S[A]));
          });
          g.rules.forEach((r, i) => { const ok = U.sameSet(pv[i], a.P[i]); P.mark(i, ok); if (!ok) errs.push(setFeedback('Pred(regla ' + (i + 1) + ')', pv[i], a.P[i])); });
          let bad = 0;
          g.nts.forEach((A, ri) => cols.forEach((c, ci) => {
            const got = parseLLCell(T.get(ri, ci), g, A); const exp = a.table[A][c].slice().sort();
            const ok = got !== null && sameArr(got, exp); T.mark(ri, ci, ok); if (!ok) bad++;
          }));
          if (bad) errs.push(bad + ' celda(s) de la tabla incorrecta(s) (marcadas en rojo).');
          const sel = isLL.selected();
          if (!sel.length) errs.push('Falta responder si es LL(1).');
          else { const okLL = (sel[0] === 0) === a.ll1; isLL.mark([a.ll1 ? 0 : 1]); if (!okLL) errs.push('La respuesta sobre LL(1) no es correcta: mira si alguna celda tiene más de una regla.'); }
          return errs.length ? { ok: false, html: 'Revisa:' + U.list(errs) } : { ok: true, html: '¡Todo correcto!' + (a.ll1 ? '' : ' Bien visto el conflicto: ' + a.conflicts.map(c => 'M[' + c.A + ', ' + c.a + '] = {' + c.rules.map(x => x + 1).join(', ') + '}').join('; ')) };
        },
        solution() {
          const d = div('');
          d.appendChild(U.table(g.nts, ['Primeros', 'Siguientes'], (r, c) => U.setStr(c ? a.S[g.nts[r]] : a.F[g.nts[r]], [...g.ts, END, EPS])));
          d.appendChild(U.table(g.rules.map((r, i) => (i + 1) + ') ' + Gram.ruleStr(r)), ['Pred'], (r) => U.setStr(a.P[r], [...g.ts, END])));
          d.appendChild(U.table(g.nts, cols, (r, c) => a.table[g.nts[r]][cols[c]].map(i => Gram.ruleStr(g.rules[i])).join(' / '), { cls: (r, c) => a.table[g.nts[r]][cols[c]].length > 1 ? 'bad' : '' }));
          d.appendChild(h('p', { html: a.ll1 ? '<b>Es LL(1)</b>: los conjuntos de predicción de las reglas de cada no terminal son disjuntos.' : '<b>No es LL(1)</b>: ' + a.conflicts.map(c => 'en M[' + c.A + ', ' + c.a + '] chocan las reglas ' + c.rules.map(x => x + 1).join(' y ')).join('; ') + '.' + (Gram.leftRecursion(g).any ? ' (La gramática tiene recursividad por la izquierda.)' : '') + (Gram.needsFactoring(g).length ? ' (Hay reglas con prefijo común: habría que factorizar.)' : '') }));
          return d;
        }
      };
    }
  });
  function parseLLCell(s, g, A) {
    s = String(s || '').trim();
    if (!s || s === '-') return [];
    const out = [];
    for (let part of s.split('/')) {
      part = part.trim(); if (!part) continue;
      if (/^\d+$/.test(part)) { out.push(+part - 1); continue; }
      let rhs = part;
      const m = U.normRule(part).split(' → ');
      if (m.length === 2) { if (m[0].trim() !== A) return null; rhs = m[1]; }
      const syms = rhs.split(/\s+/).filter(x => x && !/^(ε|eps|λ)$/i.test(x));
      const known = new Set([...g.nts, ...g.ts]);
      const toks = syms.flatMap(x => Gram.splitChunk(x, known));
      const idx = g.rules.findIndex(r => r.lhs === A && r.rhs.join(' ') === toks.join(' '));
      if (idx < 0) return null; out.push(idx);
    }
    return [...new Set(out)].sort();
  }

  // ===================== Traza LL(1) =====================
  App.register({
    id: 'lltrace', block: 'sin', title: 'Traza del análisis LL(1)', short: 'Pila, entrada y acción paso a paso',
    intro: 'Con la tabla LL(1) dada, simula el analizador descendente: en cada paso escribe la acción (la regla que se aplica, <b>extraer</b>, <b>aceptar</b> o <b>error</b>).',
    theory: T_LL, custom: CUSTOM_G("E → T E'\nE' → + T E' | ε\nT → F T'\nT' → * F T' | ε\nF → ( E ) | id"),
    create(ctx) {
      let g, a, w, res;
      for (let t = 0; t < 40; t++) {
        g = customGrammar(ctx) || GramGen.forLL(ctx.level, Math.random, { wantLL1: true, bankProb: 0.4 });
        a = Gram.analyze(g); if (!a.ll1) { if (ctx.custom) break; continue; }
        const sents = Tools.randomSentences(g, 6, Math.random, ctx.level === 'easy' ? 4 : 8);
        w = U.pick(sents.filter(s => s.length >= 2 && s.length <= 8)) || sents[0] || [];
        if (Math.random() < 0.3 && w.length > 1) { w = w.slice(); w.splice(U.R(w.length), 1); }
        res = Gram.parseLL(g, a, w);
        if (res.trace.length >= 4 && res.trace.length <= (ctx.level === 'veryhard' ? 30 : 20)) break;
      }
      res = Gram.parseLL(g, a, w);
      return traceExercise({
        ctx, statement: h('div', null, h('p', null, 'Gramática:'), grammarPre(g, { numbered: true }), h('p', null, 'Tabla LL(1):'),
          U.table(g.nts, a.cols, (r, c) => a.table[g.nts[r]][a.cols[c]].map(i => Gram.ruleStr(g.rules[i])).join(' / ')),
          h('p', { html: 'Cadena de entrada: <b class="mono">' + esc(w.join(' ')) + ' #</b>' })),
        trace: res.trace, accepted: res.ok,
        help: 'Acción: escribe la regla (p.ej. <span class="mono">' + esc(Gram.ruleStr(g.rules[0])) + '</span> o su número), <b>extraer</b>, <b>aceptar</b> o <b>error</b>.',
        normalize: s => normLLAction(s, g),
        expected: row => normLLAction(row.action, g)
      });
    }
  });
  function normLLAction(s, g) {
    s = String(s || '').trim();
    if (/^(extraer|emparejar|match|pop|desapilar|avanzar)$/i.test(s)) return 'extraer';
    if (/^(aceptar|ok|acc|accept)$/i.test(s)) return 'aceptar';
    if (/^error$/i.test(s)) return 'error';
    if (/^\d+$/.test(s)) return 'r' + (+s - 1);
    const m = U.normRule(s).split(' → ');
    if (m.length === 2) { const c = parseLLCell(s, g, m[0].trim()); if (c && c.length === 1) return 'r' + c[0]; }
    return '?' + s;
  }

  // Ejercicio genérico de traza paso a paso
  function traceExercise(o) {
    const rows = []; let step = 0; let finished = false;
    const tbody = h('tbody');
    const table = h('table', { class: 'grid' }, h('thead', null, h('tr', null, h('th', null, '#'), h('th', { class: 'left' }, 'Pila'), h('th', { class: 'left' }, 'Entrada'), h('th', { class: 'left' }, 'Acción'))), tbody);
    const fb = div('');
    const final = U.choice(['La cadena se acepta', 'La cadena se rechaza (error)']);
    const finalBox = h('div', { style: { display: 'none' } }, h('h3', null, '¿Resultado?'), final.el);
    function addRow() {
      const r = o.trace[step];
      const inp = U.input('', 'acción…'); inp.style.width = '100%';
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') checkStep(); });
      const tr = h('tr', null, h('td', null, String(step + 1)), h('td', { class: 'left mono' }, r.stack), h('td', { class: 'left mono' }, r.input), h('td', { class: 'left', style: { minWidth: '220px' } }, inp));
      tbody.appendChild(tr); rows.push({ tr, inp }); setTimeout(() => inp.focus(), 0);
    }
    function checkStep(force) {
      if (finished) return true;
      const cur = rows[step];
      const exp = o.expected(o.trace[step]); const got = o.normalize(cur.inp.value);
      if (force !== true && got !== exp) { cur.inp.classList.add('bad'); U.msg(fb, 'bad', 'Esa no es la acción del paso ' + (step + 1) + '. Mira la celda de la tabla para la cima de la pila y el símbolo actual.'); return false; }
      cur.inp.classList.remove('bad'); cur.inp.classList.add('ok'); cur.inp.readOnly = true; cur.inp.value = o.trace[step].action;
      U.msg(fb, '', '');
      step++;
      if (step >= o.trace.length) { finished = true; finalBox.style.display = ''; U.msg(fb, 'info', 'Traza completa. Indica el resultado y pulsa Comprobar.'); return true; }
      addRow(); return false;
    }
    function reveal() { while (!finished) checkStep(true); }
    addRow();
    return {
      statement: o.statement,
      body: h('div', null, h('p', { class: 'muted', html: o.help + ' Pulsa <span class="kbd">Enter</span> para comprobar cada paso.' }), h('div', { class: 'scroll' }, table), h('div', { class: 'btnrow' }, btn('Comprobar paso', () => checkStep(), 'small'), btn('Mostrar paso', () => checkStep(true), 'small ghost'), btn('Completar traza', reveal, 'small ghost')), fb, finalBox),
      check() {
        if (!finished) { checkStep(); return finished ? null : { ok: false, html: 'Completa la traza paso a paso (vas por el paso ' + (step + 1) + ' de ' + o.trace.length + ').' }; }
        const s = final.selected(); if (!s.length) return { ok: false, html: 'Indica si la cadena se acepta.' };
        final.mark([o.accepted ? 0 : 1]);
        return (s[0] === 0) === o.accepted ? { ok: true, html: '¡Correcto! La cadena ' + (o.accepted ? 'se acepta.' : 'se rechaza.') } : { ok: false, html: 'Fíjate en la última acción de la traza.' };
      },
      solution() { const d = div(''); d.appendChild(U.table(o.trace.map((_, k) => String(k + 1)), ['Pila', 'Entrada', 'Acción'], (r, c) => [o.trace[r].stack, o.trace[r].input, o.trace[r].action][c])); return d; }
    };
  }

  // ===================== Colección canónica LR(0) =====================
  function parseItem(line, C) {
    const aug = C.aug; const g = aug.g;
    let s = line.trim().replace(/::=|-+>|→|=>/, '→');
    if (!s) return null;
    const dotChars = ['•', '·', '∙', '●'];
    let dot = dotChars.find(d => s.includes(d));
    if (!dot && s.includes('.') && !g.ts.includes('.')) dot = '.';
    if (!dot) return { err: 'falta el punto (•) en "' + line.trim() + '"' };
    const k = s.indexOf('→'); if (k < 0) return { err: 'falta la flecha en "' + line.trim() + '"' };
    const lhs = s.slice(0, k).trim();
    const rhsTxt = s.slice(k + 1);
    const parts = rhsTxt.split(dot);
    if (parts.length !== 2) return { err: 'debe haber exactamente un punto en "' + line.trim() + '"' };
    const known = new Set([...g.nts, ...g.ts, aug.Sp, END]);
    const tok = t => t.trim().split(/\s+/).filter(x => x && !/^(ε|eps)$/i.test(x)).flatMap(x => Gram.splitChunk(x, known));
    const left = tok(parts[0]), right = tok(parts[1]);
    const rhs = [...left, ...right];
    const r = aug.rules.findIndex(rr => rr.lhs === lhs && rr.rhs.join(' ') === rhs.join(' '));
    if (r < 0) return { err: '"' + line.trim() + '" no corresponde a ninguna regla de la gramática' };
    return { r, d: left.length };
  }
  function parseItemSet(text, C) {
    const items = []; const errs = [];
    for (const l of text.split('\n')) { if (!l.trim()) continue; const it = parseItem(l, C); if (!it) continue; if (it.err) errs.push(it.err); else items.push(it); }
    return { items, errs };
  }
  function stateText(C, I) { return I.map(it => Gram.itemStr(C.aug, it)).join('\n'); }

  App.register({
    id: 'lr0', block: 'sin', exam: true, title: 'Colección canónica LR(0)', short: 'Clausura e Ir_a paso a paso',
    intro: 'Construye la colección canónica de conjuntos de elementos LR(0), estado a estado, en el orden de los módulos (no terminales primero, después terminales).',
    theory: T_LR0, custom: CUSTOM_G('S → A r | k\nA → S k | r A r A'),
    create(ctx) {
      const g = customGrammar(ctx) || GramGen.forLR(ctx.level);
      const C = Gram.lr0(g);
      const steps = [{ kind: 'I0' }, ...C.trans.map(t => ({ kind: 'goto', t }))];
      let cur = 0;
      const list = div('');
      const fb = div('');
      const shown = new Set([0]);
      function render() {
        list.innerHTML = '';
        for (let k = 0; k <= Math.min(cur, steps.length - 1); k++) {
          const st = steps[k];
          const title = st.kind === 'I0' ? 'I0 = Clausura({ ' + esc(C.aug.Sp) + ' → • ' + esc(g.start) + ' # })' : 'Ir_a(I' + st.t.from + ', ' + esc(st.t.sym) + ')';
          if (k < cur) {
            const res = st.kind === 'I0' ? 'I0' : (st.t.isNew ? 'I' + st.t.to + ' (nuevo)' : '= I' + st.t.to + ' (ya existía)');
            const body = st.kind === 'I0' || st.t.isNew ? h('pre', { class: 'box' }, stateText(C, C.states[st.kind === 'I0' ? 0 : st.t.to].items)) : null;
            list.appendChild(h('div', { class: 'step done' }, h('div', { class: 'stitle', html: title + ' → <b>' + res + '</b>' }), body));
          } else {
            const ta = U.code('', 5, st.kind === 'I0' ? "Un elemento por línea, p.ej.:\n" + C.aug.Sp + ' → • ' + g.start + ' #' : 'Elementos (uno por línea) o el número del estado si ya existe, p.ej. I2');
            const box = h('div', { class: 'step' }, h('div', { class: 'stitle', html: title + ' = ?' }), ta,
              h('div', { class: 'btnrow' }, btn('Comprobar paso', () => checkStep(ta), 'small'), btn('Mostrar este paso', () => { ta.value = st.kind === 'goto' && !st.t.isNew ? 'I' + st.t.to : stateText(C, C.states[st.kind === 'I0' ? 0 : st.t.to].items); checkStep(ta); }, 'small ghost'), btn('Completar todo', () => { while (cur < steps.length) advance(); render(); U.msg(fb, 'info', 'Colección completa.'); }, 'small ghost')));
            list.appendChild(box); setTimeout(() => ta.focus(), 0);
          }
        }
        if (cur >= steps.length) list.appendChild(h('div', { class: 'msg ok', html: 'Colección terminada: ' + C.states.length + ' estados (I0 … I' + (C.states.length - 1) + ').' }));
      }
      function advance() { cur++; }
      function checkStep(ta) {
        const st = steps[cur];
        const txt = ta.value.trim();
        const target = st.kind === 'I0' ? 0 : st.t.to;
        const m = txt.match(/^=?\s*I?\s*(\d+)$/i);
        if (m) {
          if (st.kind === 'goto' && !st.t.isNew && +m[1] === target) { advance(); render(); U.msg(fb, 'ok', 'Correcto: coincide con I' + target + '.'); return true; }
          U.msg(fb, 'bad', st.kind === 'goto' && st.t.isNew ? 'Este conjunto es <b>nuevo</b>: no coincide con ningún estado anterior. Escribe sus elementos.' : 'No coincide con I' + m[1] + '.');
          return false;
        }
        const { items, errs } = parseItemSet(txt, C);
        if (errs.length) { U.msg(fb, 'bad', 'No entiendo algunas líneas:' + U.list(errs.map(esc))); return false; }
        const expected = C.states[target].items;
        const ek = new Set(expected.map(Gram.itemKey)), gk = new Set(items.map(Gram.itemKey));
        const missing = expected.filter(it => !gk.has(Gram.itemKey(it))), extra = items.filter(it => !ek.has(Gram.itemKey(it)));
        if (!missing.length && !extra.length) {
          advance(); render();
          U.msg(fb, 'ok', st.kind === 'goto' && !st.t.isNew ? 'Elementos correctos; fíjate en que es el mismo conjunto que <b>I' + target + '</b>, así que no se crea un estado nuevo.' : 'Correcto: es el estado <b>I' + target + '</b>.');
          return true;
        }
        const kernel = st.kind === 'I0' ? [] : C.states[target].items.filter(it => it.d > 0 || it.r === 0);
        const kernelMissing = missing.filter(it => kernel.some(k => Gram.itemKey(k) === Gram.itemKey(it)));
        const parts = [];
        if (kernelMissing.length) parts.push('Faltan elementos del núcleo (los que salen de avanzar el punto por encima de ' + esc(st.t ? st.t.sym : '') + '): ' + kernelMissing.map(it => '<span class="mono">' + esc(Gram.itemStr(C.aug, it)) + '</span>').join(', '));
        const closMissing = missing.filter(it => !kernelMissing.includes(it));
        if (closMissing.length) parts.push('Faltan ' + closMissing.length + ' elemento(s) de la clausura: revisa qué no terminales quedan justo detrás de un punto.');
        if (extra.length) parts.push('Sobran: ' + extra.map(it => '<span class="mono">' + esc(Gram.itemStr(C.aug, it)) + '</span>').join(', '));
        U.msg(fb, 'bad', parts.join('<br>'));
        return false;
      }
      render();
      const tbl = () => {
        const order = [...g.nts, ...g.ts];
        return U.table(C.states.map((_, i) => 'I' + i), order, (r, c) => { const t = C.trans.find(t => t.from === r && t.sym === order[c]); return t ? t.to : ''; });
      };
      return {
        statement: h('div', null, h('p', { html: 'Gramática' + (g.from ? ' <span class="tag">' + esc(g.from) + '</span>' : '') + ' (aumentada y numerada):' }), grammarPre(g, { numbered: true, aug: C.aug }),
          h('p', { class: 'muted', html: 'Escribe los elementos con el punto <b>•</b> (también vale "." o "·"), uno por línea. Para una regla A → ε el elemento es <span class="mono">A → •</span>. Orden de símbolos: <b>' + esc([...g.nts, ...g.ts].join(', ')) + '</b>.' })),
        body: h('div', null, list, fb),
        check() {
          if (cur < steps.length) { const ta = list.querySelector('.step:not(.done) textarea'); if (ta && ta.value.trim()) checkStep(ta); return cur >= steps.length ? { ok: true, html: '¡Colección canónica completa!' } : null; }
          return { ok: true, html: '¡Colección canónica completa y correcta! Puedes seguir con la tabla SLR de esta misma gramática.' + ' <a href="#/slr" onclick="App.pending={id:\'slr\',text:' + esc(JSON.stringify(Gram.toText(g))) + '}">Ir a la tabla SLR →</a>' };
        },
        solution() {
          const d = div('');
          const wrap = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '8px' } });
          C.states.forEach((s, i) => wrap.appendChild(h('div', null, h('b', null, 'I' + i + (s.from !== null ? ' = Ir_a(I' + s.from + ', ' + s.sym + ')' : ' = Clausura')), h('pre', { class: 'box' }, stateText(C, s.items)))));
          d.appendChild(wrap);
          const rep = C.trans.filter(t => !t.isNew).map(t => 'Ir_a(I' + t.from + ', ' + t.sym + ') = I' + t.to);
          if (rep.length) d.appendChild(h('p', { class: 'muted' }, 'Repetidos: ' + rep.join(' · ')));
          d.appendChild(h('h3', null, 'Tabla de estados (Ir_a)')); d.appendChild(tbl());
          return d;
        }
      };
    }
  });

  // ===================== Tabla SLR(1) =====================
  App.register({
    id: 'slr', block: 'sin', exam: true, title: 'Tabla de estados y tabla SLR(1)', short: 'Ir_a, Siguientes, acciones y conflictos',
    intro: 'A partir de la colección LR(0) (te la damos), rellena la tabla de estados, los Siguientes y la tabla de acciones SLR(1).',
    theory: T_SLR, custom: CUSTOM_G('A → B\nB → x B c B | x B | d'),
    create(ctx) {
      const g = customGrammar(ctx) || GramGen.forLR(ctx.level);
      const T = Gram.slr(g); const C = T;
      const order = [...g.ts, ...g.nts];
      const trans = U.tableInput(C.states.map((_, i) => String(i)), order, { corner: 'Estado', width: 46 });
      const S = U.setRows(g.nts.map(A => 'Siguientes(' + A + ') ='), { ph: 'a, #', terms: g.ts });
      const actCols = [...T.cols, ...g.nts];
      const act = U.tableInput(C.states.map((_, i) => String(i)), actCols, { corner: 'Estado', width: 58 });
      const isSLR = U.choice(['Sí, es SLR(1)', 'No: hay conflictos']);
      const wrap = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: '8px' } });
      C.states.forEach((s, i) => wrap.appendChild(h('div', null, h('b', null, 'I' + i), h('pre', { class: 'box' }, stateText(C, s.items)))));
      return {
        statement: h('div', null, h('p', { html: 'Gramática' + (g.from ? ' <span class="tag">' + esc(g.from) + '</span>' : '') + ':' }), grammarPre(g, { numbered: true, aug: C.aug }),
          h('details', { open: true }, h('summary', null, 'Colección canónica LR(0)'), wrap)),
        body: h('div', null,
          h('h3', null, 'a) Tabla de estados (función Ir_a)'), h('p', { class: 'muted' }, 'Escribe el número de estado destino; deja en blanco si no hay transición.'), trans.el,
          h('h3', null, 'b) Siguientes'), S.el,
          h('h3', null, 'c) Tabla de acciones SLR(1) e Ir_a'), h('p', { class: 'muted', html: 'Acciones: <b>d5</b>, <b>r2</b>, <b>OK</b>; conflictos con <b>/</b> (p.ej. d6/r3). Columnas de no terminales: número de estado.' }), act.el,
          h('h3', null, 'd) ¿Es SLR(1)?'), isSLR.el),
        check() {
          const errs = [];
          let bad = 0;
          C.states.forEach((_, s) => order.forEach((X, c) => {
            const t = C.trans.find(t => t.from === s && t.sym === X); const exp = t ? String(t.to) : '';
            const got = (trans.get(s, c) || '').replace(/^I/i, '');
            const ok = got === exp; trans.mark(s, c, ok); if (!ok) bad++;
          }));
          if (bad) errs.push('Tabla de estados: ' + bad + ' celda(s) incorrecta(s).');
          const sv = S.values();
          g.nts.forEach((A, k) => { const ok = U.sameSet(sv[k], T.S[A]); S.mark(k, ok); if (!ok) errs.push(setFeedback('Siguientes(' + A + ')', sv[k], T.S[A])); });
          bad = 0; let unknown = 0;
          C.states.forEach((_, s) => actCols.forEach((X, c) => {
            let ok;
            if (g.isNT(X)) { const e = T.goto[s][X]; ok = (act.get(s, c) || '') === (e === null ? '' : String(e)); }
            else { const got = normAction(act.get(s, c)); if (got.some(x => x[0] === '?')) unknown++; ok = sameArr(got, T.action[s][X].slice().sort()); }
            act.mark(s, c, ok); if (!ok) bad++;
          }));
          if (bad) errs.push('Tabla SLR: ' + bad + ' celda(s) incorrecta(s).' + (unknown ? ' Algunas celdas no tienen un formato válido (usa d5, r2, OK).' : ''));
          const sel = isSLR.selected();
          if (!sel.length) errs.push('Indica si la gramática es SLR(1).');
          else { isSLR.mark([T.isSLR ? 0 : 1]); if ((sel[0] === 0) !== T.isSLR) errs.push('Revisa la respuesta sobre SLR(1): busca celdas con dos acciones.'); }
          return errs.length ? { ok: false, html: 'Revisa:' + U.list(errs) } : { ok: true, html: '¡Tablas correctas!' + (T.isSLR ? '' : ' Conflictos: ' + T.conflicts.map(c => 'estado ' + c.state + ' con ' + c.sym + ' (' + c.entries.join('/') + ')').join('; ') + '.') };
        },
        solution() {
          const d = div('');
          d.appendChild(h('h3', null, 'Tabla de estados'));
          d.appendChild(U.table(C.states.map((_, i) => String(i)), order, (r, c) => { const t = C.trans.find(t => t.from === r && t.sym === order[c]); return t ? t.to : ''; }));
          d.appendChild(h('p', { class: 'mono', html: g.nts.map(A => 'Siguientes(' + A + ') = ' + U.setStr(T.S[A], [...g.ts, END])).join('<br>') }));
          d.appendChild(h('h3', null, 'Tabla SLR(1)'));
          d.appendChild(U.table(C.states.map((_, i) => String(i)), actCols, (r, c) => g.isNT(actCols[c]) ? (T.goto[r][actCols[c]] ?? '') : T.action[r][actCols[c]].join('/'), { cls: (r, c) => !g.isNT(actCols[c]) && T.action[r][actCols[c]].length > 1 ? 'bad' : '' }));
          d.appendChild(h('p', { html: T.isSLR ? '<b>Es SLR(1)</b>: ninguna celda tiene dos acciones.' : '<b>No es SLR(1)</b>: ' + T.conflicts.map(c => 'conflicto ' + (c.entries.every(e => e[0] === 'r') ? 'reducción/reducción' : 'desplazamiento/reducción') + ' en el estado ' + c.state + ' con ' + c.sym).join('; ') + '.' }));
          return d;
        }
      };
    }
  });

  // ===================== Traza LR =====================
  App.register({
    id: 'lrtrace', block: 'sin', title: 'Traza del análisis ascendente', short: 'Pila de estados con la tabla SLR',
    intro: 'Con la tabla SLR(1), simula el analizador ascendente sobre una cadena. Escribe la acción de cada paso.',
    theory: T_TRACE_LR, custom: CUSTOM_G('A → B [ C ]\nB → d | e\nC → C + B | B'),
    create(ctx) {
      let g, T, w, res;
      for (let t = 0; t < 40; t++) {
        g = customGrammar(ctx) || GramGen.forLR(ctx.level, Math.random, false);
        T = Gram.slr(g); if (!T.isSLR && !ctx.custom) continue;
        const sents = Tools.randomSentences(g, 6, Math.random, ctx.level === 'easy' ? 4 : 7);
        w = U.pick(sents.filter(s => s.length >= 2)) || sents[0] || [];
        if (Math.random() < 0.3 && w.length > 1) { w = w.slice(); w.splice(U.R(w.length), 1); }
        res = Gram.parseLR(T, T.aug, w);
        if (res.trace.length >= 4 && res.trace.length <= (ctx.level === 'veryhard' ? 30 : 20)) break;
      }
      res = Gram.parseLR(T, T.aug, w);
      const actCols = [...T.cols, ...g.nts];
      const norm = s => { s = String(s || '').trim().toLowerCase(); if (s === 'error') return 'error'; const n = normAction(s); return n.length === 1 ? n[0] : '?'; };
      const expect = row => { if (row.action === 'ERROR') return 'error'; if (row.action === 'aceptar') return 'OK'; const m = row.action.match(/^desplazar (\d+)/); if (m) return 'd' + m[1]; const r = row.action.match(/\(r(\d+)\)/); return 'r' + r[1]; };
      return traceExercise({
        ctx, statement: h('div', null, h('p', null, 'Gramática:'), grammarPre(g, { numbered: true, aug: T.aug }), h('p', null, 'Tabla SLR(1):'),
          U.table(T.states.map((_, i) => String(i)), actCols, (r, c) => g.isNT(actCols[c]) ? (T.goto[r][actCols[c]] ?? '') : T.action[r][actCols[c]].join('/')),
          h('p', { html: 'Cadena de entrada: <b class="mono">' + esc(w.join(' ')) + ' #</b>' })),
        trace: res.trace, accepted: res.ok,
        help: 'Acción: <b>d5</b> (desplazar 5), <b>r2</b> (reducir por la regla 2), <b>OK</b> o <b>error</b>.',
        normalize: norm, expected: expect
      });
    }
  });

  // ===================== Ambigüedad y derivaciones =====================
  App.register({
    id: 'ambig', block: 'sin', title: 'Derivaciones y ambigüedad', short: 'Derivación por la izquierda, árboles, gramáticas ambiguas',
    variants: [{ id: 'deriv', name: 'Derivación por la izquierda' }, { id: 'count', name: '¿Cuántos árboles?' }, { id: 'find', name: 'Encuentra una cadena ambigua' }],
    variantLabel: 'Ejercicio', levels: ['easy', 'medium', 'hard'],
    theory: `<h4>Derivación</h4><p>Una derivación es una secuencia de formas sentenciales en la que, en cada paso, se sustituye un no terminal por la parte derecha de una de sus reglas. En la derivación <b>por la izquierda</b> siempre se sustituye el no terminal situado más a la izquierda.</p>
      <h4>Árbol de derivación</h4><p>Representa la derivación sin fijarse en el orden de sustitución. Cada derivación por la izquierda corresponde a exactamente un árbol.</p>
      <h4>Gramática ambigua</h4><p>Una gramática es ambigua si existe <b>alguna</b> cadena con dos o más árboles de derivación distintos (equivalentemente, dos derivaciones por la izquierda distintas). Ejemplos clásicos: E → E + E | E * E | id (no fija ni precedencia ni asociatividad) y el <i>if-then-else</i> colgante.</p>
      <p>Para quitar la ambigüedad de las expresiones se introduce un no terminal por nivel de precedencia (E, T, F) y la recursividad del lado que marca la asociatividad: <span class="mono">E → E + T</span> hace que + sea asociativo por la izquierda.</p>
      <div class="tip">Una gramática LL(1) o SLR(1) nunca es ambigua. Que un analizador tenga conflictos no implica que la gramática sea ambigua.</div>`,
    create(ctx) {
      const v = ctx.variant || 'deriv';
      if (v === 'deriv') {
        const b = U.pick(GramGen.BANK.ambig.filter(b => ctx.level === 'easy' ? b.w.split(' ').length <= 4 : true));
        const g = Gram.parse(b.src);
        const sents = Tools.randomSentences(g, 5, Math.random, ctx.level === 'easy' ? 3 : ctx.level === 'medium' ? 5 : 7).filter(s => s.length);
        const w = U.pick(sents) || b.w.split(' ');
        const ta = U.code(g.start + '\n', 8, 'Una forma sentencial por línea, empezando por ' + g.start);
        return {
          statement: h('div', null, h('p', null, 'Gramática:'), grammarPre(g), h('p', { html: 'Escribe una <b>derivación por la izquierda</b> de la cadena <b class="mono">' + esc(w.join(' ')) + '</b>: una forma sentencial por línea, desde ' + g.start + ' hasta la cadena.' })),
          body: ta,
          check() {
            const known = new Set([...g.nts, ...g.ts]);
            const lines = ta.value.split('\n').map(l => l.replace(/^\s*(⇒|=>|->)\s*/, '').trim()).filter(Boolean).map(l => l.split(/\s+/).flatMap(x => Gram.splitChunk(x, known)).filter(x => x !== EPS));
            if (!lines.length || lines[0].join(' ') !== g.start) return { ok: false, html: 'La derivación debe empezar por el axioma ' + g.start + '.' };
            for (let k = 1; k < lines.length; k++) {
              const prev = lines[k - 1]; const idx = prev.findIndex(x => g.isNT(x));
              if (idx < 0) return { ok: false, html: 'La línea ' + k + ' ya no tiene no terminales.' };
              const A = prev[idx];
              const ok = g.rules.some(r => r.lhs === A && [...prev.slice(0, idx), ...r.rhs, ...prev.slice(idx + 1)].join(' ') === lines[k].join(' '));
              if (!ok) {
                const anyPos = prev.some((X, j) => g.isNT(X) && g.rules.some(r => r.lhs === X && [...prev.slice(0, j), ...r.rhs, ...prev.slice(j + 1)].join(' ') === lines[k].join(' ')));
                return { ok: false, html: 'Paso ' + k + ' → ' + (k + 1) + ': ' + (anyPos ? 'es un paso válido pero <b>no sustituye el no terminal de más a la izquierda</b> (' + A + ').' : 'no se obtiene aplicando una regla al no terminal ' + A + '.') };
              }
            }
            if (lines[lines.length - 1].join(' ') !== w.join(' ')) return { ok: false, html: 'Los pasos son correctos, pero aún no has llegado a la cadena ' + esc(w.join(' ')) + '.' };
            return { ok: true, html: '¡Derivación correcta en ' + (lines.length - 1) + ' pasos!' };
          },
          solution() { const t = Gram.oneTree(g, w); return h('div', null, h('pre', { class: 'box' }, Gram.leftmostDerivation(t).join('\n⇒ ')), h('p', null, 'Árbol:'), h('pre', { class: 'box tree' }, U.treeText(t))); }
        };
      }
      if (v === 'count') {
        const b = U.pick(GramGen.BANK.ambig);
        const g = Gram.parse(b.src);
        let w = b.w.split(' ');
        if (ctx.level !== 'easy') { const s = Tools.randomSentences(g, 8, Math.random, ctx.level === 'medium' ? 5 : 7).filter(x => x.length >= 3); if (s.length) w = U.pick(s); }
        const n = Gram.countTrees(g, w).count;
        const inp = U.input('', 'número'); inp.style.width = '100px';
        return {
          statement: h('div', null, h('p', null, 'Gramática:'), grammarPre(g), h('p', { html: '¿Cuántos árboles de derivación distintos tiene la cadena <b class="mono">' + esc(w.join(' ')) + '</b>?' })),
          body: h('div', null, inp),
          check() { const got = parseInt(inp.value, 10); return got === n ? { ok: true, html: '¡Correcto! Tiene ' + n + (n === 1 ? ' árbol.' : ' árboles, así que la gramática es ambigua.') } : { ok: false, html: 'No. Prueba a dibujar los árboles cambiando qué operación/regla queda en la raíz.' }; },
          solution() { const d = h('div', null, h('p', null, n + ' árbol(es).')); for (let k = 0; k < Math.min(n, 3); k++) { const t = Gram.oneTree(g, w, k); if (t) d.appendChild(h('pre', { class: 'box tree' }, U.treeText(t))); } return d; }
        };
      }
      // find
      const b = U.pick(GramGen.BANK.ambig);
      const g = Gram.parse(b.src);
      const isAmb = !b.unamb;
      const ch = U.choice(['Es ambigua', 'No es ambigua']);
      const inp = U.input('', 'cadena con dos árboles (símbolos separados por espacios)'); inp.style.width = '100%';
      return {
        statement: h('div', null, h('p', null, 'Gramática:'), grammarPre(g), h('p', { html: '¿Es ambigua? Si lo es, escribe una cadena que tenga al menos dos árboles de derivación.' })),
        body: h('div', null, ch.el, inp),
        check() {
          const s = ch.selected(); if (!s.length) return { ok: false, html: 'Elige una opción.' };
          if ((s[0] === 0) !== isAmb) { ch.mark([isAmb ? 0 : 1]); return { ok: false, html: isAmb ? 'Sí es ambigua: busca una cadena con dos operaciones seguidas.' : 'No es ambigua: cada cadena tiene un único árbol (las reglas fijan precedencia y asociatividad).' }; }
          if (!isAmb) return { ok: true, html: '¡Correcto! No es ambigua.' };
          const known = new Set([...g.nts, ...g.ts]);
          const w = inp.value.trim().split(/\s+/).flatMap(x => Gram.splitChunk(x, known)).filter(Boolean);
          const n = Gram.countTrees(g, w).count;
          if (n >= 2) return { ok: true, html: '¡Correcto! "' + esc(w.join(' ')) + '" tiene ' + n + ' árboles.' };
          return { ok: false, html: n === 1 ? 'Esa cadena solo tiene un árbol.' : 'Esa cadena no pertenece al lenguaje.' };
        },
        solution() { if (!isAmb) return 'No es ambigua.'; const w = b.w.split(' '); const d = h('div', null, h('p', { html: 'Por ejemplo <b class="mono">' + esc(b.w) + '</b>:' })); for (let k = 0; k < 2; k++) d.appendChild(h('pre', { class: 'box tree' }, U.treeText(Gram.oneTree(g, w, k)))); return d; }
      };
    }
  });

  // ===================== Recursividad por la izquierda y factorización =====================
  App.register({
    id: 'transform', block: 'sin', title: 'Recursividad izquierda y factorización', short: 'Preparar una gramática para el análisis LL(1)',
    variants: [{ id: 'lr', name: 'Eliminar recursividad por la izquierda' }, { id: 'fact', name: 'Factorizar por la izquierda' }],
    variantLabel: 'Transformación', levels: ['easy', 'medium', 'hard'],
    theory: `<h4>Recursividad por la izquierda</h4><p>Una regla A → A α es recursiva por la izquierda. Un analizador descendente entraría en un bucle infinito, así que hay que eliminarla. Para</p>
      <p class="mono">A → A α<sub>1</sub> | … | A α<sub>n</sub> | β<sub>1</sub> | … | β<sub>m</sub></p><p>(las β no empiezan por A) se obtiene:</p>
      <p class="mono">A → β<sub>1</sub> A' | … | β<sub>m</sub> A'<br>A' → α<sub>1</sub> A' | … | α<sub>n</sub> A' | ε</p>
      <p>Ejemplo: E → E + T | T pasa a ser E → T E' y E' → + T E' | ε.</p>
      <h4>Factorización por la izquierda</h4><p>Si dos alternativas de A empiezan igual, A → α β<sub>1</sub> | α β<sub>2</sub>, el analizador no sabe cuál escoger mirando un símbolo. Se saca el prefijo común:</p>
      <p class="mono">A → α A'<br>A' → β<sub>1</sub> | β<sub>2</sub></p>
      <div class="tip">La gramática transformada tiene que generar <b>el mismo lenguaje</b>. La app lo comprueba comparando todas las cadenas hasta cierta longitud. Usa A', B'… para los no terminales nuevos.</div>`,
    create(ctx) {
      const v = ctx.variant || 'lr';
      const g = v === 'lr' ? GramGen.forLeftRec(ctx.level) : Gram.parse(U.pick(GramGen.BANK.factor).src);
      const ref = v === 'lr' ? Gram.eliminateDirectLR(g) : Gram.leftFactor(g);
      const ta = U.code('', 6, 'Escribe la gramática transformada');
      return {
        statement: h('div', null, h('p', { html: v === 'lr' ? 'Elimina la <b>recursividad por la izquierda</b> de:' : '<b>Factoriza por la izquierda</b>:' }), grammarPre(g)),
        body: ta,
        check() {
          let u; try { u = Gram.parse(ta.value, { known: [...g.nts, ...g.ts] }); } catch (e) { return { ok: false, html: esc(e.message) }; }
          const errs = [];
          if (u.start !== g.start) errs.push('El axioma debe seguir siendo ' + g.start + ' (escríbelo en la primera línea).');
          if (v === 'lr') { const lr = Gram.leftRecursion(u); if (lr.any) errs.push('Aún hay recursividad por la izquierda en: ' + [...new Set([...lr.direct, ...lr.indirect])].join(', ')); }
          else { const nf = Gram.needsFactoring(u); if (nf.length) errs.push('Todavía hay alternativas con prefijo común en: ' + nf.map(x => x.A + ' (' + x.prefix + ')').join(', ')); }
          const cmp = Gram.compareLang(g, u, 7);
          if (!cmp.equal) {
            if (cmp.onlyA.length) errs.push('Tu gramática no genera <span class="mono">' + esc(cmp.onlyA[0] || 'ε') + '</span>, que sí está en el lenguaje original.');
            if (cmp.onlyB.length) errs.push('Tu gramática genera <span class="mono">' + esc(cmp.onlyB[0] || 'ε') + '</span>, que no está en el lenguaje original.');
          }
          if (errs.length) return { ok: false, html: U.list(errs) };
          const ll = Gram.analyze(u).ll1;
          return { ok: true, html: '¡Correcto! Genera el mismo lenguaje (comprobado hasta 7 símbolos).' + (ll ? ' Además, ahora es LL(1).' : ' Ojo: aún no es LL(1), pero la transformación pedida está bien.') };
        },
        solution() { return h('div', null, h('pre', { class: 'box' }, Gram.toText(ref))); }
      };
    }
  });
})();
