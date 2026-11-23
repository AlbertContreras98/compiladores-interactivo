// ===== Optimización: bloques básicos, optimizaciones individuales y cadena completa (PEC3) =====
(function () {
  const { h, div, btn, esc } = U;
  const numbered = code => code.map((ins, k) => String(k + 1).padStart(2, '0') + '  ' + Tac.fmt(ins)).join('\n');

  // ---------- generador de programas con oportunidades de optimización ----------
  function optProgram() {
    const R = U.R, P = U.pick;
    const [a, b] = U.sample(['a', 'b', 'x', 'y', 'p', 'q'], 2);
    const [s, i, n, k, d, t, u] = U.shuffle(['s', 'i', 'n', 'k', 'd', 't', 'u', 'm', 'r', 'w']).slice(0, 7);
    const c1 = 2 + R(8), c2 = 2 + R(20);
    const op = P(['*', '+']);
    const lines = [];
    lines.push(`${n} = ${c1} * ${c2};`);                       // cálculo previo de constantes
    lines.push(`${k} = ${n};`);                                 // copia
    lines.push(`${s} = 0;`);
    lines.push(`${i} = 0;`);
    lines.push(`while (${i} < ${k}) {`);
    lines.push(`    ${t} = ${a} ${op} ${b};`);                  // invariante
    lines.push(`    ${s} = ${s} + ${t} + (${a} ${op} ${b});`);    // subexpresión común
    if (Math.random() < 0.5) lines.push(`    ${u} = ${i} * ${P([2, 3, 4])};`); // muerto (u no se usa)
    lines.push(`    ${i} = ${i} + ${P([1, 1, 2])};`);
    lines.push('}');
    lines.push(`${d} = ${s} * 2;`);                             // muerto
    lines.push(`write(${s});`);
    return lines.join('\n');
  }
  function straightProgram() {
    const [a, b, c] = U.sample(['a', 'b', 'c', 'x', 'y'], 3);
    const [r1, r2, r3, r4] = U.sample(['p', 'q', 'r', 's', 't', 'u'], 4);
    const k1 = 2 + U.R(9), k2 = 1 + U.R(9);
    return [`${r1} = ${k1} + ${k2};`, `${r2} = ${a} * ${b} + ${r1};`, `${r3} = ${r1};`, `${r4} = ${a} * ${b} - ${r3} * ${c};`, `${r1} = ${r4} + 1;`, `write(${r2} + ${r4});`].join('\n');
  }
  const OPTS = {
    fr: { name: 'Reducción de frecuencia', apply: c => Tac.frequencyReduction(c), done: c => Tac.fmtAll(Tac.frequencyReduction(c)) === Tac.fmtAll(c), hint: 'Aún hay dentro del bucle algún cálculo cuyos operandos no cambian en el bucle: sácalo antes de la etiqueta del bucle.' },
    cf: { name: 'Cálculo previo de constantes', apply: c => Tac.constantFolding(c), done: c => !Tac.constantFolding(c).some(i => i.changed), hint: 'Aún hay operaciones cuyos operandos son constantes conocidas en ese punto: calcúlalas.' },
    cse: { name: 'Eliminación de subexpresiones comunes', apply: c => Tac.cse(c), done: c => !Tac.cse(c).some(i => i.changed), hint: 'Hay una expresión que se vuelve a calcular con los mismos operandos sin que hayan cambiado: reutiliza el temporal anterior.' },
    cp: { name: 'Propagación de copias', apply: c => Tac.copyPropagation(c), done: c => !Tac.copyPropagation(c).some(i => i.changed), hint: 'Hay usos de una variable que es copia de otra (x = y) o de una constante que todavía se pueden sustituir.' },
    dc: { name: 'Eliminación de código muerto', apply: (c, live) => Tac.deadCode(c, live), done: (c, live) => Tac.deadCode(c, live).length === c.length, hint: 'Aún hay asignaciones cuyo resultado no se usa después (y que no tienen efectos como write, push o escrituras en memoria).' }
  };
  const ORDER = ['fr', 'cf', 'cse', 'cp', 'dc'];
  function equivalent(orig, userCode, live) {
    const vars = new Set(); const defd = new Set();
    for (const ins of orig) { for (const u of Tac.uses(ins)) if (!defd.has(u) && u !== '$RET') vars.add(u); for (const d of Tac.defs(ins)) defd.add(d); }
    for (let t = 0; t < 8; t++) {
      const init = {}; for (const v of vars) init[v] = U.R(15) - 3;
      let e, g;
      try { e = Tac.run(orig, init); } catch (x) { continue; }
      try { g = Tac.run(userCode, init); } catch (x) { return 'Con ' + [...vars].map(v => v + '=' + init[v]).join(', ') + ' tu código falla: ' + x.message; }
      if (JSON.stringify(e.output) !== JSON.stringify(g.output)) return 'Con ' + [...vars].map(v => v + '=' + init[v]).join(', ') + ' el original escribe [' + e.output + '] y el tuyo [' + g.output + ']: has cambiado el comportamiento.';
      for (const v of live) if (e.env[v] !== g.env[v]) return 'La variable ' + v + ' termina con otro valor (' + g.env[v] + ' en vez de ' + e.env[v] + ').';
    }
    return null;
  }
  const T_OPT = `
    <h4>Las cinco optimizaciones de la PEC3 (en este orden)</h4>
    <ol>
      <li><b>Reducción de frecuencia</b>: sacar fuera del bucle (antes de su etiqueta) las operaciones invariantes, es decir, cuyos operandos no se modifican dentro del bucle.</li>
      <li><b>Cálculo previo de constantes</b>: calcular en compilación las operaciones cuyos operandos son constantes conocidas. <span class="mono">t1 = 4 * 25</span> → <span class="mono">t1 = 100</span>.</li>
      <li><b>Eliminación de subexpresiones comunes</b>: si una expresión ya se calculó y sus operandos no han cambiado, se reutiliza el resultado: <span class="mono">t5 = a * b</span> → <span class="mono">t5 = t2</span>.</li>
      <li><b>Propagación de copias</b>: tras <span class="mono">x = y</span> (o <span class="mono">x = 100</span>), los usos de x se sustituyen por y mientras ni x ni y cambien.</li>
      <li><b>Eliminación de código muerto</b>: borrar las asignaciones cuyo resultado no se usa nunca después. No se borran las instrucciones con efectos: write, push, call, escrituras en vectores o punteros, saltos y etiquetas.</li>
    </ol>
    <p>Las optimizaciones se aplican de forma <b>incremental</b>; si tras una se puede volver a aplicar una anterior, hay que hacerlo. Si una no se puede aplicar, se justifica.</p>
    <div class="tip">En esta app, salvo que se diga otra cosa, solo es observable lo que se escribe con <b>write</b>. La corrección ejecuta tu código y el original con varios valores de entrada, y comprueba que ya no quede nada por aplicar de la optimización pedida.</div>
    <h4>Bloques básicos</h4><p>Líderes: (1) la primera instrucción; (2) toda instrucción destino de un salto (las <span class="mono">label</span>); (3) toda instrucción que sigue a un salto (goto, if false … goto, halt). Cada bloque va de un líder hasta antes del siguiente.</p>`;

  // ===================== Bloques básicos =====================
  App.register({
    id: 'blocks', block: 'opt', title: 'Bloques básicos', short: 'Líderes y bloques de un código de tres direcciones',
    intro: 'Indica los números de línea de los <b>líderes</b> separados por comas.', levels: ['medium', 'hard', 'veryhard'],
    theory: T_OPT,
    create(ctx) {
      let code; do { code = Tac.parse(MiniC.toTAC(MiniC.parse(MiniC.generate(ctx.level).src))); } while (code.length < 8);
      const L = Tac.leaders(code).map(k => k + 1);
      const inp = U.input('', 'p. ej.: 1, 4, 9'); inp.style.width = '100%';
      return {
        statement: h('div', null, U.pre(numbered(code))),
        body: inp,
        check() {
          const got = new Set(inp.value.split(/[\s,;]+/).filter(Boolean).map(Number));
          const exp = new Set(L);
          if (U.sameSet(got, exp)) return { ok: true, html: '¡Correcto! Hay ' + L.length + ' bloques básicos.' };
          const d = U.diffSet(got, exp);
          return { ok: false, html: (d.missing.length ? 'Te faltan líderes (' + d.missing.length + '). ' : '') + (d.extra.length ? 'Sobran: ' + d.extra.join(', ') + '. ' : '') + 'Recuerda las tres reglas: primera instrucción, destinos de salto e instrucciones que siguen a un salto.' };
        },
        solution() { const bl = Tac.blocks(code); return h('div', null, h('p', null, 'Líderes: ' + L.join(', ')), U.pre(bl.map((b, i) => 'B' + (i + 1) + ': líneas ' + (b.start + 1) + '–' + (b.end + 1) + (b.succ.length ? '  → ' + b.succ.map(s => 'B' + (s + 1)).join(', ') : '')).join('\n'))); }
      };
    }
  });

  // ===================== Una optimización =====================
  App.register({
    id: 'opt', block: 'opt', exam: true, title: 'Optimizaciones de código', short: 'Aplicar una optimización concreta',
    intro: 'Aplica la optimización pedida al código de tres direcciones (lo tienes ya copiado en el editor para modificarlo).',
    variants: ORDER.map(k => ({ id: k, name: OPTS[k].name })), variantLabel: 'Optimización', levels: ['medium'],
    theory: T_OPT,
    create(ctx) {
      const key = ctx.variant || 'cf'; const O = OPTS[key];
      let code, after;
      for (let t = 0; t < 40; t++) {
        const src = key === 'cse' && Math.random() < 0.5 ? straightProgram() : optProgram();
        code = Tac.parse(MiniC.toTAC(MiniC.parse(src)));
        if (key === 'cp' || key === 'dc') code = Tac.constantFolding(code).map(i => (delete i.changed, i));
        if (key === 'dc') code = Tac.copyPropagation(code).map(i => (delete i.changed, i));
        after = O.apply(code, []);
        if (Tac.fmtAll(after) !== Tac.fmtAll(code)) break;
      }
      const ta = U.code(Tac.fmtAll(code), Math.min(24, code.length + 2));
      return {
        statement: h('div', null, h('p', { html: 'Aplica la <b>' + O.name.toLowerCase() + '</b>. Solo es observable lo que se escribe con <b>write</b>.' }), U.pre(numbered(code))),
        body: ta,
        check() {
          let u; try { u = Tac.parse(ta.value); } catch (e) { return { ok: false, html: esc(e.message) }; }
          const eq = equivalent(code, u, []); if (eq) return { ok: false, html: esc(eq) };
          if (!O.done(u, [])) return { ok: false, html: O.hint };
          if (Tac.fmtAll(u) === Tac.fmtAll(code)) return { ok: false, html: 'No has cambiado nada, y aquí sí se puede aplicar.' };
          return { ok: true, html: '¡Correcto! El código se comporta igual y ya no queda nada por aplicar de esta optimización.' };
        },
        solution() { return h('div', null, U.pre(Tac.changedText(O.apply(code, []))), h('p', { class: 'muted' }, 'Marcadas con "<-- cambia" las instrucciones afectadas.')); }
      };
    }
  });

  // ===================== Cadena completa (PEC3) =====================
  App.register({
    id: 'optchain', block: 'opt', exam: true, title: 'Cadena de optimizaciones (PEC3)', short: 'Las cinco optimizaciones en orden, paso a paso',
    intro: 'Como el ejercicio 1 de la PEC3: aplica las cinco optimizaciones en orden. Si una no se puede aplicar, deja el código igual y comprueba el paso. Cada paso parte del resultado del anterior.',
    levels: ['medium'], theory: T_OPT,
    create(ctx) {
      const code = Tac.parse(MiniC.toTAC(MiniC.parse(optProgram())));
      const steps = ORDER.map(k => ({ k, ta: null, ok: false, fb: div('') }));
      const box = div('');
      let prev = code;
      function render() {
        box.innerHTML = '';
        for (let j = 0; j < steps.length; j++) {
          const st = steps[j]; const O = OPTS[st.k];
          if (j > 0 && !steps[j - 1].ok) break;
          if (!st.ta) st.ta = U.code(Tac.fmtAll(j === 0 ? code : Tac.parse(steps[j - 1].ta.value)), Math.min(26, code.length + 3));
          box.appendChild(h('div', { class: 'step' + (st.ok ? ' done' : '') }, h('div', { class: 'stitle' }, (j + 1) + '. ' + O.name), st.ta,
            h('div', { class: 'btnrow' }, btn('Comprobar paso', () => checkStep(j), 'small'), btn('Mostrar este paso', () => { st.ta.value = Tac.fmtAll(refUpTo(j, j === 0 ? code : Tac.parse(steps[j - 1].ta.value))); checkStep(j); }, 'small ghost')), st.fb));
        }
      }
      function refUpTo(j, start) {
        let c = start;
        for (let rep = 0; rep < 4; rep++) for (let q = 0; q <= j; q++) c = OPTS[ORDER[q]].apply(c, []).map(i => (delete i.changed, i));
        return c;
      }
      function checkStep(j) {
        const st = steps[j];
        let u; try { u = Tac.parse(st.ta.value); } catch (e) { U.msg(st.fb, 'bad', esc(e.message)); return; }
        const eq = equivalent(code, u, []); if (eq) { U.msg(st.fb, 'bad', esc(eq)); return; }
        for (let q = 0; q <= j; q++) if (!OPTS[ORDER[q]].done(u, [])) { U.msg(st.fb, 'bad', (q < j ? 'Tras este paso se puede volver a aplicar la <b>' + OPTS[ORDER[q]].name.toLowerCase() + '</b>: hay que hacerlo. ' : '') + OPTS[ORDER[q]].hint); return; }
        const before = j === 0 ? code : Tac.parse(steps[j - 1].ta.value);
        const same = Tac.fmtAll(before) === Tac.fmtAll(u);
        st.ok = true; ctx.tried();
        U.msg(st.fb, 'ok', same ? 'Correcto: esta optimización <b>no se puede aplicar</b> aquí (en la PEC habría que justificarlo).' : 'Correcto.');
        if (j + 1 < steps.length && steps[j + 1].ta) steps[j + 1].ta.value = st.ta.value;
        render();
        if (steps.every(s => s.ok)) ctx.solved();
      }
      render();
      return {
        statement: h('div', null, h('p', null, 'Código de tres direcciones sin optimizar (solo es observable lo que se escribe con write):'), U.pre(numbered(code))),
        body: box,
        check() { const n = steps.filter(s => s.ok).length; return n === 5 ? { ok: true, html: '¡Las cinco optimizaciones aplicadas correctamente!' } : { ok: false, html: 'Llevas ' + n + ' de 5 pasos. Comprueba cada paso con su botón.' }; },
        solution() {
          const d = div(''); let c = code;
          ORDER.forEach((k, j) => { const n = refUpTo(j, c); d.appendChild(h('h3', null, (j + 1) + '. ' + OPTS[k].name)); d.appendChild(U.pre(Tac.fmtAll(n) === Tac.fmtAll(c) ? '(no se aplica)\n' + Tac.fmtAll(n) : Tac.fmtAll(n))); c = n; });
          return d;
        }
      };
    }
  });
})();
