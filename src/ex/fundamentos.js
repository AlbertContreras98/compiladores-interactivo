// ===== Fundamentos: test de teoría, diagramas de Tombstone y clasificación de errores =====
(function () {
  const { h, div, btn, esc } = U;
  const VF = ['Verdadero', 'Falso'];
  // m: gen (visión general), lex, sin, sem (semántico y código intermedio), sint (síntesis, optimización e interpretados)
  const Q = [
    // ---------- Visión general ----------
    { m: 'gen', q: 'El orden de las fases de análisis de un compilador es:', o: ['Léxico → sintáctico → semántico', 'Sintáctico → léxico → semántico', 'Léxico → semántico → sintáctico', 'Semántico → sintáctico → léxico'], a: 0, e: 'El léxico agrupa caracteres en testigos; el sintáctico comprueba la estructura con esos testigos; el semántico comprueba el significado (tipos, declaraciones).' },
    { m: 'gen', q: 'El analizador semántico es la primera fase de un compilador.', o: VF, a: 1, e: 'Falso: la primera fase es el análisis léxico (pregunta de la PEC1).' },
    { m: 'gen', q: 'Los errores de compilación únicamente se detectan en la fase de análisis léxico.', o: VF, a: 1, e: 'Falso: cada fase detecta sus propios errores (léxicos, sintácticos, semánticos…).' },
    { m: 'gen', q: 'El bootstrapping es una técnica para obtener un compilador escrito en el mismo lenguaje que compila (autocompilable).', o: VF, a: 0, e: 'Verdadero: se parte de un compilador sencillo de arranque y se usa para compilar versiones cada vez más completas escritas en el propio lenguaje.' },
    { m: 'gen', q: '¿Qué es un compilador cruzado?', o: ['Un compilador que se ejecuta en una plataforma y genera código para otra distinta', 'Un compilador que traduce a un lenguaje intermedio y luego lo interpreta', 'Un compilador escrito en el mismo lenguaje que compila', 'Un compilador que se ejecuta y genera código para la misma plataforma'], a: 0, e: 'Cruzado (cross-compiler): se ejecuta en una máquina y genera código para otra. El que genera para la misma es un compilador nativo.' },
    { m: 'gen', q: '¿Qué es un compilador interpretativo?', o: ['Compila el fuente a un lenguaje intermedio libre de errores y luego ese intermedio se ejecuta con un intérprete', 'Un intérprete que también genera código máquina', 'Un compilador que se ejecuta dentro de un intérprete de comandos', 'Un compilador que se detiene en el primer error'], a: 0, e: 'Es lo que hace Java: compila a bytecode y la JVM lo interpreta. Así basta un intérprete por plataforma.' },
    { m: 'gen', q: '¿Qué hace la técnica del compilador enlazador?', o: ['Divide la traducción en dos partes: del fuente a código de bajo nivel, y después enlaza con subrutinas de biblioteca precompiladas', 'Junta dos compiladores en uno solo', 'Traduce dos lenguajes fuente a la vez', 'Compila y ejecuta en un solo paso'], a: 0, e: 'Primero se traduce a un código de más bajo nivel y después se enlaza con bibliotecas ya compiladas para obtener el código máquina.' },
    { m: 'gen', q: 'Un intérprete, a diferencia de un compilador…', o: ['Analiza y ejecuta el programa fuente sentencia a sentencia, sin generar un programa objeto', 'Genera siempre código máquina más rápido', 'Solo detecta errores léxicos', 'Necesita una tabla de símbolos para cada sentencia'], a: 0, e: 'El intérprete ejecuta directamente; el compilador traduce todo el programa a un programa objeto que se ejecuta después.' },
    { m: 'gen', q: '¿Qué fases forman el front-end (fases de análisis)?', o: ['Análisis léxico, sintáctico y semántico', 'Generación y optimización de código', 'Análisis léxico y generación de código', 'Solo el análisis sintáctico'], a: 0, e: 'El front-end depende del lenguaje fuente (análisis). El back-end (síntesis: generación y optimización de código) depende de la máquina objeto.' },
    { m: 'gen', q: '¿Qué ventaja tiene separar el compilador en front-end y back-end con un código intermedio?', o: ['Se puede reutilizar el front-end para varias máquinas y el back-end para varios lenguajes', 'El compilador ocupa menos memoria', 'Evita tener que hacer análisis semántico', 'Permite prescindir de la tabla de símbolos'], a: 0, e: 'Con un código intermedio común, para m lenguajes y n máquinas bastan m front-ends y n back-ends en lugar de m·n compiladores.' },
    { m: 'gen', q: 'En un diagrama de Tombstone (en T), un compilador se describe con tres lenguajes:', o: ['Lenguaje fuente, lenguaje objeto y lenguaje de implementación', 'Lenguaje fuente, máquina y programa', 'Entrada, salida y errores', 'Léxico, sintaxis y semántica'], a: 0, e: 'Brazos de la T: fuente → objeto; pie: lenguaje en el que está escrito (implementación).' },
    { m: 'gen', q: 'Para ejecutar un programa P escrito en lenguaje M directamente sobre una máquina, ¿qué debe cumplirse?', o: ['La máquina debe ser M', 'La máquina debe tener un compilador de M', 'P debe estar escrito en un lenguaje de alto nivel', 'Hace falta siempre un intérprete'], a: 0, e: 'Regla de unión: un programa en código M solo se ejecuta sobre la máquina M.' },
    // ---------- Léxico ----------
    { m: 'lex', q: 'La principal función del analizador léxico es proporcionar parejas testigo-atributo al analizador sintáctico.', o: VF, a: 0, e: 'Verdadero: agrupa los caracteres en lexemas y entrega testigos (tokens), con su atributo (p. ej. el valor o la entrada de la tabla de símbolos).' },
    { m: 'lex', q: 'En "x1 := 25;", el texto "25" es…', o: ['Un lexema que encaja con el patrón del testigo NÚMERO', 'Un testigo que encaja con el patrón del lexema NÚMERO', 'Un patrón', 'Un atributo sintetizado'], a: 0, e: 'Lexema = secuencia concreta de caracteres; testigo (token) = categoría; patrón = regla (normalmente una expresión regular) que describe los lexemas de un testigo.' },
    { m: 'lex', q: '¿Cuál de estas tareas NO es propia del analizador léxico?', o: ['Comprobar que los paréntesis están equilibrados', 'Eliminar espacios en blanco y comentarios', 'Reconocer palabras reservadas e identificadores', 'Llevar la cuenta de las líneas para los mensajes de error'], a: 0, e: 'Los paréntesis equilibrados son una propiedad de la estructura (lenguaje libre de contexto): la comprueba el sintáctico. Con expresiones regulares no se pueden contar paréntesis anidados.' },
    { m: 'lex', q: 'Una tabla de símbolos no ordenada es, en general, más eficiente que una ordenada.', o: VF, a: 1, e: 'Falso: las no ordenadas son menos eficientes en las búsquedas, aunque más fáciles de programar (PEC1).' },
    { m: 'lex', q: '¿Qué estructura de tabla de símbolos ofrece en promedio búsquedas casi en tiempo constante?', o: ['Tabla de dispersión (hash)', 'Lista no ordenada', 'Lista ordenada con búsqueda secuencial', 'Pila'], a: 0, e: 'Con una buena función de dispersión, la búsqueda e inserción son O(1) de media. Las colisiones se tratan, por ejemplo, con listas de desbordamiento.' },
    { m: 'lex', q: 'Cuando el analizador léxico encuentra un identificador, respecto a la tabla de símbolos…', o: ['Consulta si existe y, si no, crea una entrada nueva', 'Añade siempre una entrada nueva aunque exista', 'Comprueba su tipo', 'Calcula su dirección de memoria'], a: 0, e: 'Así lo describe la solución de la PEC1. El tipo lo consulta el semántico y la dirección la añade la generación de código.' },
    { m: 'lex', q: '¿Qué fase guarda en la tabla de símbolos la dirección de memoria de una variable?', o: ['La generación de código (intermedio u objeto)', 'El análisis léxico', 'El análisis sintáctico', 'Ninguna: la dirección no se guarda'], a: 0, e: 'Las fases de generación de código consultan la tabla y añaden información como la dirección de memoria.' },
    { m: 'lex', q: 'En JLex, si dos reglas reconocen un prefijo de la misma longitud máxima…', o: ['Gana la que aparece antes en el fichero', 'Gana la que aparece después', 'Se produce un error', 'Gana la expresión regular más corta'], a: 0, e: 'Primero se busca el emparejamiento más largo; en caso de empate gana la primera regla. Por eso las palabras reservadas van antes que el identificador.' },
    { m: 'lex', q: 'En JLex, una regla sin lista de estados <...> delante está activa…', o: ['En todos los estados léxicos', 'Solo en YYINITIAL', 'Solo en el último estado declarado', 'En ninguno hasta que se haga yybegin'], a: 0, e: 'Si quieres que una regla solo valga en el estado inicial, ponle <YYINITIAL> delante.' },
    { m: 'lex', q: 'En JLex, ¿cómo se escribe "exactamente cuatro dígitos"?', o: ['[0-9][0-9][0-9][0-9]', '[0-9]{4}', '[0-9]*4', '([0-9])^4'], a: 0, e: 'JLex no admite {n}: las llaves se usan para macros. Hay que repetir el patrón.' },
    { m: 'lex', q: '¿Qué directiva de JLex hace que el analizador no distinga mayúsculas de minúsculas?', o: ['%ignorecase', '%cup', '%line', '%nocase'], a: 0, e: '%ignorecase. Muy útil cuando el enunciado dice "el lenguaje no es sensible a mayúsculas ni minúsculas".' },
    { m: 'lex', q: '¿Qué hace la directiva %cup en JLex?', o: ['Prepara el analizador léxico para trabajar con CUP (devuelve objetos Symbol)', 'Genera el analizador sintáctico', 'Activa el contador de líneas', 'Ignora mayúsculas'], a: 0, e: 'Con %cup la función de análisis devuelve java_cup.runtime.Symbol y se integra con el parser de CUP.' },
    { m: 'lex', q: 'Escribir "wihle" en lugar de "while" en un programa produce…', o: ['Normalmente un error que se detecta en el sintáctico, porque "wihle" es un identificador válido', 'Siempre un error léxico', 'Un error semántico de tipos', 'Ningún error'], a: 0, e: 'Léxicamente "wihle" es un identificador correcto; el problema aparece cuando la estructura no encaja. El módulo lo lista como error de ortografía en palabras reservadas.' },
    { m: 'lex', q: '¿Qué técnica de recuperación de errores léxicos es la más sencilla?', o: ['Ignorar (eliminar) los caracteres inválidos hasta formar un testigo correcto', 'Reescribir el programa fuente', 'Detener siempre la compilación', 'Pedir al usuario el carácter correcto'], a: 0, e: 'Se descartan caracteres extraños. Corregir (insertar, reemplazar o permutar caracteres) es posible pero arriesgado.' },
    // ---------- Sintáctico ----------
    { m: 'sin', q: 'Una gramática con recursividad por la izquierda…', o: ['No puede ser LL(1)', 'Es siempre ambigua', 'No puede ser SLR(1)', 'No genera ningún lenguaje infinito'], a: 0, e: 'Un analizador descendente entraría en bucle. Las gramáticas ascendentes (SLR, LALR) sí admiten recursividad por la izquierda; de hecho la prefieren.' },
    { m: 'sin', q: 'Toda gramática LL(1)…', o: ['Es no ambigua', 'Es ambigua', 'Tiene recursividad por la izquierda', 'Tiene reglas ε'], a: 0, e: 'Las gramáticas LL(1) y LR(1) nunca son ambiguas.' },
    { m: 'sin', q: '¿Qué relación hay entre las gramáticas LL(1) y LR(1)?', o: ['Las LR(1) engloban a las LL(1)', 'Las LL(1) engloban a las LR(1)', 'Son conjuntos disjuntos', 'Son exactamente las mismas'], a: 0, e: 'Toda gramática LL(1) es LR(1), pero no al revés: el análisis ascendente es más potente.' },
    { m: 'sin', q: '¿Qué método de análisis ascendente usa CUP?', o: ['LALR(1)', 'SLR(1)', 'LL(1)', 'LR(0)'], a: 0, e: 'CUP (como Yacc/Bison) genera analizadores LALR(1): un compromiso entre la potencia de LR(1) y el tamaño de las tablas de SLR.' },
    { m: 'sin', q: 'En la tabla SLR(1), un elemento A → α • del estado Ix da lugar a…', o: ['Reducir por esa regla en las columnas de Siguientes(A)', 'Reducir por esa regla en todas las columnas', 'Desplazar en las columnas de Primeros(α)', 'Aceptar'], a: 0, e: 'Esa es justamente la diferencia entre LR(0) (reduciría en todas) y SLR(1) (solo en Siguientes(A)).' },
    { m: 'sin', q: 'En un conflicto desplazamiento/reducción, la solución habitual (la que adoptan Yacc y CUP por defecto) es…', o: ['Desplazar', 'Reducir', 'Dar error', 'Elegir la regla más larga'], a: 0, e: 'Así se resuelve, por ejemplo, el if-else colgante: el else se asocia al if más cercano. Aun así, CUP avisa del conflicto.' },
    { m: 'sin', q: 'El símbolo "error" de CUP sirve para…', o: ['Escribir producciones de recuperación de errores sintácticos', 'Marcar un terminal como obsoleto', 'Detener el análisis', 'Declarar errores léxicos'], a: 0, e: 'Por ejemplo, sentencia ::= error PUNTOYCOMA: ante un error, se descartan testigos hasta el punto y coma y se sigue analizando.' },
    { m: 'sin', q: 'La técnica de recuperación de errores más conocida en el análisis sintáctico es…', o: ['Los conjuntos de sincronización', 'La retroalimentación de testigos', 'La reescritura del programa', 'La factorización por la izquierda'], a: 0, e: 'Se descartan símbolos hasta encontrar uno del conjunto de sincronización (por ejemplo Siguientes(A)) y se continúa.' },
    { m: 'sin', q: 'Una gramática es ambigua si…', o: ['Alguna cadena tiene más de un árbol de derivación', 'Todas las cadenas tienen más de un árbol', 'Tiene reglas ε', 'Tiene recursividad por la izquierda'], a: 0, e: 'Basta con una cadena con dos árboles (o dos derivaciones por la izquierda) distintos.' },
    { m: 'sin', q: 'En una gramática de expresiones, la regla E → E + T hace que + sea…', o: ['Asociativo por la izquierda', 'Asociativo por la derecha', 'No asociativo', 'Más prioritario que *'], a: 0, e: 'La recursividad está a la izquierda del operador, así que el árbol crece hacia la izquierda: a+b+c = (a+b)+c.' },
    { m: 'sin', q: 'En CUP, la declaración "precedence left SUMA, RESTA;" escrita antes que "precedence left POR, DIV;"…', o: ['Da menos prioridad a SUMA y RESTA que a POR y DIV', 'Da más prioridad a SUMA y RESTA', 'Da la misma prioridad a los cuatro', 'Declara SUMA y RESTA como no terminales'], a: 0, e: 'En CUP, las líneas de precedence que aparecen más abajo tienen mayor prioridad.' },
    // ---------- Semántico y código intermedio ----------
    { m: 'sem', q: 'Un atributo sintetizado…', o: ['Se calcula a partir de los atributos de los hijos en el árbol', 'Se calcula a partir del padre y los hermanos', 'Solo existe en los terminales', 'Lo calcula el analizador léxico'], a: 0, e: 'Los sintetizados suben por el árbol (de hijos a padre). Los heredados bajan o van de lado (del padre o de los hermanos).' },
    { m: 'sem', q: 'Un atributo heredado…', o: ['Se calcula a partir de los atributos del padre o de los hermanos', 'Se calcula solo a partir de los hijos', 'No puede usarse en CUP', 'Es siempre el valor numérico de una expresión'], a: 0, e: 'Ejemplo típico: el tipo en una declaración "int a, b, c", que se transmite a cada identificador de la lista.' },
    { m: 'sem', q: 'Una gramática S-atribuida es aquella que…', o: ['Solo usa atributos sintetizados', 'Solo usa atributos heredados', 'No usa atributos', 'Usa atributos en los terminales'], a: 0, e: 'Las S-atribuidas se evalúan de forma natural en un análisis ascendente (como CUP): al reducir se calculan los atributos del lado izquierdo.' },
    { m: 'sem', q: '¿Cuál de estas comprobaciones es semántica?', o: ['Que una variable se haya declarado antes de usarse', 'Que haya un punto y coma al final', 'Que un identificador empiece por letra', 'Que los paréntesis estén equilibrados'], a: 0, e: 'Las comprobaciones dependientes del contexto (declaraciones, tipos, duplicados) son semánticas.' },
    { m: 'sem', q: 'En el código de tres direcciones, cada instrucción…', o: ['Tiene como mucho un operador y tres direcciones (dos operandos y un resultado)', 'Puede tener expresiones anidadas', 'Tiene siempre tres operandos', 'Solo admite saltos'], a: 0, e: 'Por eso a = b + c * d se descompone en t1 = c * d; t2 = b + t1; a = t2.' },
    { m: 'sem', q: '¿Qué diferencia hay entre cuádruplas y tercetos?', o: ['Los tercetos no usan temporales: se refieren al resultado por su número de instrucción', 'Las cuádruplas no tienen campo de resultado', 'Los tercetos tienen cuatro campos', 'No hay diferencia'], a: 0, e: 'Cuádrupla: (op, resultado, arg1, arg2). Terceto: (op, arg1, arg2) y el resultado se nombra por su posición, (n).' },
    { m: 'sem', q: '¿Por qué en la práctica se prefieren las cuádruplas a los tercetos?', o: ['Porque al optimizar se pueden mover instrucciones sin renumerar las referencias', 'Porque ocupan menos espacio', 'Porque no necesitan temporales', 'Porque son más fáciles de leer'], a: 0, e: 'En los tercetos, mover una instrucción obliga a cambiar todas las referencias (n) que apuntan a ella.' },
    { m: 'sem', q: 'La notación postfija de (a + b) * c es…', o: ['a b + c *', 'a + b c *', '* + a b c', 'a b c + *'], a: 0, e: 'En postfija el operador va detrás de sus operandos; los paréntesis desaparecen.' },
    { m: 'sem', q: 'Para evaluar una expresión en notación postfija se usa…', o: ['Una pila', 'Una cola', 'Una tabla de dispersión', 'Un árbol AVL'], a: 0, e: 'Se apilan los operandos; al encontrar un operador se desapilan sus operandos, se opera y se apila el resultado.' },
    { m: 'sem', q: 'En la cuádrupla de "t1 = 0 < x", según el ejemplo del módulo, se escribe…', o: ['(isbigger, t1, x, 0)', '(isbigger, t1, 0, x)', '(issmaller, x, 0, t1)', '(less, 0, x, t1)'], a: 0, e: '0 < x es lo mismo que x > 0: el módulo usa isbigger con los operandos intercambiados.' },
    { m: 'sem', q: 'En el código de tres direcciones de la PEC3, para llamar a f(a) y guardar el resultado en r se escribe…', o: ['push a / call f / r = $RET', 'r = f(a)', 'call f(a, r)', 'param r / call f / push a'], a: 0, e: 'Los parámetros se apilan con push antes del call y el valor devuelto se lee en $RET.' },
    // ---------- Síntesis, optimización, interpretados ----------
    { m: 'sint', q: 'Un bloque básico es…', o: ['Una secuencia de instrucciones con una sola entrada (la primera) y una sola salida (la última)', 'Cualquier bucle', 'Un procedimiento completo', 'Un conjunto de etiquetas'], a: 0, e: 'Dentro de un bloque básico no hay saltos que entren ni salgan por el medio. Empieza en un líder.' },
    { m: 'sint', q: '¿Cuáles son líderes de bloque básico?', o: ['La primera instrucción, el destino de un salto y la instrucción que sigue a un salto', 'Solo las etiquetas', 'Todas las asignaciones', 'Solo la primera instrucción'], a: 0, e: 'Con esas tres reglas se parte el código en bloques básicos.' },
    { m: 'sint', q: 'La reducción de frecuencia consiste en…', o: ['Sacar fuera del bucle los cálculos que no cambian en cada iteración', 'Reducir el número de variables', 'Eliminar los bucles', 'Hacer los saltos más cortos'], a: 0, e: 'Es la optimización de código invariante en bucles: si un cálculo da siempre lo mismo, se hace una sola vez antes del bucle.' },
    { m: 'sint', q: 'El cálculo previo de constantes (constant folding) consiste en…', o: ['Evaluar en tiempo de compilación las operaciones cuyos operandos son constantes', 'Declarar todas las variables como constantes', 'Guardar las constantes en registros', 'Eliminar las constantes del código'], a: 0, e: 'Por ejemplo, val = 3.14159265 / 180.0 se sustituye por val = 0.0174532925.' },
    { m: 'sint', q: 'La propagación de copias consiste en…', o: ['Tras x = y, sustituir los usos posteriores de x por y mientras ninguna cambie', 'Copiar el código de los bucles', 'Duplicar variables', 'Sustituir y por x'], a: 0, e: 'Deja muchas copias x = y sin usar, que después elimina la eliminación de código muerto.' },
    { m: 'sint', q: 'Código muerto es…', o: ['Código cuyo resultado nunca se usa o que nunca se ejecuta', 'Código que da error', 'Código con bucles infinitos', 'Código comentado'], a: 0, e: 'Se elimina sin cambiar el comportamiento del programa. Ojo: las instrucciones con efectos (write, push, call, escrituras en memoria) no se eliminan.' },
    { m: 'sint', q: 'La eliminación de subexpresiones comunes consiste en…', o: ['No recalcular una expresión ya calculada si sus operandos no han cambiado', 'Eliminar paréntesis', 'Separar las expresiones en varias líneas', 'Eliminar operaciones repetidas en distintos programas'], a: 0, e: 'Si t1 = a * b y más abajo t5 = a * b sin que a ni b cambien, se puede escribir t5 = t1.' },
    { m: 'sint', q: 'La optimización de mirilla (peephole)…', o: ['Examina pequeñas ventanas de instrucciones consecutivas buscando patrones mejorables', 'Optimiza el programa entero de una vez', 'Solo se aplica a bucles', 'Elimina variables globales'], a: 0, e: 'Por ejemplo, eliminar un LOAD que sigue a un STORE de la misma variable, o saltos a saltos.' },
    { m: 'sint', q: 'La generación de código objeto…', o: ['Asigna memoria a cada nombre y traduce cada instrucción intermedia a instrucciones de la máquina', 'Comprueba los tipos', 'Construye la tabla LL(1)', 'Divide la entrada en testigos'], a: 0, e: 'Es la última fase; suele ir seguida de otra optimización porque la traducción directa produce cargas y descargas innecesarias.' },
    { m: 'sint', q: 'En la generación de código para una máquina con acumulador, z = x - y (resta, no conmutativa) se traduce como…', o: ['MOV AC, X ; SUB AC, Y ; (AC tiene z)', 'MOV AC, Y ; SUB AC, X', 'SUB X, Y', 'MOV Z, X - Y'], a: 0, e: 'Hay que cargar primero el minuendo en el acumulador. En operaciones conmutativas, si el acumulador ya tiene el segundo operando, se puede aprovechar.' },
    { m: 'sint', q: '¿Qué es un lenguaje interpretado?', o: ['Uno cuyos programas se ejecutan mediante un intérprete, sin traducción previa completa a código máquina', 'Uno que solo existe en papel', 'Uno sin gramática', 'Uno que siempre es más rápido que uno compilado'], a: 0, e: 'El intérprete analiza y ejecuta. Facilita la portabilidad y la depuración, a costa de velocidad.' }
  ];
  const MODS = { all: 'Todo el temario', gen: 'Visión general', lex: 'Análisis léxico y JLex', sin: 'Análisis sintáctico y CUP', sem: 'Semántica y código intermedio', sint: 'Síntesis y optimización' };

  App.register({
    id: 'theory', block: 'fund', title: 'Test de teoría', short: 'Preguntas de los módulos con explicación',
    intro: 'Cinco preguntas al azar del bloque elegido. Al corregir verás la explicación de cada una.',
    variants: Object.keys(MODS).map(k => ({ id: k, name: MODS[k] })), variantLabel: 'Bloque', levels: ['medium'],
    theory: '<p>Las preguntas salen de los módulos y de las PEC (incluidas las de verdadero/falso de la PEC1). Repite el test hasta que aciertes las cinco; las opciones cambian de orden cada vez.</p>',
    create(ctx) {
      const pool = Q.filter(q => ctx.variant === 'all' || !ctx.variant || q.m === ctx.variant);
      const qs = U.sample(pool, Math.min(5, pool.length)).map(q => {
        const perm = q.o === VF ? [0, 1] : U.shuffle(q.o.map((_, i) => i));
        return { q, perm, ch: U.choice(perm.map(i => q.o[i])) };
      });
      const exps = qs.map(() => div(''));
      return {
        body: h('div', null, ...qs.map((x, k) => h('div', { class: 'step' }, h('div', { class: 'stitle', html: (k + 1) + '. ' + x.q.q }), x.ch.el, exps[k]))),
        check() {
          let ok = 0;
          qs.forEach((x, k) => {
            const correct = x.perm.indexOf(x.q.a); x.ch.mark([correct]);
            const s = x.ch.selected(); const good = s.length === 1 && s[0] === correct; if (good) ok++;
            U.msg(exps[k], good ? 'ok' : 'bad', (good ? '✔ ' : '✘ ') + x.q.e);
          });
          return ok === qs.length ? { ok: true, html: '¡5 de 5!' } : { ok: false, html: ok + ' de ' + qs.length + ' correctas. Lee las explicaciones.' };
        }
      };
    }
  });

  // ===================== Clasificación de errores =====================
  const ERRS = [
    ['int x = 3 @ 4;', 0, 'El carácter @ no pertenece al alfabeto del lenguaje.'],
    ['printf("hola);', 0, 'La cadena no se cierra: el analizador léxico llega al final de la línea dentro de una cadena.'],
    ['float r = 2.12.1;', 0, 'Número mal formado (el módulo pone 2.12.1 como ejemplo de número inválido).'],
    ['int h\'24 = 0;', 0, 'Nombre de identificador con caracteres no válidos.'],
    ['/* comentario sin cerrar …  (fin del fichero)', 0, 'Se llega al final del fichero en medio de un componente léxico.'],
    ['long n = 99999999999999999999999;', 0, 'Constante demasiado grande: desbordamiento al convertir el lexema en número.'],
    ['x = a + * b;', 1, 'Todos los testigos son válidos, pero la secuencia "+ *" no encaja en la gramática de las expresiones.'],
    ['if (x > 3 { y = 1; }', 1, 'Paréntesis mal equilibrados.'],
    ['int a = 5', 1, 'Falta el punto y coma final.'],
    ['while x < 10) x++;', 1, 'Falta el paréntesis de apertura tras while.'],
    ['int = 5;', 1, 'Falta el identificador en la declaración.'],
    ['for (i = 0; i < 10) i++;', 1, 'El for necesita tres partes separadas por ;.'],
    ['y = z + 1;   // z no se ha declarado', 2, 'Variable no declarada: es una comprobación dependiente del contexto.'],
    ['int x = "hola";', 2, 'Incompatibilidad de tipos: se asigna una cadena a un entero.'],
    ['int a; float a;', 2, 'Declaración duplicada del mismo identificador en el mismo ámbito.'],
    ['suma(1, 2, 3);   // suma se declaró con dos parámetros', 2, 'Número de argumentos distinto del de la declaración.'],
    ['v[2.5] = 0;', 2, 'El índice de un vector debe ser entero.'],
    ['SERVER s1 { … }  SERVER s1 { … }   (PEC3)', 2, 'DUPLICATE_SERVER_DECLARATION: dos servidores con el mismo nombre. Es semántico: la sintaxis es correcta.'],
    ['CUSTOM COUNT=0;   (PEC3: el número debe ser > 0)', 2, 'La sintaxis es correcta; la restricción sobre el valor es semántica.'],
    ['x = a / b;   // durante la ejecución b vale 0', 3, 'La división por cero con valores que solo se conocen al ejecutar es un error de ejecución.'],
    ['v[i] = 1;   // con int v[10] e i = 25 al ejecutar', 3, 'Acceso fuera de rango que solo se ve al ejecutar.'],
    ['p->campo = 3;   // p vale NULL al ejecutar', 3, 'Desreferencia de un puntero nulo en tiempo de ejecución.']
  ];
  const ECLASS = ['Léxico', 'Sintáctico', 'Semántico', 'De ejecución'];
  App.register({
    id: 'errors', block: 'fund', title: 'Clasifica el error', short: 'Léxico, sintáctico, semántico o de ejecución',
    intro: 'Indica en qué fase se detecta cada error.', levels: ['medium'],
    theory: `<p>Cada fase detecta sus propios errores:</p><ul>
      <li><b>Léxico</b>: caracteres o lexemas que no encajan con ningún patrón: símbolos ajenos al lenguaje, números mal formados o demasiado grandes, cadenas o comentarios sin cerrar, identificadores con caracteres no permitidos.</li>
      <li><b>Sintáctico</b>: testigos correctos en un orden que la gramática no permite: paréntesis desequilibrados, falta de punto y coma, expresiones mal construidas.</li>
      <li><b>Semántico</b>: la estructura es correcta pero no tiene sentido en su contexto: variables no declaradas, tipos incompatibles, declaraciones duplicadas, número de parámetros.</li>
      <li><b>De ejecución</b>: solo aparecen al ejecutar el programa objeto: división por cero, accesos fuera de rango.</li></ul>
      <div class="tip">Pregúntate: ¿hace falta conocer el contexto (declaraciones, tipos)? → semántico. ¿Son válidos todos los testigos pero mal ordenados? → sintáctico. ¿Hay un lexema imposible? → léxico.</div>`,
    create() {
      const items = U.sample(ERRS, 5);
      const chs = items.map(() => U.choice(ECLASS));
      const exps = items.map(() => div(''));
      return {
        body: h('div', null, ...items.map((it, k) => h('div', { class: 'step' }, h('pre', { class: 'box' }, it[0]), chs[k].el, exps[k]))),
        check() {
          let ok = 0;
          items.forEach((it, k) => { chs[k].mark([it[1]]); const s = chs[k].selected(); const g = s[0] === it[1]; if (g) ok++; U.msg(exps[k], g ? 'ok' : 'bad', ECLASS[it[1]] + ': ' + it[2]); });
          return ok === items.length ? { ok: true, html: '¡Todos bien!' } : { ok: false, html: ok + ' de ' + items.length + '.' };
        }
      };
    }
  });

  // ===================== Diagramas de Tombstone =====================
  const LANGS = ['Pascal', 'C', 'C++', 'Java', 'Rust', 'Solidity', 'Go', 'Ada'];
  const MACH = ['x86', 'ARM', 'POWER', 'MIPS', 'RISC-V'];
  function tbox(kind, a) {
    // dibujo ASCII de una T / programa / máquina
    if (kind === 'C') return `┌──────────────────┐\n│ ${(a.src + ' → ' + a.tgt).padEnd(16)} │\n└──────┐    ┌──────┘\n       │${a.impl.padEnd(4).slice(0, 4)}│   (escrito en ${a.impl})\n       └────┘`;
    if (kind === 'P') return `  ┌──────┐\n  │ ${a.name.padEnd(4)} │\n  │${a.lang.padStart(5).padEnd(6)}│\n  └──────┘`;
    return '';
  }
  App.register({
    id: 'tombstone', block: 'fund', title: 'Diagramas de Tombstone', short: 'Compiladores, programas y máquinas en T',
    intro: 'Combina los diagramas y responde qué se obtiene. Un compilador se escribe <b>fuente → objeto (implementación)</b>.',
    levels: ['easy', 'medium', 'hard'],
    theory: `<h4>Diagramas básicos</h4><ul>
      <li><b>Programa</b> P escrito en el lenguaje L.</li>
      <li><b>Máquina</b> M: ejecuta programas escritos en su código máquina M.</li>
      <li><b>Compilador</b> (la T): traduce del lenguaje fuente L1 al objeto L2 y está escrito (implementado) en L3. Lo abreviamos <span class="mono">L1 → L2 (L3)</span>.</li>
      <li><b>Intérprete</b> de L escrito en M.</li></ul>
      <h4>Reglas de unión</h4><ul>
      <li>Un programa en M solo se ejecuta sobre la máquina M.</li>
      <li>Para compilar P escrito en L1 hace falta un compilador cuyo fuente sea L1; el compilador debe estar escrito en el lenguaje de la máquina donde se ejecuta; el resultado es P escrito en el lenguaje objeto L2.</li>
      <li>Un compilador también es un programa: si compilas el compilador <span class="mono">A → B (C)</span> con <span class="mono">C → M (M)</span> obtienes <span class="mono">A → B (M)</span>. Cambia <b>solo el lenguaje de implementación</b>.</li></ul>
      <h4>Técnicas</h4><ul>
      <li><b>Compilador cruzado</b>: se ejecuta en una máquina y genera código para otra, p. ej. <span class="mono">C → ARM (x86)</span>.</li>
      <li><b>Bootstrapping</b>: escribir el compilador de L en el propio L y compilarlo con una versión previa (de arranque).</li>
      <li><b>Compilador interpretativo</b>: compila a un código intermedio y lo ejecuta un intérprete (Java y la JVM).</li></ul>
      <div class="tip">Ejemplo de la PEC1: el código fuente de un compilador de Solidity escrito en C++, <span class="mono">Sol → POW (C++)</span>, compilado con <span class="mono">C++ → POW (POW)</span> da <span class="mono">Sol → POW (POW)</span>, que ya se puede ejecutar en POWER para compilar P1.</div>`,
    create(ctx) {
      const L = U.sample(LANGS, 3), M = U.sample(MACH, 2);
      let desc, ask, answer, explain;
      const sel = (opts) => { const s = h('select', null, h('option', { value: '' }, '—'), ...opts.map(o => h('option', { value: o }, o))); return s; };
      if (ctx.level === 'easy') {
        const P = 'P' + (1 + U.R(3));
        const valid = Math.random() < 0.75;
        const comp = { src: valid ? L[0] : L[1], tgt: M[0], impl: M[0] };
        desc = `Tenemos el programa <b>${P}</b> escrito en <b>${L[0]}</b> y el compilador <b class="mono">${comp.src} → ${comp.tgt} (${comp.impl})</b>, que ejecutamos sobre una máquina <b>${M[0]}</b>.`;
        const s = sel([...new Set([L[0], L[1], M[0], M[1], 'No se puede compilar'])]);
        ask = h('p', null, '¿En qué lenguaje queda el programa ' + P + ' tras compilarlo? ', s);
        answer = () => s.value === (valid ? M[0] : 'No se puede compilar');
        explain = valid ? `El compilador traduce de ${L[0]} a ${M[0]}: el resultado es ${P} escrito en ${M[0]}, ejecutable en la máquina ${M[0]}.` : `No: el compilador acepta ${L[1]} como fuente y el programa está escrito en ${L[0]}. Los lenguajes del punto de unión deben coincidir.`;
      } else if (ctx.level === 'medium') {
        const a = { src: L[0], tgt: M[1], impl: L[1] };
        const b = { src: L[1], tgt: M[0], impl: M[0] };
        desc = `Tenemos el código fuente de un compilador <b class="mono">${a.src} → ${a.tgt} (${a.impl})</b> y lo compilamos con <b class="mono">${b.src} → ${b.tgt} (${b.impl})</b> en una máquina ${M[0]}.`;
        const opts = [...new Set([L[0], L[1], M[0], M[1]])];
        const s1 = sel(opts), s2 = sel(opts), s3 = sel(opts);
        const cross = U.choice(['Es un compilador cruzado', 'Es un compilador nativo']);
        ask = h('div', null, h('p', null, 'Obtenemos el compilador: fuente ', s1, ' → objeto ', s2, ' escrito en ', s3), cross.el);
        answer = () => { cross.mark([0]); return s1.value === a.src && s2.value === a.tgt && s3.value === M[0] && cross.selected()[0] === 0; };
        explain = `Compilar un compilador solo cambia su lenguaje de implementación: ${a.src} → ${a.tgt} (${M[0]}). Se ejecuta en ${M[0]} y genera código para ${M[1]}, así que es <b>cruzado</b>.`;
      } else {
        // escenario tipo PEC1
        const src = L[0], host = M[0], target = M[1], impl = L[1];
        desc = `Queremos ejecutar el programa P escrito en <b>${src}</b> en una máquina <b>${target}</b>. Disponemos de: (1) un compilador <span class="mono">${src} → ${host} (${host})</span>; (2) un compilador <span class="mono">${impl} → ${target} (${host})</span>; (3) el código fuente de un compilador <span class="mono">${src} → ${target} (${impl})</span>; y de máquinas ${host} y ${target}.`;
        const opts = [...new Set([src, impl, host, target])];
        const s1 = sel(opts), s2 = sel(opts), s3 = sel(opts), s4 = sel(['(1)', '(2)', '(3)']), s5 = sel(opts);
        ask = h('div', null,
          h('p', null, 'Paso 1: compilo (3) con el compilador ', s4, ' y obtengo: ', s1, ' → ', s2, ' escrito en ', s3),
          h('p', null, 'Paso 2: compilo P con lo obtenido en el paso 1 (ejecutándolo en ' + host + '). P queda escrito en ', s5));
        answer = () => s4.value === '(2)' && s1.value === src && s2.value === target && s3.value === host && s5.value === target;
        explain = `(3) está escrito en ${impl}, así que se compila con (2), ${impl} → ${target} (${host}), en la máquina ${host}. Resultado: ${src} → ${target} (${host}), un compilador cruzado. Con él, en ${host}, P se traduce a ${target} y ya se ejecuta en la máquina ${target}. (El compilador (1) sirve para ejecutar P en ${host}, no en ${target}.)`;
      }
      return {
        statement: h('div', { html: '<p>' + desc + '</p>' }),
        body: ask,
        check() { return answer() ? { ok: true, html: '¡Correcto! ' + explain } : { ok: false, html: 'No es correcto. Repasa las reglas de unión (pestaña de teoría).' }; },
        solution() { return h('p', { html: explain }); }
      };
    }
  });
})();
