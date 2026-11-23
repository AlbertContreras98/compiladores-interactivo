const G=require('../src/core/grammar.js');
const show=t=>{for(const k in t)console.log(k,[...t[k]].join(','))};
// Ejemplo E→E+T
let g=G.parse(`E -> E + T | T
T -> T * F | F
F -> ( E ) | id`);
let t=G.slr(g);
console.log('states',t.states.length, t.trans.filter(x=>x.isNew).map(x=>`I${x.to}=Ir_a(I${x.from},${x.sym})`).join(' '));
console.log('isSLR',t.isSLR);
t.action.forEach((r,s)=>console.log(s, t.cols.map(a=>r[a].join('/')||'.').join('\t'), g.nts.map(A=>t.goto[s][A]??'.').join(' ')));
// A→B[C]
g=G.parse(`A -> B [ C ]
B -> d | e
C -> C + B | B`);
t=G.slr(g);show(t.S);
t.action.forEach((r,s)=>console.log(s, t.cols.map(a=>r[a].join('/')||'.').join('\t'), g.nts.map(A=>t.goto[s][A]??'.').join(' ')));
g=G.parse(`A -> B
B -> x B c B | x B | d`);
t=G.slr(g);console.log(t.conflicts);
t.action.forEach((r,s)=>console.log(s, t.cols.map(a=>r[a].join('/')||'.').join('\t'), g.nts.map(A=>t.goto[s][A]??'.').join(' ')));
// S→L=R  clásico no SLR
g=G.parse(`S -> L = R | R
L -> * R | id
R -> L`);
t=G.slr(g);console.log('SLR?',t.isSLR,t.conflicts);
let la=G.lalr(g);console.log('LALR conflicts',la.conflicts.length, la.states.length);
// LL
g=G.parse(`E -> T E'
E' -> + T E' | ε
T -> F T'
T' -> * F T' | ε
F -> ( E ) | id`);
let an=G.analyze(g);show(an.F);show(an.S);console.log(an.ll1);
console.log(G.parseLL(g,an,'id + id * id'.split(' ')).trace.map(r=>r.stack+' | '+r.input+' | '+r.action).join('\n'));
// LR elimination
g=G.parse(`E -> E + T | T
T -> T * F | F
F -> ( E ) | id`);
console.log(G.leftRecursion(g));
let e=G.eliminateDirectLR(g);console.log(G.toText(e));
console.log(G.compareLang(g,e,7).equal);
// ambiguity
g=G.parse(`E -> E + E | E * E | id`);
console.log(G.countTrees(g,'id + id * id'.split(' ')));
console.log(G.leftmostDerivation(G.oneTree(g,'id + id * id'.split(' '),1)));
// factor
g=G.parse(`S -> if E then S | if E then S else S | a
E -> b`);
console.log(G.toText(G.leftFactor(g)));
// parse with chunks
g=G.parse(`S -> (S)S | ε`);console.log(g.rules.map(G.ruleStr));
console.log(G.parseLR(G.slr(g), G.slr(g).aug, '( ) ( )'.split(' ')).ok);
