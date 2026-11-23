const G=require('../src/core/grammar.js');const GG=require('../src/core/gramgen.js');
for(const lv of ['easy','medium','hard','veryhard']){let t0=Date.now();const ns=[];let c=0;
 for(let k=0;k<30;k++){const g=GG.forLR(lv);const s=G.slr(g);ns.push(s.states.length);if(!s.isSLR)c++;}
 console.log('LR',lv,Date.now()-t0,'ms',ns.join(','),'conflicts',c);}
for(const lv of ['easy','medium','hard','veryhard']){let t0=Date.now();let c=0;
 for(let k=0;k<30;k++){const g=GG.forLL(lv);if(!G.analyze(g).ll1)c++;}
 console.log('LL',lv,Date.now()-t0,'ms notLL1',c);}
console.log(G.toText(GG.forLR('hard')));console.log(G.toText(GG.forLL('hard')));
for(let k=0;k<5;k++){const g=GG.forLeftRec('hard');console.log(G.toText(g).replace(/\n/g,' ; '))}
