const { JSDOM } = require('/tmp/jsd/node_modules/jsdom');
const fs = require('fs');
const dom = new JSDOM(fs.readFileSync(__dirname + '/../dist/index.html', 'utf8'), { runScripts: 'dangerously', url: 'http://localhost/', beforeParse(w) { w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {}; w.confirm = () => true; } });
const w = dom.window;
const main = () => w.document.querySelector('main');
const btnT = t => [...main().querySelectorAll('button')].find(b => b.textContent === t);
async function run(id, opts, fill, reps = 8) {
  w.location.hash = '#/' + id; await new Promise(r => setTimeout(r, 5));
  let ok = 0; const fails = [];
  for (let k = 0; k < reps; k++) {
    const sels = [...main().querySelectorAll('.controls select')];
    for (const v of Object.values(opts)) { const s = sels.find(s => [...s.options].some(o => o.value === v)); if (s) s.value = v; }
    btnT('Generar').click();
    btnT('Ver solución') && btnT('Ver solución').click();
    const sols = [...main().querySelectorAll('.card')].pop();
    try { fill(sols); } catch (e) { fails.push('fill ' + e.message); continue; }
    btnT('Comprobar').click();
    const m = [...main().querySelectorAll('.msg:not(.warn)')].pop();
    if (m && m.classList.contains('ok')) ok++; else fails.push(m ? m.textContent.slice(0, 250) : 'sin msg');
  }
  console.log(id.padEnd(10), JSON.stringify(opts).padEnd(28), ok + '/' + reps, fails.slice(0, 2).join(' || '));
}
const firstPre = sol => sol.querySelector('pre').textContent;
const ta = () => main().querySelector('.card textarea');
const inp = () => [...main().querySelectorAll('.card input[type=text]')].pop();
w.addEventListener('load', async () => {
  for (const lv of ['easy', 'medium', 'hard', 'veryhard']) await run('tac', { lv }, sol => { ta().value = firstPre(sol); });
  for (const v of ['quads', 'triples', 'fromC']) await run('quads', { v, lv: 'hard' }, sol => { const p = [...sol.querySelectorAll('pre')].pop(); ta().value = p.textContent; });
  for (const v of ['fr', 'cf', 'cse', 'cp', 'dc']) await run('opt', { v }, sol => { ta().value = firstPre(sol).replace(/\s+<-- cambia/g, ''); });
  await run('optchain', {}, () => { for (let j = 0; j < 5; j++) { const b = [...main().querySelectorAll('.step:not(.done) button')].find(b => b.textContent === 'Mostrar este paso'); b.click(); } }, 5);
  for (const lv of ['medium', 'hard', 'veryhard']) await run('blocks', { lv }, sol => { inp().value = sol.querySelector('p').textContent.replace('Líderes: ', ''); });
  for (const v of ['to', 'eval']) await run('postfix', { v, lv: 'hard' }, sol => { inp().value = v === 'to' ? firstPre(sol) : [...sol.querySelectorAll('td')].slice(-1)[0].textContent; });
  for (const lv of ['easy', 'medium', 'hard', 'veryhard']) await run('jlexsim', { lv }, sol => { inp().value = sol.querySelector('p').textContent; });
  for (const lv of ['easy', 'medium', 'hard', 'veryhard']) await run('regex', { lv }, sol => { inp().value = firstPre(sol); });
  for (const v of ['lr', 'fact']) await run('transform', { v, lv: 'hard' }, sol => { ta().value = firstPre(sol); });
  for (const id of ['lltrace', 'lrtrace']) for (const lv of ['easy', 'hard']) await run(id, { lv }, sol => {
    btnT('Completar traza').click();
    const acts = [...sol.querySelectorAll('tbody tr')].map(r => r.lastChild.textContent);
    const acc = /aceptar/.test(acts[acts.length - 1]);
    main().querySelectorAll('.opts input')[acc ? 0 : 1].checked = true;
  }, 4);
  await run('ambig', { v: 'deriv', lv: 'hard' }, sol => { ta().value = firstPre(sol).replace(/⇒ /g, ''); });
  await run('ambig', { v: 'count', lv: 'medium' }, sol => { inp().value = parseInt(sol.querySelector('p').textContent); });
  await run('attrs', { v: 'eval' }, sol => { inp().value = sol.querySelector('p').textContent.replace('Resultado: ', ''); });
  process.exit(0);
});
