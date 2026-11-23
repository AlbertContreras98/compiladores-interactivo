const R=require('../src/core/regex.js');
const c=(s,o)=>R.compile(s,o);
const eq=(a,b,o)=>{const r=R.equivalent(c(a,o),c(b,o));console.log(a,'≡',b,'→',r.equal, r.example!==undefined?R.show(r.example)+(r.inA?' (solo 1ª)':' (solo 2ª)'):'')};
eq('[a-z]+','[a-z][a-z]*');
eq('(a|b)*abb','(a|b)*ab');
eq('[0-9]+("."[0-9]+)?','[0-9]+(\\.[0-9]+)?');
eq('[0-9]+(.[0-9]+)?','[0-9]+(\\.[0-9]+)?');
eq('[^a-z]','[A-Z]');
eq('"if"|"else"','if|else');
eq('{D}+','[0-9]+',{macros:{D:'[0-9]'}});
try{c('a{3}')}catch(e){console.log('ERR',e.message)}
try{c('(ab')}catch(e){console.log('ERR',e.message)}
console.log(c('a b').warnings);
console.log(R.matches(c('[a-zA-Z_][a-zA-Z0-9_]*'),'_x1'), R.matches(c('[a-zA-Z_][a-zA-Z0-9_]*'),'1x'));
console.log(R.longestPrefix(c('[0-9]+'),'123abc'));
console.log(R.samples(c('(0|1)*1'),6));
console.log(R.samples(c('"//"[^\\n]*'),4));
eq('[\\040-\\176]','[ -~]');
eq('IF','if',{ignoreCase:true});
console.log(R.parse('[a-z]+ {return x;}',{inRule:true}).rest);
