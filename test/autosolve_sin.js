// Rellena las respuestas correctas en la interfaz y comprueba que el corrector las da por buenas
const { JSDOM } = require('/tmp/jsd/node_modules/jsdom');
const fs = require('fs');
const G = require('../src/core/grammar.js');
const html = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', beforeParse(w) { w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {}; } });
const w = dom.window;
const setv = (el, v) => { el.value = v; };
function grammarFrom(main) {
  const pre = main.querySelector('.card pre.box');
  const lines = pre.textContent.split('\n').filter(l => !/^0\)/.test(l)).map(l => l.replace(/^\d+\)\s*/, ''));
  return G.parse(lines.join('\n'));
}
const S = s => [...s].map(x => x === ',' ? "','" : x).join(', ');
async function go(id, level, fill, reps = 6) {
  w.location.hash = '#/' + id; await new Promise(r => setTimeout(r, 5));
  const main = w.document.querySelector('main');
  let ok = 0, fail = [];
  for (let k = 0; k < reps; k++) {
    const ls = [...main.querySelectorAll('.controls select')].find(s => [...s.options].some(o => o.value === level)); if (ls) ls.value = level;
    [...main.querySelectorAll('.controls button')].find(b => b.textContent === 'Generar').click();
    const card = main.querySelectorAll('.card')[main.querySelectorAll('.card').length - (main.querySelector('.card h3') && main.lastChild.querySelector && main.lastChild.querySelector('h3') ? 2 : 1)];
    try { await fill(main); } catch (e) { fail.push('fill: ' + e.message); continue; }
    const cb = [...main.querySelectorAll('.btnrow button')].find(b => b.textContent === 'Comprobar'); cb.click();
    const m = [...main.querySelectorAll('.msg')].pop();
    if (m && m.classList.contains('ok')) ok++; else fail.push((m ? m.textContent : 'sin mensaje').slice(0, 300));
  }
  console.log(id.padEnd(12), level.padEnd(9), ok + '/' + reps, fail.slice(0, 2).join(' | '));
}
w.addEventListener('load', async () => {
  for (const lv of ['easy', 'medium', 'hard', 'veryhard']) {
    await go('firstfollow', lv, main => {
      const g = grammarFrom(main); const a = G.analyze(g);
      const ins = main.querySelectorAll('.setrow input');
      g.nts.forEach((A, k) => { setv(ins[k], S(a.F[A])); setv(ins[g.nts.length + k], S(a.S[A])); });
    });
    await go('ll1', lv, main => {
      const g = grammarFrom(main); const a = G.analyze(g);
      const ins = main.querySelectorAll('.setrow input');
      g.nts.forEach((A, k) => { setv(ins[k], S(a.F[A])); setv(ins[g.nts.length + k], S(a.S[A])); });
      g.rules.forEach((r, i) => setv(ins[2 * g.nts.length + i], S(a.P[i])));
      const t = main.querySelector('table.grid'); 
      g.nts.forEach((A, ri) => a.cols.forEach((c, ci) => { const inp = t.querySelector(`input[data-r="${ri}"][data-c="${ci}"]`); setv(inp, a.table[A][c].map(i => i % 2 ? String(i + 1) : G.ruleStr(g.rules[i])).join('/')); }));
      main.querySelectorAll('.opts input')[a.ll1 ? 0 : 1].checked = true;
    });
    await go('slr', lv, main => {
      const g = grammarFrom(main); const T = G.slr(g);
      const tables = main.querySelectorAll('table.grid');
      const order = [...g.ts, ...g.nts];
      T.states.forEach((_, s) => order.forEach((X, c) => { const t = T.trans.find(t => t.from === s && t.sym === X); setv(tables[0].querySelector(`input[data-r="${s}"][data-c="${c}"]`), t ? String(t.to) : ''); }));
      const ins = main.querySelectorAll('.setrow input'); g.nts.forEach((A, k) => setv(ins[k], S(T.S[A])));
      const ac = [...T.cols, ...g.nts];
      T.states.forEach((_, s) => ac.forEach((X, c) => { setv(tables[1].querySelector(`input[data-r="${s}"][data-c="${c}"]`), g.isNT(X) ? (T.goto[s][X] ?? '') + '' : T.action[s][X].slice().reverse().join(' / ').replace('OK', 'aceptar')); }));
      main.querySelectorAll('.opts input')[T.isSLR ? 0 : 1].checked = true;
    }, 4);
    await go('lr0', lv, async main => {
      const g = grammarFrom(main); const C = G.lr0(g);
      const steps = [{ s: 0 }, ...C.trans.map(t => t)];
      for (const st of steps) {
        const ta = main.querySelector('.step:not(.done) textarea');
        if (!ta) throw new Error('no textarea');
        if (st.from !== undefined && !st.isNew) ta.value = 'I' + st.to;
        else ta.value = C.states[st.s === 0 ? 0 : st.to].items.slice().reverse().map(it => G.itemStr(C.aug, it).replace('•', '.')).join('\n');
        [...ta.parentNode.querySelectorAll('button')].find(b => b.textContent === 'Comprobar paso').click();
      }
    }, 3);
  }
  process.exit(0);
});
