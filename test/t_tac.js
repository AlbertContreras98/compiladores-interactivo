const T=require('../src/core/tac.js');
const src=`read x
t1 = 0 < x
if false t1 goto L1
fact = 1
label L2
t2 = fact * x
fact = t2
t3 = x - 1
x = t3
t4 = x == 0
if false t4 goto L2
write fact
label L1
halt`;
const c=T.parse(src);
console.log(T.run(c,{},{input:[5]}).output);
console.log(T.toQuads(c).map(T.qStr).join('\n'));
console.log(T.toTriples(c).map(T.tStr).join('\n'));
console.log(T.blocks(c));
const pec=`val = 3.14159265 / 180.0
length = 100
tmp0 = castIntToDbl length
tmp1 = tmp0 * val
push tmp1
call cos
ret = $RET
i = 0
label WHILE
tmp2 = 100
tmp3 = i < tmp2
if false tmp3 goto END_WHILE
tmp4 = castIntToDbl i
tmp5 = val * tmp4
tmp6 = i * 4
tmp7 = values + tmp6
* tmp7 = tmp5
tmp8 = i + 1
i = tmp8
goto WHILE
label END_WHILE
halt`;
let p=T.parse(pec);
const r0=T.run(p,{},{arrays:{values:100},intMode:false});
let s1=T.frequencyReduction(p);console.log('--FR\n'+T.changedText(s1));
let s2=T.constantFolding(s1,{intMode:false});console.log('--CF\n'+T.changedText(s2));
let s3=T.cse(s2);let s4=T.copyPropagation(s3);console.log('--CP\n'+T.changedText(s4));
let s5=T.deadCode(s4,['ret']);console.log('--DC\n'+T.fmtAll(s5));
const r5=T.run(s5,{},{arrays:{values:100},intMode:false});
console.log(r0.arrays.values.slice(0,4), r5.arrays.values.slice(0,4), r0.env.ret,r5.env.ret);
try{T.parse('x = a + b * c')}catch(e){console.log(e.message)}
console.log(T.canonQuad(['issmaller','t1','0','x'])===T.canonQuad(['isbigger','t1','x','0']));
