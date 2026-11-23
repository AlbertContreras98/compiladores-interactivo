// Verifica el banco de lenguajes: JLex de referencia sin errores, CUP sin conflictos, ejemplos aceptados e inválidos rechazados
global.window = undefined;
const X = require('../src/core/tools.js');
const G = require('../src/core/grammar.js');
require('../src/data/lenguajes.js');
const LANGS = globalThis.LANGS;
for (const L of LANGS) {
  const P = X.parseJLex(L.jlex);
  if (P.errors.length) { console.log(L.id, 'JLEX ERR', P.errors); continue; }
  const A = X.analyzeCUP(L.cup);
  if (!A.ok) { console.log(L.id, 'CUP', A.errors, A.conflicts); continue; }
  const toks = t => X.runJLex(P, t);
  let msg = [];
  // tokens declarados = tokens usados
  const used = new Set();
  L.samples.forEach((s, k) => { const r = toks(s); r.tokens.forEach(t => used.add(t.token)); if (r.lexErrors.length) msg.push('sample' + k + ' lexErr ' + r.lexErrors); const pr = X.parseTokens(A, r.tokens.map(t => t.token)); if (!pr.ok) msg.push('sample' + k + ' REJECTED ' + pr.trace.slice(-1)[0].input.slice(0, 80)); });
  L.invalid.forEach(([s, why], k) => { const r = toks(s); const pr = X.parseTokens(A, r.tokens.map(t => t.token)); if (pr.ok && !r.lexErrors.length) msg.push('invalid' + k + ' ACCEPTED: ' + why); });
  const decl = Object.keys(L.tokens);
  const missing = decl.filter(t => !A.P.terms.includes(t)); if (missing.length) msg.push('tokens no declarados en CUP: ' + missing);
  const extra = A.P.terms.filter(t => !decl.includes(t)); if (extra.length) msg.push('terminales CUP no listados: ' + extra);
  const lexToks = new Set(P.rules.filter(r => r.token).map(r => r.token)); const nolex = decl.filter(t => !lexToks.has(t)); if (nolex.length) msg.push('tokens sin regla JLex: ' + nolex);
  // sondas
  const pr = L.probes.map(p => toks(p).trace.map(t => (P.rules[t.rule].token || (P.rules[t.rule].isError ? 'ERR' : '·')) + '«' + t.text.replace(/\n/g, '\\n') + '»').filter(s => !s.startsWith('·')).join(' '));
  // frases aleatorias
  const sents = X.randomSentences(A.P.g, 10);
  console.log(L.id.padEnd(11), 'states', A.tab.states.length, msg.length ? msg : 'OK', 'sents', sents.length, 'avgLen', (sents.reduce((s, x) => s + x.length, 0) / sents.length).toFixed(0));
  if (process.env.V) pr.forEach((x, k) => console.log('   probe', JSON.stringify(L.probes[k]), '→', x));
}
