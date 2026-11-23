// ===== Utilidades de interfaz =====
(function (root) {
  const U = {};
  U.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  U.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) { if (kid === null || kid === undefined || kid === false) continue; el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid); }
    return el;
  };
  U.div = (cls, ...k) => U.h('div', { class: cls }, ...k);
  U.htmlEl = (s, tag = 'div', cls) => U.h(tag, { html: s, class: cls });
  U.pre = s => U.h('pre', { class: 'box' }, s);
  U.btn = (label, fn, cls) => U.h('button', { class: cls || '', onclick: fn, type: 'button' }, label);
  U.msg = (el, kind, html) => { el.innerHTML = ''; if (!html) return; el.appendChild(U.h('div', { class: 'msg ' + kind, html })); };
  U.list = items => '<ul>' + items.map(i => '<li>' + i + '</li>').join('') + '</ul>';

  // ---------- aleatoriedad ----------
  U.R = n => Math.floor(Math.random() * n);
  U.pick = a => a[U.R(a.length)];
  U.shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = U.R(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  U.sample = (a, n) => U.shuffle(a).slice(0, n);

  // ---------- conjuntos ----------
  // terms: terminales de la gramática (si la coma es terminal, se puede escribir ',' entre comillas o suelta entre espacios)
  U.parseSet = (s, terms) => {
    s = String(s || '').replace(/[{}]/g, ' ').trim();
    if (!s || s === '∅' || /^vac[ií]o$/i.test(s)) return new Set();
    const commaIsTerm = terms && terms.includes(',');
    const out = [];
    const norm = x => /^(ε|eps|epsilon|λ|lambda)$/i.test(x) ? 'ε' : (x === '$' ? '#' : x);
    const quoted = /^(['"])(.+)\1$/;
    if (!commaIsTerm) {
      for (let x of s.split(/[\s,]+/)) { x = x.trim(); if (!x) continue; const m = x.match(quoted); out.push(norm(m ? m[2] : x)); }
    } else {
      for (let x of s.split(/\s+/)) {
        if (!x) continue;
        const m = x.replace(/,$/, '').match(quoted); if (m) { out.push(norm(m[2])); continue; }
        if (/^,+$/.test(x)) { out.push(','); continue; }
        for (const y of x.split(',')) if (y) out.push(norm(y));
      }
    }
    return new Set(out);
  };
  U.setStr = (set, order) => {
    let a = [...set];
    if (order) a.sort((x, y) => (order.indexOf(x) + 1 || 999) - (order.indexOf(y) + 1 || 999));
    return '{ ' + a.join(', ') + ' }';
  };
  U.sameSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
  U.diffSet = (got, exp) => ({ missing: [...exp].filter(x => !got.has(x)), extra: [...got].filter(x => !exp.has(x)) });

  // ---------- editores ----------
  U.code = (value, rows = 10, ph = '') => {
    const t = U.h('textarea', { rows, spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', placeholder: ph });
    t.value = value || '';
    t.addEventListener('keydown', e => {
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); const s = t.selectionStart; t.value = t.value.slice(0, s) + '    ' + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = s + 4; }
    });
    return t;
  };
  U.input = (value = '', ph = '', cls = 'mono') => { const i = U.h('input', { type: 'text', placeholder: ph, class: cls, spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off' }); i.value = value; return i; };

  // Tabla editable: rows/cols = etiquetas. readonly(r,c) opcional
  U.tableInput = function (rows, cols, opts = {}) {
    const inputs = {};
    const head = U.h('tr', null, U.h('th', null, opts.corner || ''), ...cols.map(c => U.h('th', { html: opts.colHtml ? opts.colHtml(c) : U.esc(c) })));
    const body = rows.map((r, ri) => U.h('tr', null, U.h('th', { html: opts.rowHtml ? opts.rowHtml(r) : U.esc(r) }), ...cols.map((c, ci) => {
      const td = U.h('td');
      if (opts.fixed && opts.fixed(ri, ci) !== undefined) { td.textContent = opts.fixed(ri, ci); td.classList.add('fixed'); return td; }
      const inp = U.h('input', { type: 'text', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'data-r': ri, 'data-c': ci });
      if (opts.width) inp.style.width = opts.width + 'px';
      inputs[ri + ',' + ci] = inp; td.appendChild(inp); return td;
    })));
    const table = U.h('table', { class: 'grid' }, U.h('thead', null, head), U.h('tbody', null, ...body));
    // navegación con flechas
    table.addEventListener('keydown', e => {
      const t = e.target; if (t.tagName !== 'INPUT') return;
      const r = +t.dataset.r, c = +t.dataset.c; let n = null;
      if (e.key === 'ArrowDown' || (e.key === 'Enter')) n = inputs[(r + 1) + ',' + c];
      if (e.key === 'ArrowUp') n = inputs[(r - 1) + ',' + c];
      if (e.key === 'ArrowRight' && t.selectionStart === t.value.length) n = inputs[r + ',' + (c + 1)];
      if (e.key === 'ArrowLeft' && t.selectionStart === 0) n = inputs[r + ',' + (c - 1)];
      if (n) { e.preventDefault(); n.focus(); n.select(); }
    });
    return {
      el: U.h('div', { class: 'scroll' }, table),
      get: (r, c) => inputs[r + ',' + c] ? inputs[r + ',' + c].value.trim() : null,
      set: (r, c, v) => { if (inputs[r + ',' + c]) inputs[r + ',' + c].value = v; },
      mark: (r, c, ok) => { const i = inputs[r + ',' + c]; if (!i) return; i.classList.remove('ok', 'bad'); if (ok !== null) i.classList.add(ok ? 'ok' : 'bad'); },
      inputs
    };
  };
  // Tabla de solo lectura
  U.table = function (rows, cols, cell, opts = {}) {
    return U.h('div', { class: 'scroll' }, U.h('table', { class: 'grid' },
      U.h('thead', null, U.h('tr', null, U.h('th', null, opts.corner || ''), ...cols.map(c => U.h('th', null, c)))),
      U.h('tbody', null, ...rows.map((r, ri) => U.h('tr', null, U.h('th', null, r), ...cols.map((c, ci) => { const v = cell(ri, ci); const td = U.h('td', null, v === undefined || v === null ? '' : String(v)); if (opts.cls) { const k = opts.cls(ri, ci); if (k) td.className = k; } return td; }))))));
  };
  // Filas de conjuntos (Primeros(A) = ...)
  U.setRows = function (labels, opts = {}) {
    const inputs = labels.map(() => U.input('', opts.ph || 'a, b, ε'));
    const note = opts.terms && opts.terms.includes(',') ? U.h('p', { class: 'muted', html: 'La coma es un terminal de esta gramática: escríbela entre comillas, <span class="mono">\',\'</span>.' }) : null;
    const el = U.h('div', null, note, U.h('div', { class: 'setrow' }, ...labels.flatMap((l, k) => [U.h('div', { class: 'mono', html: l }), inputs[k]])));
    return { el, inputs, values: () => inputs.map(i => U.parseSet(i.value, opts.terms)), mark: (k, ok) => { inputs[k].classList.remove('ok', 'bad'); if (ok !== null) inputs[k].classList.add(ok ? 'ok' : 'bad'); } };
  };
  // Test de opción única/múltiple
  U.choice = function (options, multi) {
    const name = 'q' + Math.random().toString(36).slice(2);
    const labels = options.map((o, k) => U.h('label', null, U.h('input', { type: multi ? 'checkbox' : 'radio', name, value: k }), ' ', U.h('span', { html: o })));
    return {
      el: U.h('div', { class: 'opts' }, ...labels),
      selected: () => labels.map((l, k) => l.querySelector('input').checked ? k : -1).filter(k => k >= 0),
      mark: correct => labels.forEach((l, k) => { l.classList.remove('ok', 'bad'); const c = correct.includes(k), s = l.querySelector('input').checked; if (c) l.classList.add('ok'); else if (s) l.classList.add('bad'); })
    };
  };
  // Árbol de derivación en texto
  U.treeText = function (t) {
    const lines = [];
    (function walk(n, prefix, last, root) {
      lines.push((root ? '' : prefix + (last ? '└─ ' : '├─ ')) + n.s);
      const kids = n.k || [];
      kids.forEach((k, i) => walk(k, root ? '' : prefix + (last ? '   ' : '│  '), i === kids.length - 1, false));
    })(t, '', true, true);
    return lines.join('\n');
  };
  // Normalización de texto de gramáticas / reglas para comparar
  U.normRule = s => String(s).replace(/::=|-+>|→|=>/g, '→').replace(/\s+/g, ' ').replace(/\s*→\s*/, ' → ').trim();

  if (typeof module !== 'undefined') module.exports = U; else root.U = U;
})(typeof window !== 'undefined' ? window : globalThis);
