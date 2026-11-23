// Comprueba que todas las ER del banco compilan y que las muestras se reconocen
const fs=require('fs');const R=require('../src/core/regex.js');
const src=fs.readFileSync(__dirname+'/../src/ex/lexico.js','utf8');
const bank=eval('('+src.slice(src.indexOf('const RX_BANK = ')+16, src.indexOf('};', src.indexOf('const RX_BANK = '))+1)+')');
let n=0;for(const lv in bank)for(const [d,re] of bank[lv]){n++;try{const c=R.compile(re);const s=R.samples(c,4,14);if(!s.length)console.log('NO SAMPLES',re);if(c.warnings.length)console.log('WARN',re,c.warnings)}catch(e){console.log('ERR',re,e.message)}}
console.log(n,'ER ok');
// pruebas de equivalencia con respuestas típicas de alumno
const eq=(a,b)=>R.equivalent(R.compile(a),R.compile(b));
console.log(eq('\\"[^\\n]*\\"','\\"[^\\"\\n]*\\"'));
console.log(eq('[A-Z][a-z]+(" "[a-z]+)*','[A-Z][a-z]*(" "[a-z]+)*'));
console.log(eq('[+-]?[0-9]+','("+"|"-")?[0-9]+'));
