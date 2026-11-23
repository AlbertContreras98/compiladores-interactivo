// ===== Semántica y código intermedio: notación postfija, gramáticas atribuidas, TAC, cuádruplas y tercetos =====
(function () {
  const { h, div, btn, esc } = U;

  // ===================== Notación postfija y máquina de pila =====================
  function randExpr(depth, vars) {
    if (depth <= 0 || Math.random() < 0.25) return { k: 'leaf', v: Math.random() < 0.6 ? U.pick(vars) : String(1 + U.R(9)) };
    return { k: 'op', op: U.pick(['+', '-', '*', '/', '+', '*']), a: randExpr(depth - 1, vars), b: randExpr(depth - 1, vars) };
  }
  const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 };
  function infix(e, parent, right) {
    if (e.k === 'leaf') return e.v;
    const s = infix(e.a, e.op, false) + ' ' + e.op + ' ' + infix(e.b, e.op, true);
    const need = parent && (PREC[parent] > PREC[e.op] || (right && PREC[parent] === PREC[e.op] && (parent === '-' || parent === '/' || true)));
    return need ? '(' + s + ')' : s;
  }
  const postfix = e => e.k === 'leaf' ? [e.v] : [...postfix(e.a), ...postfix(e.b), e.op];
  function evalPost(tokens, env) {
    const st = []; const trace = [];
    for (const t of tokens) {
      if (PREC[t]) { const b = st.pop(), a = st.pop(); const v = t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : a / b; st.push(v); trace.push([t, 'quitar ' + b + ', quitar ' + a + ', poner ' + v, st.join(' ')]); }
      else { const v = /^\d+$/.test(t) ? +t : env[t]; st.push(v); trace.push([t, 'poner ' + v, st.join(' ')]); }
    }
    return { v: st[0], trace };
  }
  App.register({
    id: 'postfix', block: 'sem', title: 'Notación postfija y pila', short: 'Pasar a postfija y evaluar con una pila',
    variants: [{ id: 'to', name: 'Pasar a postfija' }, { id: 'eval', name: 'Evaluar con la pila' }], variantLabel: 'Ejercicio', levels: ['easy', 'medium', 'hard'],
    theory: `<h4>Notación postfija (polaca inversa)</h4><p>El operador se escribe <b>detrás</b> de sus operandos: <span class="mono">a + b</span> → <span class="mono">a b +</span>. No necesita paréntesis porque el orden ya fija la estructura: es el recorrido en <b>postorden</b> del árbol sintáctico.</p>
      <p>Ejemplos: <span class="mono">(a + b) * c</span> → <span class="mono">a b + c *</span>; <span class="mono">a + b * c</span> → <span class="mono">a b c * +</span>; <span class="mono">a - b - c</span> → <span class="mono">a b - c -</span> (asociatividad por la izquierda).</p>
      <h4>Evaluación con una pila</h4><p>Se lee de izquierda a derecha: un operando se <b>pone</b> en la pila; un operador <b>quita</b> dos (primero el de la derecha), opera y pone el resultado. Al final queda un solo valor. Así funcionan las máquinas de pila (como la JVM).</p>
      <div class="tip">En las restas y divisiones el orden importa: si la pila es "… x y" y llega "-", el resultado es x − y.</div>`,
    create(ctx) {
      const depth = { easy: 2, medium: 3, hard: 4 }[ctx.level] || 3;
      const vars = ['a', 'b', 'c', 'd'];
      let e; do { e = randExpr(depth, vars); } while (postfix(e).length < 5);
      const pf = postfix(e);
      if (ctx.variant === 'eval') {
        const env = {}; for (const v of vars) env[v] = 1 + U.R(9);
        // evitar divisiones no exactas
        let r; let guard = 0;
        do { for (const v of vars) env[v] = 1 + U.R(9); r = evalPost(pf, env); } while ((!Number.isInteger(r.v) || r.trace.some(t => /\./.test(t[1]))) && guard++ < 200);
        if (!Number.isInteger(r.v)) { e = { k: 'op', op: '+', a: { k: 'leaf', v: 'a' }, b: { k: 'op', op: '*', a: { k: 'leaf', v: 'b' }, b: { k: 'leaf', v: 'c' } } }; }
        const pf2 = postfix(e); r = evalPost(pf2, env);
        const inp = U.input('', 'resultado'); inp.style.width = '120px';
        return {
          statement: h('p', { html: 'Evalúa con una pila la expresión postfija <b class="mono">' + esc(pf2.join(' ')) + '</b> con ' + vars.map(v => v + ' = ' + env[v]).join(', ') + '.' }),
          body: inp,
          check() { return +inp.value === r.v ? { ok: true, html: '¡Correcto! Vale ' + r.v + '.' } : { ok: false, html: 'No. Recuerda: con "x y −" el resultado es x − y.' }; },
          solution() { return U.table(r.trace.map((_, k) => String(k + 1)), ['Símbolo', 'Operación', 'Pila'], (a, b) => r.trace[a][b]); }
        };
      }
      const inp = U.input('', 'símbolos separados por espacios'); inp.style.width = '100%';
      return {
        statement: h('p', { html: 'Escribe en notación postfija: <b class="mono">' + esc(infix(e)) + '</b>' }),
        body: inp,
        check() {
          const got = inp.value.trim().replace(/([+\-*/()])/g, ' $1 ').split(/\s+/).filter(Boolean);
          if (got.join(' ') === pf.join(' ')) return { ok: true, html: '¡Correcto!' };
          if (got.includes('(')) return { ok: false, html: 'En postfija no hay paréntesis.' };
          let k = 0; while (k < got.length && got[k] === pf[k]) k++;
          return { ok: false, html: 'Bien hasta el símbolo ' + k + '. Recorre el árbol en postorden: hijo izquierdo, hijo derecho, operador.' };
        },
        solution() { return U.pre(pf.join(' ')); }
      };
    }
  });

  // ===================== Gramáticas atribuidas =====================
  const AG = [
    {
      name: 'Valor de un número binario', g: 'N → N B | B\nB → 0 | 1',
      rules: 'N₁ → N₂ B    N₁.v = 2·N₂.v + B.v\nN → B        N.v = B.v\nB → 0        B.v = 0\nB → 1        B.v = 1',
      gen: () => { let s = '1'; const n = 3 + U.R(4); for (let i = 1; i < n; i++) s += U.R(2); return s; },
      ask: s => 'valor de N.v para la cadena <b class="mono">' + s + '</b>', val: s => String(parseInt(s, 2)), kind: 'sintetizado'
    },
    {
      name: 'Contar a y b (módulo 4)', g: 'S → ( A )\nA → A , D | D\nD → a | b | ( A )',
      rules: 'S → ( A )      Muestra(A.a, A.b)\nA₁ → A₂ , D    A₁.a = A₂.a + D.a ;  A₁.b = A₂.b + D.b\nA → D          A.a = D.a ;  A.b = D.b\nD → a          D.a = 1 ;  D.b = 0\nD → b          D.a = 0 ;  D.b = 1\nD → ( A )      D.a = A.a ;  D.b = A.b',
      gen: () => { const items = []; const n = 3 + U.R(3); for (let i = 0; i < n; i++) items.push(Math.random() < 0.25 ? '( ' + U.pick(['a', 'b']) + ' , ' + U.pick(['a', 'b']) + ' )' : U.pick(['a', 'b'])); return '( ' + items.join(' , ') + ' )'; },
      ask: s => 'qué muestra (A.a, A.b) para <b class="mono">' + s + '</b> (escribe "a, b")', val: s => (s.match(/a/g) || []).length + ', ' + (s.match(/b/g) || []).length, kind: 'sintetizado'
    },
    {
      name: 'Profundidad de paréntesis', g: 'S → ( S ) S | ε',
      rules: 'S₁ → ( S₂ ) S₃    S₁.p = max(S₂.p + 1, S₃.p)\nS → ε             S.p = 0',
      gen: () => { const g = d => d <= 0 || Math.random() < 0.3 ? '' : '( ' + g(d - 1) + ') ' + g(d - 1); let s; do { s = g(4).trim(); } while (s.length < 6); return s; },
      ask: s => 'valor de S.p para <b class="mono">' + s + '</b>', val: s => { let d = 0, m = 0; for (const c of s) { if (c === '(') m = Math.max(m, ++d); if (c === ')') d--; } return String(m); }, kind: 'sintetizado'
    },
    {
      name: 'Valor de una expresión', g: 'E → E + T | T\nT → T * F | F\nF → ( E ) | num',
      rules: 'E₁ → E₂ + T   E₁.v = E₂.v + T.v\nE → T         E.v = T.v\nT₁ → T₂ * F   T₁.v = T₂.v · F.v\nT → F         T.v = F.v\nF → ( E )     F.v = E.v\nF → num       F.v = num.valor_léxico',
      gen: () => { const e = randExpr(3, ['2', '3', '4', '5']); const s = infix(e); return /\//.test(s) || /-/.test(s) ? '2 + 3 * 4' : s; },
      ask: s => 'valor de E.v para <b class="mono">' + s + '</b>', val: s => String(Function('return ' + s)()), kind: 'sintetizado'
    }
  ];
  const AKIND = [
    ['D → T L      L.tipo = T.tipo', 'heredado', 'L.tipo se calcula a partir de un hermano (T) para pasarlo hacia abajo a la lista de identificadores.'],
    ['L₁ → L₂ , id   L₂.tipo = L₁.tipo', 'heredado', 'L₂ recibe el valor del padre L₁.'],
    ['E₁ → E₂ + T    E₁.v = E₂.v + T.v', 'sintetizado', 'El padre se calcula a partir de los hijos.'],
    ['T → int        T.tipo = entero', 'sintetizado', 'Se fija en el propio nodo a partir de lo que deriva.'],
    ['F → num        F.v = num.valor', 'sintetizado', 'El valor sube desde el terminal.'],
    ['S → A B        B.ini = A.fin', 'heredado', 'B toma el valor de su hermano izquierdo.'],
    ['L → id         añadir(id.nombre, L.tipo)', 'heredado', 'L.tipo llega desde arriba; la acción lo usa.'],
    ['N₁ → N₂ B      N₁.v = 2·N₂.v + B.v', 'sintetizado', 'De hijos a padre.']
  ];
  App.register({
    id: 'attrs', block: 'sem', title: 'Gramáticas atribuidas', short: 'Atributos sintetizados y heredados; evaluar un árbol',
    variants: [{ id: 'eval', name: 'Calcula el atributo' }, { id: 'kind', name: '¿Sintetizado o heredado?' }], variantLabel: 'Ejercicio', levels: ['medium'],
    theory: `<h4>Gramática atribuida</h4><p>Es una gramática a la que se asocian <b>atributos</b> a los símbolos y <b>reglas semánticas</b> a las producciones, que dicen cómo se calculan. Se evalúan sobre el árbol de derivación ("árbol decorado").</p>
      <ul><li><b>Sintetizado</b>: el atributo del lado izquierdo se calcula con los atributos de los símbolos de la derecha (de los hijos). La información <b>sube</b>.</li>
      <li><b>Heredado</b>: el atributo de un símbolo de la parte derecha se calcula con atributos del padre o de sus hermanos. La información <b>baja</b> o va de lado (el tipo en <span class="mono">int a, b, c</span>).</li></ul>
      <p>Una gramática con solo sintetizados es <b>S-atribuida</b> y se evalúa durante un análisis ascendente: es lo que hace CUP con <span class="mono">RESULT</span> al reducir.</p>
      <div class="tip">Para calcular a mano: dibuja el árbol de la cadena y ve rellenando los atributos desde las hojas hacia la raíz.</div>`,
    create(ctx) {
      if (ctx.variant === 'kind') {
        const items = U.sample(AKIND, 4); const chs = items.map(() => U.choice(['Sintetizado', 'Heredado'])); const ex = items.map(() => div(''));
        return {
          body: h('div', null, h('p', null, '¿El atributo que se calcula en cada regla es sintetizado o heredado?'), ...items.map((it, k) => h('div', { class: 'step' }, U.pre(it[0]), chs[k].el, ex[k]))),
          check() { let ok = 0; items.forEach((it, k) => { const c = it[1] === 'sintetizado' ? 0 : 1; chs[k].mark([c]); const g = chs[k].selected()[0] === c; if (g) ok++; U.msg(ex[k], g ? 'ok' : 'bad', it[2]); }); return ok === items.length ? { ok: true, html: '¡Todo bien!' } : { ok: false, html: ok + ' de ' + items.length + '.' }; }
        };
      }
      const A = U.pick(AG); const s = A.gen(); const v = A.val(s);
      const inp = U.input('', 'valor'); inp.style.width = '160px';
      return {
        statement: h('div', null, h('p', null, h('b', null, A.name)), h('p', null, 'Gramática y reglas semánticas:'), U.pre(A.rules), h('p', { html: 'Calcula el ' + A.ask(s) + '.' })),
        body: inp,
        check() { const n = x => x.replace(/[()\s]/g, ''); return n(inp.value) === n(v) ? { ok: true, html: '¡Correcto! ' + v + '. Todos los atributos son sintetizados: se calculan de las hojas a la raíz.' } : { ok: false, html: 'No. Dibuja el árbol y calcula de abajo arriba.' }; },
        solution() { return h('p', null, 'Resultado: ' + v); }
      };
    }
  });

  // ===================== Código de tres direcciones desde C =====================
  const T_TAC = `
    <h4>Instrucciones del código de tres direcciones (módulo 4)</h4>
    <table class="grid"><tr><th class="left">Instrucción</th><th class="left">Forma</th></tr>
      <tr><td class="left">Operación binaria</td><td class="left mono">x = y op z   (op: + - * / % &lt; &gt; &lt;= &gt;= == != &amp;&amp; ||)</td></tr>
      <tr><td class="left">Operación unaria</td><td class="left mono">x = - y   ·   x = ! y   ·   x = castIntToDbl y</td></tr>
      <tr><td class="left">Copia</td><td class="left mono">x = y</td></tr>
      <tr><td class="left">Etiqueta / salto</td><td class="left mono">label L1   ·   goto L1</td></tr>
      <tr><td class="left">Salto condicional</td><td class="left mono">if false t goto L1</td></tr>
      <tr><td class="left">Vectores</td><td class="left mono">x = a[i]   ·   a[i] = x   (i en elementos)<br>o con punteros: t = i * 4 ; p = a + t ; * p = x</td></tr>
      <tr><td class="left">Entrada / salida / fin</td><td class="left mono">read x   ·   write x   ·   halt</td></tr>
      <tr><td class="left">Subrutinas (PEC3)</td><td class="left mono">push a ; push b ; call f ; r = $RET</td></tr></table>
    <h4>Esquemas de traducción</h4>
    <pre class="box">while (c) S          if (c) S1 else S2          for (i; c; p) S
label L1             t = c                      i
t = c                if false t goto L1         label L1
if false t goto L2   S1                         t = c
S                    goto L2                    if false t goto L2
goto L1              label L1                   S
label L2             S2                         p
                     label L2                   goto L1
                                                label L2
do S while (c)  →  label L1 ; S ; t = !c (o la comparación contraria) ; if false t goto L1</pre>
    <div class="tip">Cada instrucción hace <b>una sola operación</b>: <span class="mono">a = b + c * 2</span> → <span class="mono">t1 = c * 2 ; t2 = b + t1 ; a = t2</span>. Usa temporales nuevos (t1, t2…) y no olvides <span class="mono">halt</span> al final. La app ejecuta tu código con varios valores iniciales y comprueba que el resultado sea el del programa C.</div>`;
  App.register({
    id: 'tac', block: 'sem', exam: true, title: 'Código de tres direcciones', short: 'Traducir C a TAC sin optimizar',
    intro: 'Traduce el fragmento de C a código de tres direcciones <b>sin optimizar</b>. Las variables que no se inicializan son datos de entrada. <span class="mono">read(x)</span> y <span class="mono">write(e)</span> son las instrucciones read y write.',
    theory: T_TAC,
    custom: { label: 'Escribe un fragmento de C (int, vectores de tamaño fijo, if/else, while, for, do-while, read(x), write(e), llamadas a abs/max/min):', example: 'int a[5];\nfor (i = 0; i < 5; i++) {\n    if (i <= 2) {\n        a[i] = 10 * i;\n    }\n}', rows: 7 },
    create(ctx) {
      const src = ctx.custom || MiniC.generate(ctx.level).src;
      const ast = MiniC.parse(src);
      const refTac = MiniC.toTAC(ast);
      const ta = U.code('', 14, 't1 = …');
      return {
        statement: h('div', null, h('p', null, 'Código C:'), U.pre(src)),
        body: ta,
        check() {
          if (!ta.value.trim()) return { ok: false, html: 'Escribe el código de tres direcciones.' };
          const r = MiniC.checkTAC(src, ta.value, { seed: 1 + U.R(1e6) });
          if (!r.ok) return { ok: false, html: esc(r.msg) };
          const hasHalt = r.code.some(i => i.op === 'halt');
          return { ok: true, html: '¡Correcto! Tu código da los mismos resultados que el programa C con 8 entradas distintas.' + (hasHalt ? '' : ' (Te ha faltado <b>halt</b> al final, como en el módulo.)') };
        },
        solution() { return h('div', null, U.pre(refTac), h('p', { class: 'muted' }, 'Una traducción posible. Otros nombres de temporales y etiquetas, o el estilo de punteros (i * 4) para los vectores, también son válidos.'), h('details', null, h('summary', null, 'Y en cuádruplas'), U.pre(Tac.toQuads(Tac.parse(refTac)).map(Tac.qStr).join('\n')))); }
      };
    }
  });

  // ===================== Cuádruplas y tercetos =====================
  function quadsToTac(quads) {
    const lines = [];
    const REL = { '>': '>', '>=': '>=', '==': '==', '!=': '!=' };
    for (const q of quads) {
      const [c, r, a, b] = Tac.canonQuad(q).split(',');
      const ops = { add: '+', sub: '-', mult: '*', div: '/', mod: '%', and: '&&', or: '||' };
      if (ops[c]) lines.push(r + ' = ' + a + ' ' + ops[c] + ' ' + b);
      else if (REL[c]) lines.push(r + ' = ' + a + ' ' + REL[c] + ' ' + b);
      else if (c === 'assign') lines.push(r + ' = ' + a);
      else if (c === 'minus') lines.push(r + ' = - ' + a);
      else if (c === 'not') lines.push(r + ' = ! ' + a);
      else if (c === 'label') lines.push('label ' + r);
      else if (c === 'goto') lines.push('goto ' + r);
      else if (c === 'iffalse') lines.push('if false ' + r + ' goto ' + a);
      else if (c === 'if') lines.push('if ' + r + ' goto ' + a);
      else if (['read', 'write', 'push', 'halt'].includes(c)) lines.push(c === 'halt' ? 'halt' : c + ' ' + r);
      else if (c === 'call') lines.push('call ' + r);
      else if (c === 'idxget') lines.push(r + ' = ' + a + '[' + b + ']');
      else if (c === 'idxset') lines.push(r + '[' + a + '] = ' + b);
      else if (c === 'deref') lines.push(r + ' = * ' + a);
      else if (c === 'store') lines.push('* ' + r + ' = ' + a);
      else throw new Error('Operación de cuádrupla desconocida: ' + q[0]);
    }
    return lines.join('\n');
  }
  App.register({
    id: 'quads', block: 'sem', exam: true, title: 'Cuádruplas y tercetos', short: 'Del TAC (o del C) a cuádruplas y tercetos',
    variants: [{ id: 'quads', name: 'TAC → cuádruplas' }, { id: 'triples', name: 'TAC → tercetos' }, { id: 'fromC', name: 'C → cuádruplas (como el examen)' }], variantLabel: 'Ejercicio',
    theory: `<h4>Cuádruplas: (operación, resultado, arg1, arg2)</h4>
      <p>Nombres que usa el módulo 4: <span class="mono">add, sub, mult, div, assign, isbigger, isequal, is&lt;=, if false, label, goto, read, write, halt</span>. Los campos vacíos se escriben con <b>-</b>.</p>
      <pre class="box">read x               (read,x,-,-)
t1 = 0 &lt; x           (isbigger,t1,x,0)     ← 0 &lt; x es "x es mayor que 0"
if false t1 goto L1  (if false,t1,L1,-)
fact = 1             (assign,fact,1,-)
label L2             (label,L2,-,-)
t2 = fact * x        (mult,t2,fact,x)
t4 = x == 0          (isequal,t4,x,0)
write fact           (write,fact,-,-)
halt                 (halt,-,-,-)</pre>
      <p>La app también acepta <span class="mono">issmaller</span>, <span class="mono">is&lt;</span>, <span class="mono">is&gt;=</span>, <span class="mono">isdistinct</span>, <span class="mono">minus</span> (menos unario), <span class="mono">push</span>, <span class="mono">call</span>, y para vectores <span class="mono">(idxget,x,a,i)</span> y <span class="mono">(idxset,a,i,x)</span>.</p>
      <h4>Tercetos: (n) (operación, arg1, arg2)</h4>
      <p>No hay temporales: el resultado de una operación se nombra por su número, <span class="mono">(4)</span>. Si el resultado va a una variable del programa se añade un <span class="mono">assign</span>. Las etiquetas desaparecen y los saltos apuntan al número del terceto destino:</p>
      <pre class="box">(4) (mult,fact,x)
(5) (assign,fact,(4))
(9) (if false,(8),(4))</pre>
      <div class="tip">Una línea por cuádrupla o terceto. Para los tercetos, numera desde (0) como en el módulo.</div>`,
    create(ctx) {
      const g = MiniC.generate(ctx.level);
      const tacText = MiniC.toTAC(MiniC.parse(g.src));
      const code = Tac.parse(tacText);
      const quads = Tac.toQuads(code);
      const triples = Tac.toTriples(code);
      const v = ctx.variant || 'quads';
      const ta = U.code('', 14, v === 'triples' ? '(0) (op, arg1, arg2)' : '(op, res, arg1, arg2)');
      return {
        statement: h('div', null, v === 'fromC' ? h('div', null, h('p', null, 'Código C:'), U.pre(g.src), h('p', null, 'Escribe directamente las cuádruplas (sin optimizar).')) : h('div', null, h('p', null, 'Código de tres direcciones:'), U.pre(tacText), h('p', null, v === 'quads' ? 'Escríbelo en cuádruplas.' : 'Escríbelo en tercetos.'))),
        body: ta,
        check() {
          try {
            if (v === 'triples') {
              const got = Tac.parseTriples(ta.value);
              if (got.length !== triples.length) return { ok: false, html: 'Deberían salir ' + triples.length + ' tercetos y has escrito ' + got.length + '. ¿Has quitado las etiquetas? ¿Añades un assign cuando el resultado va a una variable del programa?' };
              for (let k = 0; k < got.length; k++) {
                if (got[k].n !== k) return { ok: false, html: 'Numera los tercetos seguidos desde (0); el ' + (k + 1) + 'º lleva el número (' + got[k].n + ').' };
                if (Tac.canonTriple(got[k].t) !== Tac.canonTriple(triples[k])) return { ok: false, html: 'El terceto (' + k + ') no es correcto.' };
              }
              return { ok: true, html: '¡Tercetos correctos!' };
            }
            const got = Tac.parseQuads(ta.value);
            if (v === 'quads') {
              if (got.length !== quads.length) return { ok: false, html: 'Hay una cuádrupla por instrucción de tres direcciones: deberían ser ' + quads.length + ' y has escrito ' + got.length + '.' };
              for (let k = 0; k < got.length; k++) if (Tac.canonQuad(got[k]) !== Tac.canonQuad(quads[k])) return { ok: false, html: 'La cuádrupla ' + (k + 1) + ' (de la instrucción <span class="mono">' + esc(Tac.fmt(code[k])) + '</span>) no es correcta. Recuerda el orden: (op, resultado, arg1, arg2).' };
              return { ok: true, html: '¡Cuádruplas correctas!' };
            }
            const tac = quadsToTac(got);
            const r = MiniC.checkTAC(g.src, tac, { seed: 7 });
            return r.ok ? { ok: true, html: '¡Correcto! Tus cuádruplas calculan lo mismo que el programa C.' } : { ok: false, html: 'Tus cuádruplas, leídas como código de tres direcciones, no hacen lo mismo que el C: ' + esc(r.msg) };
          } catch (e) { return { ok: false, html: esc(e.message) }; }
        },
        solution() { return v === 'triples' ? U.pre(triples.map(Tac.tStr).join('\n')) : h('div', null, v === 'fromC' ? U.pre(tacText) : null, U.pre(quads.map(Tac.qStr).join('\n'))); }
      };
    }
  });
})();
