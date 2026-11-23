// Comprueba que las soluciones de referencia pasan sus propios correctores (patrones CUP y examen)
const { JSDOM } = require('/tmp/jsd/node_modules/jsdom');
const fs = require('fs');
const dom = new JSDOM(fs.readFileSync(__dirname + '/../dist/index.html', 'utf8'), { runScripts: 'dangerously', url: 'http://localhost/', beforeParse(w) { w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {}; w.confirm = () => true; } });
const w = dom.window;
w.addEventListener('load', async () => {
  const main = () => w.document.querySelector('main');
  const gen = () => [...main().querySelectorAll('.controls button')].find(b => b.textContent === 'Generar').click();
  const lastMsg = () => [...main().querySelectorAll('.msg')].pop();
  // examen: rellenar con la solución
  w.location.hash = '#/exam'; await new Promise(r => setTimeout(r, 5));
  for (const L of w.LANGS) {
    const sel = [...main().querySelectorAll('.controls select')][0]; sel.value = L.id; gen();
    const tas = main().querySelectorAll('textarea');
    tas[0].value = L.jlex; tas[1].value = w.SKEL_CUP + L.cup;
    [...main().querySelectorAll('.btnrow button')].find(b => b.textContent === 'Comprobar').click();
    const m = [...main().querySelectorAll('.msg')];
    console.log('exam', L.id.padEnd(11), m.map(x => x.className.split(' ')[1]).join(','), m.filter(x => !x.classList.contains('ok')).map(x => x.textContent.slice(0, 200)).join(' | '));
    // y una respuesta incorrecta típica: lista de paradas con ε en la propia lista
  }
  // errores típicos que deben detectarse
  const L = w.LANGS[1];
  let sel = [...main().querySelectorAll('.controls select')][0]; sel.value = L.id; gen();
  let tas = main().querySelectorAll('textarea');
  tas[1].value = L.cup.replace('opt_locations ::= location_list\n                | /* vacío */ ;', 'opt_locations ::= location_list ;').replace("location_list ::= location_list COMMA LOCATION\n                | LOCATION ;", "location_list ::= location_list COMMA LOCATION | ;");
  tas[0].value = L.jlex.replace(/^"name".*\n/m, '').replace('"identifier"', '"name"         { return new Symbol(sym.NAME); }\n"identifier"').replace('{SERVER_ID}    { return new Symbol(sym.SERVER_ID, yytext()); }\n', '').replace('[A-Z][a-z]+', '{SERVER_ID}    { return new Symbol(sym.SERVER_ID, yytext()); }\n[A-Z][a-z]+');
  [...main().querySelectorAll('.btnrow button')].find(b => b.textContent === 'Comprobar').click();
  [...main().querySelectorAll('.msg')].forEach(x => console.log('  WRONG→', x.className, x.textContent.slice(0, 300).replace(/\s+/g, ' ')));
  // patrones
  w.location.hash = '#/cuppat'; await new Promise(r => setTimeout(r, 5));
  for (const lv of ['easy', 'medium', 'hard', 'veryhard']) for (let k = 0; k < 6; k++) {
    const ls = [...main().querySelectorAll('.controls select')].find(s => [...s.options].some(o => o.value === lv)); ls.value = lv; gen();
    [...main().querySelectorAll('.btnrow button')].find(b => b.textContent === 'Ver solución').click();
    const sol = [...main().querySelectorAll('.card pre.box')].pop().textContent;
    main().querySelector('textarea').value = sol;
    [...main().querySelectorAll('.btnrow button')].find(b => b.textContent === 'Comprobar').click();
    const m = lastMsg(); if (!m.classList.contains('ok')) console.log('cuppat', lv, 'FAIL', m.textContent.slice(0, 200), '\n', sol);
  }
  console.log('cuppat done');
  process.exit(0);
});
