const fs=require('fs');const X=require('../src/core/tools.js');
const base='/tmp/zips/3165304a-20261PAC2/20261PAC2/';
const lex=fs.readFileSync(base+'Lexer.lex','utf8');
const P=X.parseJLex(lex);console.log('errors',P.errors,'warn',P.warnings,'rules',P.rules.length);
const cupA=X.analyzeCUP(fs.readFileSync(base+'Parser.cup','utf8'));
console.log('cup errors',cupA.errors,'conflicts',cupA.conflicts&&cupA.conflicts.length, cupA.P.warnings);
for(const f of fs.readdirSync(base+'TestCases').filter(f=>f.endsWith('.q'))){
  const r=X.runJLex(P,fs.readFileSync(base+'TestCases/'+f,'utf8'));
  const toks=r.tokens.map(t=>t.token);
  const pr=X.parseTokens(cupA,toks);
  console.log(f,toks.length,'lexErr',r.lexErrors.length,'parse',pr.ok, pr.ok?'':pr.trace.slice(-2).map(x=>x.input.slice(0,60)+' '+x.action));
}
const lex1=fs.readFileSync('/tmp/zips/84a08f58-2026PAC1-Solution/2026PAC1-Solution/Lexer.lex','utf8');
const P1=X.parseJLex(lex1);console.log(P1.errors,P1.warnings);
const b1='/tmp/zips/84a08f58-2026PAC1-Solution/2026PAC1-Solution/TestCases/';
const r1=X.runJLex(P1,fs.readFileSync(b1+'Comments-Errors.q','utf8'));
console.log(r1.tokens.slice(0,15).map(t=>t.token+':'+t.text).join(' '), r1.lexErrors);
console.log(fs.readFileSync(b1+'Comments-Errors.test','utf8').slice(0,400));
