// ===== Armazón de la app: registro de ejercicios, navegación, progreso =====
(function (root) {
  const { h, div, btn, msg } = U;
  const LEVELS = { easy: 'Fácil', medium: 'Media', hard: 'Difícil', veryhard: 'Muy difícil' };
  const BLOCKS = [
    { id: 'fund', name: '1 · Fundamentos' },
    { id: 'lex', name: '2 · Análisis léxico' },
    { id: 'sin', name: '3 · Análisis sintáctico' },
    { id: 'tools', name: '4 · JLex + CUP (examen)' },
    { id: 'sem', name: '5 · Semántica y código intermedio' },
    { id: 'opt', name: '6 · Optimización' }
  ];
  const EX = []; const byId = {};
  function register(ex) { EX.push(ex); byId[ex.id] = ex; }

  // ---------- progreso ----------
  const KEY = 'compiladores-progreso-v1';
  let P = {};
  try { P = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { P = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { } };
  function rec(id) { return P[id] || (P[id] = { ok: 0, tries: 0, levels: {} }); }
  function markTry(id) { rec(id).tries++; save(); }
  function markOk(id, level) {
    const r = rec(id); r.ok++; r.levels[level] = (r.levels[level] || 0) + 1;
    const today = new Date().toISOString().slice(0, 10);
    P._days = P._days || {}; P._days[today] = (P._days[today] || 0) + 1;
    save(); refreshNav();
  }
  function dotClass(id) {
    const r = P[id]; if (!r || !r.ok) return '';
    const n = Object.keys(r.levels).length;
    return r.ok >= 6 && n >= 3 ? 'p3' : r.ok >= 3 ? 'p2' : 'p1';
  }
  function streak() {
    const d = P._days || {}; let n = 0; const t = new Date();
    for (;;) { const k = t.toISOString().slice(0, 10); if (d[k]) { n++; t.setDate(t.getDate() - 1); } else break; }
    return n;
  }

  // ---------- navegación ----------
  let nav, main, current = null;
  function refreshNav() {
    if (!nav) return;
    nav.innerHTML = '';
    nav.appendChild(h('a', { href: '#/', class: !current ? 'on' : '' }, '🏠 Inicio y plan de estudio'));
    for (const b of BLOCKS) {
      nav.appendChild(div('blk', b.name));
      for (const ex of EX.filter(e => e.block === b.id)) {
        nav.appendChild(h('a', { href: '#/' + ex.id, class: current === ex.id ? 'on' : '' }, h('span', { class: 'dot ' + dotClass(ex.id) }), ex.title, ex.exam ? h('span', { class: 'exam', title: 'Ha salido en exámenes' }, 'EXAMEN') : null));
      }
    }
  }
  function route() {
    const id = location.hash.replace(/^#\/?/, '');
    current = byId[id] ? id : null;
    refreshNav();
    document.querySelector('nav.side').classList.remove('open');
    if (current) showExercise(byId[current]); else showHome();
    window.scrollTo(0, 0);
  }

  function showHome() {
    main.innerHTML = '';
    const total = EX.reduce((s, e) => s + ((P[e.id] && P[e.id].ok) || 0), 0);
    const touched = EX.filter(e => P[e.id] && P[e.id].ok).length;
    main.appendChild(h('div', { class: 'card' },
      h('h2', null, 'Compiladores · práctica interactiva'),
      h('p', { class: 'muted' }, 'Ejercicios que se generan solos y se corrigen paso a paso, con la notación de los módulos de la UOC. Cada tema trae su teoría al lado del ejercicio.'),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, String(total)), 'ejercicios resueltos'),
        h('div', { class: 'stat' }, h('b', null, touched + ' / ' + EX.length), 'temas practicados'),
        h('div', { class: 'stat' }, h('b', null, String(streak())), 'días seguidos'))));
    main.appendChild(h('div', { class: 'card theory', html: `
      <h3>Qué cae en el examen (y en qué orden estudiarlo)</h3>
      <p>Los exámenes finales tienen dos preguntas: una de <b>30 %</b> y otra de <b>70 %</b>.</p>
      <ul>
        <li><b>Pregunta 1 (30 %)</b>: ha salido una de estas tres: <a href="#/lr0">colección LR(0)</a> + <a href="#/slr">tabla SLR(1)</a>; <a href="#/firstfollow">Primeros/Siguientes</a> + <a href="#/ll1">predicción y tabla LL(1)</a>; o <a href="#/tac">código de tres direcciones</a> + <a href="#/quads">cuádruplas</a> a partir de C.</li>
        <li><b>Pregunta 2 (70 %)</b>: un <a href="#/exam">analizador JLex + CUP</a> para un lenguaje de ficheros (rutas de autocar, servidores, menús…). Es la que decide el aprobado.</li>
      </ul>
      <p>Las PEC añaden expresiones regulares, teoría, gramáticas, optimización y análisis semántico con CUP.</p>
      <div class="tip"><b>Ruta recomendada:</b> Expresiones regulares JLex → Simulador JLex → Patrones CUP → Problema de examen JLex+CUP (hazlo muchas veces) → Primeros/Siguientes → LL(1) → LR(0) → SLR(1) → TAC → Cuádruplas → Optimizaciones. Lo de los bloques 1 y 5 que no es TAC sirve como repaso de teoría.</div>
      <p class="muted">El punto de color de cada tema indica cuánto lo has practicado: amarillo (empezado), verde claro (3+ resueltos) y verde (6+ resueltos en 3 niveles).</p>` }));
    const grid = div('home-grid');
    for (const ex of EX) grid.appendChild(h('a', { href: '#/' + ex.id }, h('b', null, ex.title), h('small', null, ex.short || '')));
    main.appendChild(h('div', { class: 'card' }, h('h3', null, 'Todos los temas'), grid));
    main.appendChild(h('div', { class: 'card' }, h('h3', null, 'Copia de seguridad del progreso'),
      h('p', { class: 'muted' }, 'El progreso se guarda en este navegador. Puedes exportarlo para pasarlo a otro dispositivo.'),
      h('div', { class: 'btnrow' },
        btn('Exportar', () => { const t = JSON.stringify(P); navigator.clipboard && navigator.clipboard.writeText(t); prompt('Copia este texto:', t); }, 'ghost'),
        btn('Importar', () => { const t = prompt('Pega el texto exportado:'); if (!t) return; try { P = JSON.parse(t); save(); route(); } catch (e) { alert('Texto no válido'); } }, 'ghost'),
        btn('Borrar progreso', () => { if (confirm('¿Borrar todo el progreso?')) { P = {}; save(); route(); } }, 'warn'))));
  }

  function showExercise(ex) {
    main.innerHTML = '';
    const levels = ex.levels || Object.keys(LEVELS);
    const saved = (P._prefs && P._prefs[ex.id]) || {};
    const levelSel = h('select', null, ...levels.map(l => h('option', { value: l }, LEVELS[l])));
    levelSel.value = levels.includes(saved.level) ? saved.level : levels[Math.min(1, levels.length - 1)];
    const modeSel = h('select', null, h('option', { value: 'random' }, 'Aleatorio'), ex.custom ? h('option', { value: 'custom' }, 'Personalizado') : null);
    const extraSel = ex.variants ? h('select', null, ...ex.variants.map(v => h('option', { value: v.id }, v.name))) : null;
    if (extraSel && saved.variant) extraSel.value = saved.variant;
    const customBox = div('');
    const exArea = div('');
    const theoryBody = div('theory');
    const theory = h('details', { class: 'theorybox card' }, h('summary', null, '📘 Teoría de este tema'), theoryBody);
    theoryBody.innerHTML = typeof ex.theory === 'function' ? ex.theory() : (ex.theory || '');
    let customInput = null;
    function renderCustom() {
      customBox.innerHTML = '';
      if (modeSel.value !== 'custom') return;
      customInput = U.code(ex.custom.example || '', ex.custom.rows || 5, ex.custom.placeholder || '');
      customBox.appendChild(h('div', { class: 'card' }, h('div', { html: ex.custom.label }), customInput));
    }
    function persist() { P._prefs = P._prefs || {}; P._prefs[ex.id] = { level: levelSel.value, variant: extraSel && extraSel.value }; save(); }
    function generate() {
      persist();
      exArea.innerHTML = '';
      let inst;
      const ctx = {
        level: levelSel.value, variant: extraSel ? extraSel.value : null,
        custom: modeSel.value === 'custom' && customInput ? customInput.value : null,
        solved: () => { if (!ctx._done) { ctx._done = true; markOk(ex.id, levelSel.value); } },
        tried: () => markTry(ex.id)
      };
      try { inst = ex.create(ctx); }
      catch (e) { exArea.appendChild(h('div', { class: 'msg bad', html: 'No se pudo crear el ejercicio: ' + U.esc(e.message) })); console.error(e); return; }
      const fb = div('');
      const card = h('div', { class: 'card' });
      if (inst.statement) card.appendChild(typeof inst.statement === 'string' ? U.htmlEl(inst.statement) : inst.statement);
      if (inst.body) card.appendChild(inst.body);
      const solBox = div('');
      const row = div('btnrow');
      if (inst.check) row.appendChild(btn('Comprobar', () => {
        ctx.tried();
        let r; try { r = inst.check(); } catch (e) { r = { ok: false, html: 'Error al corregir: ' + U.esc(e.message) }; console.error(e); }
        if (!r) return;
        msg(fb, r.ok ? 'ok' : (r.warn ? 'warn' : 'bad'), r.html || (r.ok ? '¡Correcto!' : 'Hay errores.'));
        if (r.ok) ctx.solved();
      }));
      if (inst.solution) row.appendChild(btn('Ver solución', () => {
        solBox.innerHTML = '';
        const s = inst.solution();
        solBox.appendChild(h('div', { class: 'card' }, h('h3', null, 'Solución'), typeof s === 'string' ? U.htmlEl(s) : s));
        solBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 'ghost'));
      row.appendChild(btn('Nuevo ejercicio', generate, 'ghost'));
      card.appendChild(row); card.appendChild(fb);
      exArea.appendChild(card); exArea.appendChild(solBox);
    }
    modeSel.onchange = () => { renderCustom(); if (modeSel.value === 'random') generate(); };
    levelSel.onchange = generate;
    if (extraSel) extraSel.onchange = generate;
    const r = P[ex.id];
    main.appendChild(h('div', { class: 'card' },
      h('h2', null, ex.title),
      ex.intro ? h('p', { class: 'muted', html: ex.intro }) : null,
      h('div', { class: 'controls' },
        extraSel ? h('label', null, ex.variantLabel || 'Tipo', extraSel) : null,
        levels.length > 1 ? h('label', null, 'Dificultad', levelSel) : null,
        ex.custom ? h('label', null, 'Modo', modeSel) : null,
        btn('Generar', generate),
        h('span', { class: 'muted', style: { fontSize: '13px' } }, r ? `Resueltos: ${r.ok} · intentos: ${r.tries}` : ''))));
    main.appendChild(customBox);
    main.appendChild(theory);
    main.appendChild(exArea);
    const pend = root.App.pending;
    if (pend && pend.id === ex.id && ex.custom) { root.App.pending = null; modeSel.value = 'custom'; renderCustom(); customInput.value = pend.text; }
    generate();
  }

  function start() {
    document.body.innerHTML = '';
    const menuBtn = h('button', { class: 'menu', onclick: () => document.querySelector('nav.side').classList.toggle('open') }, '☰');
    document.body.appendChild(h('header', { class: 'top' }, menuBtn, h('h1', null, 'Compiladores'), h('span', { class: 'sub' }, 'UOC · 75.580'), h('span', { class: 'spacer' })));
    nav = h('nav', { class: 'side' }); main = h('main');
    document.body.appendChild(h('div', { class: 'layout' }, nav, main));
    window.addEventListener('hashchange', route);
    route();
  }
  root.App = { register, start, LEVELS, EX, byId, P: () => P };
})(typeof window !== 'undefined' ? window : globalThis);
