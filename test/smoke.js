// Prueba de humo: cada ejercicio × nivel × variante se genera, se corrige vacío y muestra la solución sin errores
const { JSDOM } = require('/tmp/jsd/node_modules/jsdom');
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
const errors = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true,
  beforeParse(w) { w.console.error = (...a) => errors.push(a.map(String).join(' ')); w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {}; w.prompt = () => null; w.alert = () => {}; } });
const w = dom.window;
const REPS = +(process.env.REPS || 3);
w.addEventListener('load', async () => {
  const App = w.App; const problems = [];
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const ex of App.EX) {
    if (only && !only.includes(ex.id)) continue;
    w.location.hash = '#/' + ex.id; await new Promise(r => setTimeout(r, 5));
    const main = w.document.querySelector('main');
    const sels = main.querySelectorAll('.controls select');
    const levels = ex.levels || Object.keys(App.LEVELS);
    const variants = ex.variants ? ex.variants.map(v => v.id) : [null];
    let n = 0; const t0 = Date.now();
    for (const v of variants) for (const lv of levels) for (let k = 0; k < REPS; k++) {
      if (ex.variants) { const vs = [...sels].find(s => [...s.options].some(o => o.value === v)); vs.value = v; }
      const ls = [...sels].find(s => [...s.options].some(o => o.value === lv)); if (ls) ls.value = lv;
      [...main.querySelectorAll('.controls button')].find(b => b.textContent === 'Generar').click();
      const bad = main.querySelector('.msg.bad');
      if (bad && /No se pudo crear/.test(bad.textContent)) { problems.push(ex.id + ' ' + v + ' ' + lv + ': ' + bad.textContent); continue; }
      const btns = [...main.querySelectorAll('.btnrow button')];
      const cb = btns.find(b => b.textContent === 'Comprobar'); if (cb) cb.click();
      const sb = btns.find(b => b.textContent === 'Ver solución'); if (sb) sb.click();
      const err = [...main.querySelectorAll('.msg.bad')].find(m => /Error al corregir/.test(m.textContent));
      if (err) problems.push(ex.id + ' ' + lv + ': ' + err.textContent);
      n++;
    }
    console.log(ex.id.padEnd(14), n, 'generados', (Date.now() - t0) + 'ms');
  }
  console.log('PROBLEMAS:', problems.length); problems.slice(0, 30).forEach(p => console.log(' -', p));
  console.log('console.error:', errors.length); errors.slice(0, 10).forEach(e => console.log(' -', e.slice(0, 300)));
  process.exit(0);
});
