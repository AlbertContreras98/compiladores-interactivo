const C=require('../src/core/minic.js');const T=require('../src/core/tac.js');
let fails=0;
for(const lv of ['easy','medium','hard','veryhard'])for(let k=0;k<150;k++){
  const r=C.rng(k*7+lv.length);const g=C.generate(lv,r);
  let tac;
  try{tac=C.toTAC(C.parse(g.src));}catch(e){console.log('PARSE',e.message,'\n'+g.src);fails++;continue}
  const res=C.checkTAC(g.src,tac,{seed:k+1});
  if(!res.ok){fails++;console.log(lv,res.msg,'\n'+g.src+'\n---\n'+tac);break}
}
console.log('fails',fails);
const g=C.generate('hard',C.rng(3));console.log(g.src);console.log(C.toTAC(C.parse(g.src)));
// wrong answer detection
const src='a = b + c * 2;\nwrite(a);';
console.log(C.checkTAC(src,'t1 = c * 2\nt2 = b + t1\na = t2\nwrite a').ok, C.checkTAC(src,'t1 = b + c\nt2 = t1 * 2\na = t2\nwrite a').msg);
// pointer style arrays
const s2='int v[3];\nfor (i = 0; i < 3; i++) {\n v[i] = i * 2;\n}';
console.log(C.checkTAC(s2,`i = 0
label L1
t1 = i < 3
if false t1 goto L2
t2 = i * 2
t3 = i * 4
t4 = v + t3
* t4 = t2
i = i + 1
goto L1
label L2
halt`).ok);
console.log(C.checkTAC(s2,`i = 0
label L1
t1 = i < 3
if false t1 goto L2
t2 = i * 2
t3 = i * 4
v[t3] = t2
i = i + 1
goto L1
label L2
halt`).ok);
