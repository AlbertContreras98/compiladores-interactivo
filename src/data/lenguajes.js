// ===== Banco de lenguajes estilo examen (pregunta 2: JLex + CUP) =====
(function (root) {
  const SKEL_JLEX = String.raw`import java_cup.runtime.Symbol;
%%
%{
public int getLine(){
  return yyline;
}
%}
%cup
%line
`;
  const L = [];

  // ------------------------------------------------------------------ 1. Rutas de autocar (examen 09/01/2022)
  L.push({
    id: 'rutas', name: 'Rutas de autocar', from: 'Examen 09/01/2022',
    statement: `<p>Queremos implementar un analizador léxico y sintáctico que reconozca un lenguaje para definir <b>rutas de autocares</b>:</p><ol>
      <li>Dentro de un archivo pueden existir diversas rutas, pero <b>como mínimo una</b>. Cada ruta empieza por "{" y acaba con "}". Las rutas van separadas por "," (comas).</li>
      <li>Una ruta tiene 4 campos separados por comas: nombre de ruta, paradas, precio y descripción del autobús.</li>
      <li>El nombre empieza con la palabra <b>route</b> seguida de dos puntos y una cadena entre comillas.</li>
      <li>Las paradas empiezan con <b>stops</b> seguida de ":" y, entre corchetes [ ], los identificadores de parada separados por comas. La lista <b>no puede estar vacía</b>.</li>
      <li>Un identificador de parada empieza por una letra mayúscula seguida de una o más minúsculas (considera también vocales acentuadas y ñ, como en <i>Cáceres</i>).</li>
      <li>El precio empieza con <b>price</b> seguida de ":" y un entero sin signo. Es obligatorio.</li>
      <li>La descripción del autobús empieza con <b>transfer</b> seguida de ":" y "{". Tiene obligatoriamente dos campos, <b>en cualquier orden</b>, separados por comas: matrícula y número de pasajeros. Acaba con "}".</li>
      <li>La matrícula empieza con <b>license</b> seguida de ":" y la matrícula: <b>una letra mayúscula, 4 dígitos y 3 letras mayúsculas</b>.</li>
      <li>Los pasajeros empiezan con <b>passengers</b> seguida de ":" y un entero sin signo.</li>
      <li>Las cadenas empiezan y terminan con comillas dobles y no contienen saltos de línea (ni comillas).</li>
      <li>Los enteros pueden tener cualquier número de dígitos y no tienen signo.</li>
      <li>El lenguaje <b>no es sensible</b> a mayúsculas ni minúsculas.</li></ol>`,
    tokens: { LBRACE: '{', RBRACE: '}', LBRACKET: '[', RBRACKET: ']', COMMA: ',', COLON: ':', ROUTE: 'route', STOPS: 'stops', PRICE: 'price', TRANSFER: 'transfer', LICENSE: 'license', PASSENGERS: 'passengers', STRING: 'cadena', NUMBER: 'entero', STOP: 'identificador de parada', PLATE: 'matrícula' },
    samples: [String.raw`{
    route : "Route 1 Barcelona Madrid",
    stops : [ Barcelona, Tarragona, Cuenca, Madrid ],
    price : 80,
    transfer : {
        license: B1234ABC,
        passengers: 50
    }
},
{
    route : "Route 2 Madrid Lisboa",
    stops : [ Madrid, Cáceres, Badajoz, Lisboa ],
    price : 110,
    transfer : {
        passengers: 60,
        license: B9922ABC
    }
}`, String.raw`{ ROUTE: "Express, sin paradas", STOPS: [Girona], PRICE: 12, TRANSFER: { LICENSE: z0001zzz, PASSENGERS: 9 } }`],
    invalid: [
      [String.raw`{ route: "R", stops: [ ], price: 5, transfer: { license: A1111AAA, passengers: 3 } }`, 'La lista de paradas no puede estar vacía.'],
      [String.raw`{ route: "R", stops: [ Vic ], price: 5, transfer: { license: A1111AAA } }`, 'Faltan los pasajeros: transfer tiene dos campos obligatorios.'],
      [String.raw`{ route: "R", stops: [ Vic ], transfer: { license: A1111AAA, passengers: 3 }, price: 5 }`, 'Los cuatro campos de la ruta van en orden fijo.'],
      [String.raw`{ route: "R", stops: [ Vic ], price: 5, transfer: { license: A1111AAA, passengers: 3 } }
{ route: "S", stops: [ Vic ], price: 5, transfer: { license: A1111AAA, passengers: 3 } }`, 'Las rutas van separadas por comas.'],
      ['', 'Debe haber como mínimo una ruta.'],
      [String.raw`{ route: "R", stops: [ Vic, ], price: 5, transfer: { license: A1111AAA, passengers: 3 } }`, 'Coma sobrante al final de la lista.']
    ],
    probes: [String.raw`"a, b" "c"`, 'ROUTE Route route', 'B1234ABC b1234abc B123ABC', 'Cáceres Ab ab A', '00123 7', '#', String.raw`"sin cerrar
`],
    jlex: SKEL_JLEX + String.raw`%ignorecase

DIGIT = [0-9]
UPPER = [A-Z]
PLATE = {UPPER}{DIGIT}{DIGIT}{DIGIT}{DIGIT}{UPPER}{UPPER}{UPPER}
STOP  = [A-ZÁÉÍÓÚÑ][a-záéíóúüñ]+

%%

"route"        { return new Symbol(sym.ROUTE); }
"stops"        { return new Symbol(sym.STOPS); }
"price"        { return new Symbol(sym.PRICE); }
"transfer"     { return new Symbol(sym.TRANSFER); }
"license"      { return new Symbol(sym.LICENSE); }
"passengers"   { return new Symbol(sym.PASSENGERS); }
"{"            { return new Symbol(sym.LBRACE); }
"}"            { return new Symbol(sym.RBRACE); }
"["            { return new Symbol(sym.LBRACKET); }
"]"            { return new Symbol(sym.RBRACKET); }
","            { return new Symbol(sym.COMMA); }
":"            { return new Symbol(sym.COLON); }
\"[^\"\n]*\"   { return new Symbol(sym.STRING, yytext()); }
{DIGIT}+       { return new Symbol(sym.NUMBER, new Integer(yytext())); }
{PLATE}        { return new Symbol(sym.PLATE, yytext()); }
{STOP}         { return new Symbol(sym.STOP, yytext()); }
[ \t\r\n]+     { }
.              { System.err.println("Error léxico (línea " + (yyline+1) + "): " + yytext()); }`,
    cup: String.raw`terminal LBRACE, RBRACE, LBRACKET, RBRACKET, COMMA, COLON;
terminal ROUTE, STOPS, PRICE, TRANSFER, LICENSE, PASSENGERS;
terminal String STRING, STOP, PLATE;
terminal Integer NUMBER;

non terminal file, route_list, route, stop_list, transfer, transfer_fields, license, passengers;

file            ::= route_list ;
route_list      ::= route_list COMMA route
                  | route ;
route           ::= LBRACE ROUTE COLON STRING COMMA
                    STOPS COLON LBRACKET stop_list RBRACKET COMMA
                    PRICE COLON NUMBER COMMA
                    transfer RBRACE ;
stop_list       ::= stop_list COMMA STOP
                  | STOP ;
transfer        ::= TRANSFER COLON LBRACE transfer_fields RBRACE ;
transfer_fields ::= license COMMA passengers
                  | passengers COMMA license ;
license         ::= LICENSE COLON PLATE ;
passengers      ::= PASSENGERS COLON NUMBER ;`,
    notes: ['Con <b>%ignorecase</b>, "ROUTE" y "route" dan el mismo testigo; las palabras reservadas van antes que STOP para ganar el empate.', 'Para "dos campos en cualquier orden" basta con dos alternativas: <span class="mono">license COMMA passengers | passengers COMMA license</span>.', 'La matrícula no admite <span class="mono">{4}</span>: hay que repetir {DIGIT} cuatro veces.']
  });

  // ------------------------------------------------------------------ 2. Servidores (examen 15/01/2022)
  L.push({
    id: 'servidores', name: 'Servidores', from: 'Examen 15/01/2022',
    statement: `<p>Queremos implementar un analizador léxico y sintáctico que reconozca un lenguaje para definir <b>servidores</b>:</p><ol>
      <li>En un archivo puede haber <b>0 o varias</b> definiciones de servidor. Cada servidor empieza por "{" y acaba con "}". Los servidores van separados por comas.</li>
      <li>Un servidor tiene 5 campos separados por comas: nombre, tipo, localización, detalle e identificador (en este orden).</li>
      <li>El nombre empieza con <b>name</b> seguida de dos puntos y una cadena entre comillas.</li>
      <li>El tipo empieza con <b>type</b> seguida de dos puntos y uno de estos valores: <b>CX11</b>, <b>CX21</b> o <b>CX31</b>.</li>
      <li>La localización empieza con <b>locations</b> seguida de ":" y, entre corchetes [ ], las localizaciones separadas por comas. La lista <b>puede estar vacía</b>.</li>
      <li>Una localización empieza por una letra mayúscula seguida de una o más minúsculas.</li>
      <li>El detalle empieza con <b>detail</b> seguida de ":" y "{". Tiene obligatoriamente tres campos, <b>en cualquier orden</b>, separados por comas: <b>vCPU</b>, <b>RAM</b> y <b>SSD</b>, cada uno seguido de ":" y un entero. Acaba con "}".</li>
      <li>El identificador empieza con <b>identifier</b> seguida de ":" y el identificador: <b>cuatro dígitos seguidos de cuatro letras minúsculas</b>.</li>
      <li>Las cadenas empiezan y terminan con comillas dobles y no contienen saltos de línea (ni comillas).</li>
      <li>Los enteros pueden tener cualquier número de dígitos y no tienen signo.</li>
      <li>El lenguaje <b>es sensible</b> a mayúsculas y minúsculas.</li></ol>`,
    tokens: { LBRACE: '{', RBRACE: '}', LBRACKET: '[', RBRACKET: ']', COMMA: ',', COLON: ':', NAME: 'name', TYPE: 'type', LOCATIONS: 'locations', DETAIL: 'detail', IDENTIFIER: 'identifier', VCPU: 'vCPU', RAM: 'RAM', SSD: 'SSD', SERVER_TYPE: 'CX11 | CX21 | CX31', STRING: 'cadena', NUMBER: 'entero', LOCATION: 'localización', SERVER_ID: 'identificador de servidor' },
    samples: [String.raw`{
    name : "Server 1 memcached",
    type : CX11,
    locations : [ Barcelona, Madrid, Paris ],
    detail : {
        vCPU: 8,
        RAM: 16,
        SSD: 40
    },
    identifier: 1234qwer
},
{
    name : "Server 2 redis",
    type : CX11,
    locations : [ Barcelona, Madrid, Paris ],
    detail : {
        vCPU: 8,
        RAM: 16,
        SSD: 40
    },
    identifier: 5678asdf
}`, '', String.raw`{ name: "db", type: CX31, locations: [], detail: { SSD: 500, vCPU: 4, RAM: 32 }, identifier: 0001abcd }`],
    invalid: [
      [String.raw`{ name: "db", type: CX41, locations: [], detail: { SSD: 1, vCPU: 1, RAM: 1 }, identifier: 0001abcd }`, 'CX41 no es un tipo válido.'],
      [String.raw`{ name: "db", type: CX11, locations: [], detail: { SSD: 1, vCPU: 1 }, identifier: 0001abcd }`, 'Falta RAM: el detalle tiene tres campos obligatorios.'],
      [String.raw`{ name: "db", type: CX11, locations: [], detail: { SSD: 1, vCPU: 1, RAM: 1, SSD: 2 }, identifier: 0001abcd }`, 'Un campo repetido.'],
      [String.raw`{ name: "db", type: CX11, locations: [], detail: { SSD: 1, vCPU: 1, RAM: 1 } }`, 'Falta el identificador.'],
      [String.raw`{ type: CX11, name: "db", locations: [], detail: { SSD: 1, vCPU: 1, RAM: 1 }, identifier: 0001abcd }`, 'Los campos del servidor van en orden fijo.'],
      [String.raw`{ name: "db", type: CX11, locations: [ Vic ], detail: { SSD: 1, vCPU: 1, RAM: 1 }, identifier: 0001abcd },`, 'Coma sobrante tras el último servidor.']
    ],
    probes: ['1234qwer 1234 qwer 123qwer', 'CX11 cx11 CX21CX31', 'vCPU vcpu RAM Ram ram', String.raw`"a" "b, c"`, 'Barcelona barcelona B', '$'],
    jlex: SKEL_JLEX + String.raw`
DIGIT     = [0-9]
LOWER     = [a-z]
SERVER_ID = {DIGIT}{DIGIT}{DIGIT}{DIGIT}{LOWER}{LOWER}{LOWER}{LOWER}

%%

"name"         { return new Symbol(sym.NAME); }
"type"         { return new Symbol(sym.TYPE); }
"locations"    { return new Symbol(sym.LOCATIONS); }
"detail"       { return new Symbol(sym.DETAIL); }
"identifier"   { return new Symbol(sym.IDENTIFIER); }
"vCPU"         { return new Symbol(sym.VCPU); }
"RAM"          { return new Symbol(sym.RAM); }
"SSD"          { return new Symbol(sym.SSD); }
"CX11"|"CX21"|"CX31"  { return new Symbol(sym.SERVER_TYPE, yytext()); }
"{"            { return new Symbol(sym.LBRACE); }
"}"            { return new Symbol(sym.RBRACE); }
"["            { return new Symbol(sym.LBRACKET); }
"]"            { return new Symbol(sym.RBRACKET); }
","            { return new Symbol(sym.COMMA); }
":"            { return new Symbol(sym.COLON); }
\"[^\"\n]*\"   { return new Symbol(sym.STRING, yytext()); }
{SERVER_ID}    { return new Symbol(sym.SERVER_ID, yytext()); }
{DIGIT}+       { return new Symbol(sym.NUMBER, new Integer(yytext())); }
[A-Z][a-z]+    { return new Symbol(sym.LOCATION, yytext()); }
[ \t\r\n]+     { }
.              { System.err.println("Error léxico (línea " + (yyline+1) + "): " + yytext()); }`,
    cup: String.raw`terminal LBRACE, RBRACE, LBRACKET, RBRACKET, COMMA, COLON;
terminal NAME, TYPE, LOCATIONS, DETAIL, IDENTIFIER, VCPU, RAM, SSD;
terminal String STRING, SERVER_TYPE, LOCATION, SERVER_ID;
terminal Integer NUMBER;

non terminal file, server_list, server, opt_locations, location_list;
non terminal detail_fields, vcpu, ram, ssd;

file          ::= server_list
                | /* vacío */ ;
server_list   ::= server_list COMMA server
                | server ;
server        ::= LBRACE NAME COLON STRING COMMA
                  TYPE COLON SERVER_TYPE COMMA
                  LOCATIONS COLON LBRACKET opt_locations RBRACKET COMMA
                  DETAIL COLON LBRACE detail_fields RBRACE COMMA
                  IDENTIFIER COLON SERVER_ID RBRACE ;
opt_locations ::= location_list
                | /* vacío */ ;
location_list ::= location_list COMMA LOCATION
                | LOCATION ;
detail_fields ::= vcpu COMMA ram COMMA ssd | vcpu COMMA ssd COMMA ram
                | ram COMMA vcpu COMMA ssd | ram COMMA ssd COMMA vcpu
                | ssd COMMA vcpu COMMA ram | ssd COMMA ram COMMA vcpu ;
vcpu          ::= VCPU COLON NUMBER ;
ram           ::= RAM COLON NUMBER ;
ssd           ::= SSD COLON NUMBER ;`,
    notes: ['Tres campos en cualquier orden = 3! = 6 alternativas.', 'Lista que puede estar vacía: un no terminal opcional (<span class="mono">opt_locations ::= location_list | ;</span>). No pongas la ε dentro de la lista con comas, o aceptarías "[ , Vic ]".', '"1234qwer" lo reconoce SERVER_ID y no NUMBER porque es más largo (emparejamiento más largo).']
  });

  // ------------------------------------------------------------------ 3. Menús (examen 19/01/2022)
  L.push({
    id: 'menus', name: 'Menús de restaurante', from: 'Examen 19/01/2022',
    statement: `<p>Queremos implementar un analizador léxico y sintáctico que reconozca un lenguaje para definir <b>menús de restaurantes</b>:</p><ol>
      <li>En un archivo puede haber <b>0, 1 o varios</b> menús. Cada menú empieza por "(" y acaba con ")". Los menús van separados por comas.</li>
      <li>Un menú tiene 4 campos separados por comas, en este orden: identificador, nombre, precio y platos.</li>
      <li>El identificador empieza con <b>id</b> seguida de dos puntos y el identificador, que empieza siempre por <b>MENU</b> seguido de <b>4 dígitos</b>.</li>
      <li>El nombre empieza con <b>menu</b> seguida de dos puntos y una cadena entre comillas.</li>
      <li>El precio empieza con <b>price</b> seguida de dos puntos y un entero.</li>
      <li>Los platos empiezan con <b>dishes</b> seguida de ":" y "{". Contienen obligatoriamente tres campos, <b>en cualquier orden</b>, separados por comas: <b>incoming</b>, <b>main_dish</b> y <b>dessert</b>. Acaban con "}".</li>
      <li>Cada uno de los tres campos es la palabra reservada, ":" y entre corchetes [ ] las opciones separadas por comas. La lista <b>no puede estar vacía</b>.</li>
      <li>Una opción empieza por una letra mayúscula seguida de una o más minúsculas y <b>puede contener espacios</b> (palabras en minúsculas separadas por un espacio: <i>Fish and chips</i>).</li>
      <li>Las cadenas empiezan y terminan con comillas dobles y no contienen saltos de línea (ni comillas).</li>
      <li>Los enteros pueden tener cualquier número de dígitos y no tienen signo.</li>
      <li>El lenguaje <b>es sensible</b> a mayúsculas y minúsculas.</li></ol>`,
    tokens: { LPAREN: '(', RPAREN: ')', LBRACE: '{', RBRACE: '}', LBRACKET: '[', RBRACKET: ']', COMMA: ',', COLON: ':', KEY_ID: 'id', KEY_MENU: 'menu', PRICE: 'price', DISHES: 'dishes', INCOMING: 'incoming', MAIN_DISH: 'main_dish', DESSERT: 'dessert', MENU_ID: 'MENU + 4 dígitos', STRING: 'cadena', NUMBER: 'entero', DISH: 'plato u opción' },
    samples: [String.raw`(
    id: MENU1234,
    menu : "Restaurant 1",
    price : 15,
    dishes : {
        incoming: [ Salad, Rice, Pasta ],
        main_dish: [ Beef with potatoes, Chicken curry ],
        dessert: [ Custard, Apple, Orange ]
    }
),
(
    id: MENU5678,
    menu : "Restaurant 2",
    price : 17,
    dishes : {
        incoming: [ Salad, Rice, Pasta ],
        main_dish: [ Fish and chips, Chickpeas with tomato ],
        dessert: [ Apple, Orange ]
    }
)`, '', String.raw`(id: MENU0001, menu: "Mini", price: 9, dishes: { dessert: [Flan], main_dish: [Paella de marisco], incoming: [Soup] })`],
    invalid: [
      [String.raw`(id: MENU001, menu: "M", price: 9, dishes: { dessert: [Flan], main_dish: [Rice], incoming: [Soup] })`, 'MENU001 solo tiene 3 dígitos.'],
      [String.raw`(id: MENU0001, menu: "M", price: 9, dishes: { dessert: [], main_dish: [Rice], incoming: [Soup] })`, 'Las listas no pueden estar vacías.'],
      [String.raw`(id: MENU0001, menu: "M", price: 9, dishes: { main_dish: [Rice], incoming: [Soup] })`, 'Falta el postre.'],
      [String.raw`(menu: "M", id: MENU0001, price: 9, dishes: { dessert: [Flan], main_dish: [Rice], incoming: [Soup] })`, 'El identificador va antes que el nombre.'],
      [String.raw`(id: MENU0001, menu: "M", price: 9, dishes: { dessert: [Flan], main_dish: [Rice], incoming: [Soup] }) (id: MENU0002, menu: "N", price: 9, dishes: { dessert: [Flan], main_dish: [Rice], incoming: [Soup] })`, 'Los menús van separados por comas.']
    ],
    probes: ['MENU1234 MENU123 menu MENU', 'Fish and chips, Rice', 'Beef  with', 'Chicken Curry', 'main_dish main dessert', '@'],
    jlex: SKEL_JLEX + String.raw`
DIGIT   = [0-9]
MENU_ID = MENU{DIGIT}{DIGIT}{DIGIT}{DIGIT}
DISH    = [A-Z][a-z]+(" "[a-z]+)*

%%

"id"           { return new Symbol(sym.KEY_ID); }
"menu"         { return new Symbol(sym.KEY_MENU); }
"price"        { return new Symbol(sym.PRICE); }
"dishes"       { return new Symbol(sym.DISHES); }
"incoming"     { return new Symbol(sym.INCOMING); }
"main_dish"    { return new Symbol(sym.MAIN_DISH); }
"dessert"      { return new Symbol(sym.DESSERT); }
"("            { return new Symbol(sym.LPAREN); }
")"            { return new Symbol(sym.RPAREN); }
"{"            { return new Symbol(sym.LBRACE); }
"}"            { return new Symbol(sym.RBRACE); }
"["            { return new Symbol(sym.LBRACKET); }
"]"            { return new Symbol(sym.RBRACKET); }
","            { return new Symbol(sym.COMMA); }
":"            { return new Symbol(sym.COLON); }
\"[^\"\n]*\"   { return new Symbol(sym.STRING, yytext()); }
{MENU_ID}      { return new Symbol(sym.MENU_ID, yytext()); }
{DIGIT}+       { return new Symbol(sym.NUMBER, new Integer(yytext())); }
{DISH}         { return new Symbol(sym.DISH, yytext()); }
[ \t\r\n]+     { }
.              { System.err.println("Error léxico (línea " + (yyline+1) + "): " + yytext()); }`,
    cup: String.raw`terminal LPAREN, RPAREN, LBRACE, RBRACE, LBRACKET, RBRACKET, COMMA, COLON;
terminal KEY_ID, KEY_MENU, PRICE, DISHES, INCOMING, MAIN_DISH, DESSERT;
terminal String STRING, MENU_ID, DISH;
terminal Integer NUMBER;

non terminal file, menu_list, menu, dish_fields, incoming, main_dish, dessert, dish_list;

file        ::= menu_list
              | /* vacío */ ;
menu_list   ::= menu_list COMMA menu
              | menu ;
menu        ::= LPAREN KEY_ID COLON MENU_ID COMMA
                KEY_MENU COLON STRING COMMA
                PRICE COLON NUMBER COMMA
                DISHES COLON LBRACE dish_fields RBRACE RPAREN ;
dish_fields ::= incoming COMMA main_dish COMMA dessert | incoming COMMA dessert COMMA main_dish
              | main_dish COMMA incoming COMMA dessert | main_dish COMMA dessert COMMA incoming
              | dessert COMMA incoming COMMA main_dish | dessert COMMA main_dish COMMA incoming ;
incoming    ::= INCOMING COLON LBRACKET dish_list RBRACKET ;
main_dish   ::= MAIN_DISH COLON LBRACKET dish_list RBRACKET ;
dessert     ::= DESSERT COLON LBRACKET dish_list RBRACKET ;
dish_list   ::= dish_list COMMA DISH
              | DISH ;`,
    notes: ['Un plato con espacios se reconoce con <span class="mono">[A-Z][a-z]+(" "[a-z]+)*</span>: el espacio va <b>entre comillas</b>; uno suelto cortaría la expresión.', 'Los tres tipos de opción tienen la misma forma, así que basta un único testigo DISH.', '"MENU1234" lo reconoce MENU_ID y no DISH porque DISH exige minúsculas tras la mayúscula.']
  });

  // ------------------------------------------------------------------ 4. Biblioteca
  L.push({
    id: 'biblioteca', name: 'Catálogo de biblioteca', from: 'Nuevo, estilo examen',
    statement: `<p>Queremos un analizador léxico y sintáctico para un lenguaje de <b>catálogos de biblioteca</b>:</p><ol>
      <li>Un archivo contiene un único catálogo: la palabra <b>library</b>, su nombre (cadena) y, entre "{" y "}", <b>uno o más</b> libros (sin separador entre ellos).</li>
      <li>Cada libro empieza por <b>book</b>, su ISBN, ":" y, entre "{" y "}", sus campos. Cada campo es <span class="mono">clave = valor ;</span>.</li>
      <li>Los campos van en este orden: <b>title</b> (cadena), <b>authors</b> (lista de cadenas entre paréntesis separadas por comas, no vacía), <b>year</b> (entero), <b>available</b> (<b>true</b> o <b>false</b>) y, opcionalmente al final, <b>edition</b> (entero).</li>
      <li>El ISBN es <b>978</b> o <b>979</b>, un guion y <b>10 dígitos</b>. Ej.: 978-8491043456.</li>
      <li>Las cadenas van entre comillas dobles, sin saltos de línea ni comillas.</li>
      <li>Los enteros no tienen signo.</li>
      <li>El lenguaje <b>es sensible</b> a mayúsculas y minúsculas.</li></ol>`,
    tokens: { LIBRARY: 'library', BOOK: 'book', TITLE: 'title', AUTHORS: 'authors', YEAR: 'year', AVAILABLE: 'available', EDITION: 'edition', TRUE: 'true', FALSE: 'false', LBRACE: '{', RBRACE: '}', LPAREN: '(', RPAREN: ')', COLON: ':', SEMICOLON: ';', EQUALS: '=', COMMA: ',', STRING: 'cadena', NUMBER: 'entero', ISBN: 'ISBN' },
    samples: [String.raw`library "Biblioteca UOC" {
    book 978-8491043456 : {
        title = "Compiladores";
        authors = ("A. Aho", "M. Lam", "R. Sethi");
        year = 2008;
        available = true;
    }
    book 979-1234567890 : {
        title = "Lenguajes formales";
        authors = ("J. Hopcroft");
        year = 1979;
        available = false;
        edition = 3;
    }
}`, String.raw`library "Mini" { book 978-0000000001 : { title = "X"; authors = ("Yo"); year = 2026; available = true; edition = 12; } }`],
    invalid: [
      [String.raw`library "L" { }`, 'Debe haber al menos un libro.'],
      [String.raw`library "L" { book 978-0000000001 : { title = "X"; authors = (); year = 1; available = true; } }`, 'La lista de autores no puede estar vacía.'],
      [String.raw`library "L" { book 978-0000000001 : { title = "X"; authors = ("A"); year = 1; available = yes; } }`, 'available solo admite true o false.'],
      [String.raw`library "L" { book 978-0000000001 : { title = "X"; authors = ("A"); edition = 2; year = 1; available = true; } }`, 'edition, si aparece, va al final.'],
      [String.raw`library "L" { book 978-0000000001 : { title = "X"; authors = ("A"); year = 1; available = true } }`, 'Falta el ; final del último campo.'],
      [String.raw`library "L" { book 977-0000000001 : { title = "X"; authors = ("A"); year = 1; available = true; } }`, 'El ISBN debe empezar por 978 o 979.']
    ],
    probes: ['978-8491043456 978-849104345 979-12345678901', '978 - 1', String.raw`"a" , "b"`, 'true True TRUE', 'year2008', '?'],
    jlex: SKEL_JLEX + String.raw`
D    = [0-9]
ISBN = ("978"|"979")"-"{D}{D}{D}{D}{D}{D}{D}{D}{D}{D}

%%

"library"      { return new Symbol(sym.LIBRARY); }
"book"         { return new Symbol(sym.BOOK); }
"title"        { return new Symbol(sym.TITLE); }
"authors"      { return new Symbol(sym.AUTHORS); }
"year"         { return new Symbol(sym.YEAR); }
"available"    { return new Symbol(sym.AVAILABLE); }
"edition"      { return new Symbol(sym.EDITION); }
"true"         { return new Symbol(sym.TRUE); }
"false"        { return new Symbol(sym.FALSE); }
"{"            { return new Symbol(sym.LBRACE); }
"}"            { return new Symbol(sym.RBRACE); }
"("            { return new Symbol(sym.LPAREN); }
")"            { return new Symbol(sym.RPAREN); }
":"            { return new Symbol(sym.COLON); }
";"            { return new Symbol(sym.SEMICOLON); }
"="            { return new Symbol(sym.EQUALS); }
","            { return new Symbol(sym.COMMA); }
\"[^\"\n]*\"   { return new Symbol(sym.STRING, yytext()); }
{ISBN}         { return new Symbol(sym.ISBN, yytext()); }
{D}+           { return new Symbol(sym.NUMBER, new Integer(yytext())); }
[ \t\r\n]+     { }
.              { System.err.println("Error léxico (línea " + (yyline+1) + "): " + yytext()); }`,
    cup: String.raw`terminal LIBRARY, BOOK, TITLE, AUTHORS, YEAR, AVAILABLE, EDITION, TRUE, FALSE;
terminal LBRACE, RBRACE, LPAREN, RPAREN, COLON, SEMICOLON, EQUALS, COMMA;
terminal String STRING, ISBN;
terminal Integer NUMBER;

non terminal catalog, book_list, book, author_list, bool, opt_edition;

catalog     ::= LIBRARY STRING LBRACE book_list RBRACE ;
book_list   ::= book_list book
              | book ;
book        ::= BOOK ISBN COLON LBRACE
                TITLE EQUALS STRING SEMICOLON
                AUTHORS EQUALS LPAREN author_list RPAREN SEMICOLON
                YEAR EQUALS NUMBER SEMICOLON
                AVAILABLE EQUALS bool SEMICOLON
                opt_edition
                RBRACE ;
author_list ::= author_list COMMA STRING
              | STRING ;
bool        ::= TRUE | FALSE ;
opt_edition ::= EDITION EQUALS NUMBER SEMICOLON
              | /* vacío */ ;`,
    semantic: { rules: ['No puede haber dos libros con el mismo ISBN (DUPLICATED_ISBN).', 'El año no puede ser posterior a 2026 (INVALID_YEAR).', 'Un libro no puede tener el mismo autor dos veces (DUPLICATED_AUTHOR).'], code: String.raw`parser code {:
    static java.util.HashSet<String> isbns = new java.util.HashSet<String>();
    static java.util.HashSet<String> authors = new java.util.HashSet<String>();
    static void checkIsbn(String isbn) {
        if (!isbns.add(isbn)) System.err.println("DUPLICATED_ISBN " + isbn);
    }
    static void checkYear(int y) {
        if (y > 2026) System.err.println("INVALID_YEAR " + y);
    }
    static void addAuthor(String a) {
        if (!authors.add(a)) System.err.println("DUPLICATED_AUTHOR " + a);
    }
:}
...
book        ::= BOOK ISBN:i {: parser.checkIsbn(i); parser.authors.clear(); :} COLON LBRACE
                TITLE EQUALS STRING SEMICOLON
                AUTHORS EQUALS LPAREN author_list RPAREN SEMICOLON
                YEAR EQUALS NUMBER:y {: parser.checkYear(y.intValue()); :} SEMICOLON
                AVAILABLE EQUALS bool SEMICOLON opt_edition RBRACE ;
author_list ::= author_list COMMA STRING:a {: parser.addAuthor(a); :}
              | STRING:a {: parser.addAuthor(a); :} ;` },
    notes: ['"978-8491043456" se reconoce entero como ISBN (más largo que el NUMBER 978).', 'El año se reconoce como NUMBER: si hubiera un testigo YEAR de 4 dígitos, "1234" sería ambiguo con NUMBER. Las restricciones de valor se dejan al análisis semántico.', 'Campo opcional al final: <span class="mono">opt_edition ::= EDITION EQUALS NUMBER SEMICOLON | ;</span>.']
  });

  // ------------------------------------------------------------------ 5. Vuelos
  L.push({
    id: 'vuelos', name: 'Vuelos', from: 'Nuevo, estilo examen',
    statement: `<p>Queremos un analizador léxico y sintáctico para un lenguaje de <b>planificación de vuelos</b>:</p><ol>
      <li>Un archivo empieza por <b>flights</b>, ":" y, entre corchetes [ ], los vuelos separados por comas. La lista <b>puede estar vacía</b>.</li>
      <li>Cada vuelo va entre "{" y "}" y tiene cuatro campos separados por comas, en este orden: código, ruta, salida e información.</li>
      <li>El código es <b>code</b> ":" y un código de vuelo: <b>2 letras mayúsculas y 3 o 4 dígitos</b> (IB3456, VY123).</li>
      <li>La ruta es <b>route</b> ":" aeropuerto de origen, la flecha <b>-&gt;</b> y el aeropuerto de destino. Un aeropuerto son <b>3 letras mayúsculas</b> (BCN).</li>
      <li>La salida es <b>departure</b> ":" y una hora <b>hh:mm</b> (dos dígitos, dos puntos, dos dígitos).</li>
      <li>La información es <b>info</b> ":" "{" con dos campos <b>en cualquier orden</b> separados por coma: <b>gate</b> ":" puerta y <b>seats</b> ":" entero; y "}".</li>
      <li>Una puerta es una letra mayúscula seguida de 1 o 2 dígitos (A7, B12).</li>
      <li>El lenguaje <b>no es sensible</b> a mayúsculas y minúsculas.</li></ol>`,
    tokens: { FLIGHTS: 'flights', CODE: 'code', ROUTE: 'route', DEPARTURE: 'departure', INFO: 'info', GATE: 'gate', SEATS: 'seats', LBRACKET: '[', RBRACKET: ']', LBRACE: '{', RBRACE: '}', COMMA: ',', COLON: ':', ARROW: '->', FLIGHT_CODE: 'código de vuelo', AIRPORT: 'aeropuerto', TIME: 'hora', GATE_ID: 'puerta', NUMBER: 'entero' },
    samples: [String.raw`flights: [
    {
        code: IB3456,
        route: BCN -> MAD,
        departure: 07:45,
        info: { gate: A7, seats: 180 }
    },
    {
        code: VY123,
        route: BCN->LIS,
        departure: 21:05,
        info: { seats: 150, gate: B12 }
    }
]`, 'FLIGHTS: []', String.raw`flights: [{code: ux1000, route: pmi -> bcn, departure: 00:00, info: {GATE: c1, SEATS: 9}}]`],
    invalid: [
      [String.raw`flights: [ { code: IB12, route: BCN -> MAD, departure: 07:45, info: { gate: A7, seats: 1 } } ]`, 'IB12 solo tiene 2 dígitos.'],
      [String.raw`flights: [ { code: IB123, route: BCN MAD, departure: 07:45, info: { gate: A7, seats: 1 } } ]`, 'Falta la flecha -> en la ruta.'],
      [String.raw`flights: [ { code: IB123, route: BCN -> MAD, departure: 7:45, info: { gate: A7, seats: 1 } } ]`, 'La hora necesita dos dígitos: 07:45.'],
      [String.raw`flights: [ { code: IB123, route: BCN -> MAD, departure: 07:45, info: { gate: A7 } } ]`, 'Faltan los asientos.'],
      [String.raw`flights: { code: IB123, route: BCN -> MAD, departure: 07:45, info: { gate: A7, seats: 1 } }`, 'Los vuelos van entre corchetes.']
    ],
    probes: ['IB3456 ib345 IB34567 IB34', 'BCN bcn BC BCNX', '07:45 7:45 0745', 'A7 B12 C123', 'BCN->MAD', 'route Route ROUTE', '-'],
    jlex: SKEL_JLEX + String.raw`%ignorecase

D = [0-9]
U = [A-Z]

%%

"flights"      { return new Symbol(sym.FLIGHTS); }
"code"         { return new Symbol(sym.CODE); }
"route"        { return new Symbol(sym.ROUTE); }
"departure"    { return new Symbol(sym.DEPARTURE); }
"info"         { return new Symbol(sym.INFO); }
"gate"         { return new Symbol(sym.GATE); }
"seats"        { return new Symbol(sym.SEATS); }
"["            { return new Symbol(sym.LBRACKET); }
"]"            { return new Symbol(sym.RBRACKET); }
"{"            { return new Symbol(sym.LBRACE); }
"}"            { return new Symbol(sym.RBRACE); }
","            { return new Symbol(sym.COMMA); }
"->"           { return new Symbol(sym.ARROW); }
{D}{D}":"{D}{D}        { return new Symbol(sym.TIME, yytext()); }
":"            { return new Symbol(sym.COLON); }
{U}{U}{D}{D}{D}{D}?    { return new Symbol(sym.FLIGHT_CODE, yytext()); }
{U}{U}{U}              { return new Symbol(sym.AIRPORT, yytext()); }
{U}{D}{D}?             { return new Symbol(sym.GATE_ID, yytext()); }
{D}+           { return new Symbol(sym.NUMBER, new Integer(yytext())); }
[ \t\r\n]+     { }
.              { System.err.println("Error léxico (línea " + (yyline+1) + "): " + yytext()); }`,
    cup: String.raw`terminal FLIGHTS, CODE, ROUTE, DEPARTURE, INFO, GATE, SEATS;
terminal LBRACKET, RBRACKET, LBRACE, RBRACE, COMMA, COLON, ARROW;
terminal String FLIGHT_CODE, AIRPORT, TIME, GATE_ID;
terminal Integer NUMBER;

non terminal file, opt_flights, flight_list, flight, info_fields, gate, seats;

file        ::= FLIGHTS COLON LBRACKET opt_flights RBRACKET ;
opt_flights ::= flight_list
              | /* vacío */ ;
flight_list ::= flight_list COMMA flight
              | flight ;
flight      ::= LBRACE CODE COLON FLIGHT_CODE COMMA
                ROUTE COLON AIRPORT ARROW AIRPORT COMMA
                DEPARTURE COLON TIME COMMA
                INFO COLON LBRACE info_fields RBRACE
                RBRACE ;
info_fields ::= gate COMMA seats
              | seats COMMA gate ;
gate        ::= GATE COLON GATE_ID ;
seats       ::= SEATS COLON NUMBER ;`,
    semantic: { rules: ['El origen y el destino de un vuelo no pueden ser el mismo aeropuerto (SAME_AIRPORT).', 'La hora debe ser válida: horas 00-23 y minutos 00-59 (INVALID_TIME).', 'No puede haber dos vuelos con el mismo código (DUPLICATED_FLIGHT).'], code: String.raw`flight ::= LBRACE CODE COLON FLIGHT_CODE:c {: parser.checkCode(c); :} COMMA
           ROUTE COLON AIRPORT:o ARROW AIRPORT:d {: if (o.equalsIgnoreCase(d)) parser.error("SAME_AIRPORT"); :} COMMA
           DEPARTURE COLON TIME:t {: parser.checkTime(t); :} COMMA
           INFO COLON LBRACE info_fields RBRACE RBRACE ;
// en parser code:
static void checkTime(String t) {
    int h = Integer.parseInt(t.substring(0, 2)), m = Integer.parseInt(t.substring(3, 5));
    if (h > 23 || m > 59) error("INVALID_TIME");
}` },
    notes: ['La regla de TIME va <b>antes</b> que la de ":"; aunque daría igual por la regla del más largo, "07:45" tiene 5 caracteres y gana a "07".', 'Con %ignorecase, AIRPORT ([A-Z][A-Z][A-Z]) también reconoce "bcn"; ninguna palabra reservada tiene 3 letras, así que no hay empates.', 'Que la hora sea válida (23:59 máximo) no se comprueba en el léxico sino en el semántico.']
  });

  // ------------------------------------------------------------------ 6. Festivales
  L.push({
    id: 'festivales', name: 'Festivales de música', from: 'Nuevo, estilo examen',
    statement: `<p>Queremos un analizador léxico y sintáctico para un lenguaje de <b>festivales de música</b>:</p><ol>
      <li>Un archivo contiene <b>uno o más</b> festivales, uno detrás de otro, sin separador.</li>
      <li>Un festival es <b>FESTIVAL</b>, su nombre (cadena) y, entre "{" y "}": la fecha y el precio (<b>en cualquier orden</b>), <b>uno o más</b> escenarios y, opcionalmente al final, <b>SOLD_OUT;</b></li>
      <li>La fecha es <b>date</b> ":" una fecha <b>dd/mm/aaaa</b> y ";". El precio es <b>price</b> ":" un número real con <b>exactamente dos decimales</b> (45.50) y ";".</li>
      <li>Un escenario es <b>STAGE</b>, su nombre y, entre "{" y "}", los grupos (cadenas) separados por comas. La lista de grupos <b>puede estar vacía</b>.</li>
      <li>El nombre de un escenario empieza por una letra mayúscula seguida de letras o dígitos.</li>
      <li>Las cadenas van entre comillas dobles, sin saltos de línea ni comillas.</li>
      <li>El lenguaje <b>es sensible</b> a mayúsculas y minúsculas.</li></ol>`,
    tokens: { FESTIVAL: 'FESTIVAL', STAGE: 'STAGE', SOLD_OUT: 'SOLD_OUT', DATE_KW: 'date', PRICE: 'price', LBRACE: '{', RBRACE: '}', COLON: ':', SEMICOLON: ';', COMMA: ',', STRING: 'cadena', DATE: 'fecha', REAL: 'precio', STAGE_NAME: 'nombre de escenario' },
    samples: [String.raw`FESTIVAL "Primavera Sound" {
    date: 30/05/2026;
    price: 125.50;
    STAGE Principal { "Rosalia", "Arctic Monkeys" }
    STAGE Bosque2 { }
    SOLD_OUT;
}
FESTIVAL "Cruilla" {
    price: 89.00;
    date: 09/07/2026;
    STAGE Mar { "Bad Gyal" }
}`, String.raw`FESTIVAL "X" { date: 01/01/2000; price: 0.99; STAGE A { } STAGE B { "a", "b", "c" } }`],
    invalid: [
      [String.raw`FESTIVAL "X" { date: 01/01/2000; price: 10.5; STAGE A { } }`, 'El precio necesita exactamente dos decimales.'],
      [String.raw`FESTIVAL "X" { date: 01/01/2000; price: 10.50; }`, 'Debe haber al menos un escenario.'],
      [String.raw`FESTIVAL "X" { date: 01/01/2000; price: 10.50; SOLD_OUT; STAGE A { } }`, 'SOLD_OUT va al final.'],
      [String.raw`FESTIVAL "X" { date: 1/1/2000; price: 10.50; STAGE A { } }`, 'La fecha es dd/mm/aaaa.'],
      [String.raw`FESTIVAL "X" { date: 01/01/2000; STAGE A { } }`, 'Falta el precio.'],
      [String.raw`FESTIVAL "X" { date: 01/01/2000; price: 10.50; STAGE A { "a", } }`, 'Coma sobrante en la lista de grupos.']
    ],
    probes: ['SOLD_OUT SOLD FESTIVAL Festival STAGE2', '30/05/2026 3/5/2026 30-05-2026', '45.50 45.5 45 .50', 'date Date', String.raw`"a" "b"`, '&'],
    jlex: SKEL_JLEX + String.raw`
D = [0-9]

%%

"FESTIVAL"     { return new Symbol(sym.FESTIVAL); }
"STAGE"        { return new Symbol(sym.STAGE); }
"SOLD_OUT"     { return new Symbol(sym.SOLD_OUT); }
"date"         { return new Symbol(sym.DATE_KW); }
"price"        { return new Symbol(sym.PRICE); }
"{"            { return new Symbol(sym.LBRACE); }
"}"            { return new Symbol(sym.RBRACE); }
":"            { return new Symbol(sym.COLON); }
";"            { return new Symbol(sym.SEMICOLON); }
","            { return new Symbol(sym.COMMA); }
\"[^\"\n]*\"   { return new Symbol(sym.STRING, yytext()); }
{D}{D}"/"{D}{D}"/"{D}{D}{D}{D}   { return new Symbol(sym.DATE, yytext()); }
{D}+"."{D}{D}  { return new Symbol(sym.REAL, new Double(yytext())); }
[A-Z][a-zA-Z0-9]*  { return new Symbol(sym.STAGE_NAME, yytext()); }
[ \t\r\n]+     { }
.              { System.err.println("Error léxico (línea " + (yyline+1) + "): " + yytext()); }`,
    cup: String.raw`terminal FESTIVAL, STAGE, SOLD_OUT, DATE_KW, PRICE;
terminal LBRACE, RBRACE, COLON, SEMICOLON, COMMA;
terminal String STRING, DATE, STAGE_NAME;
terminal Double REAL;

non terminal file, festival_list, festival, info, date, price, stage_list, stage, opt_bands, band_list, opt_sold;

file          ::= festival_list ;
festival_list ::= festival_list festival
                | festival ;
festival      ::= FESTIVAL STRING LBRACE info stage_list opt_sold RBRACE ;
info          ::= date price
                | price date ;
date          ::= DATE_KW COLON DATE SEMICOLON ;
price         ::= PRICE COLON REAL SEMICOLON ;
stage_list    ::= stage_list stage
                | stage ;
stage         ::= STAGE STAGE_NAME LBRACE opt_bands RBRACE ;
opt_bands     ::= band_list
                | /* vacío */ ;
band_list     ::= band_list COMMA STRING
                | STRING ;
opt_sold      ::= SOLD_OUT SEMICOLON
                | /* vacío */ ;`,
    notes: ['"FESTIVAL" también encaja con [A-Z][a-zA-Z0-9]*: empatan en longitud y gana la palabra reservada por ir antes.', '"SOLD_OUT" gana a STAGE_NAME porque STAGE_NAME no admite "_" y solo reconocería "SOLD" (más corto).', '"STAGE2" es un nombre de escenario: es más largo que la palabra reservada STAGE.']
  });

  // ------------------------------------------------------------------ 7. Recetas
  L.push({
    id: 'recetas', name: 'Recetas de cocina', from: 'Nuevo, estilo examen',
    statement: `<p>Queremos un analizador léxico y sintáctico para un lenguaje de <b>recetas</b>:</p><ol>
      <li>Un archivo contiene <b>una o más</b> recetas, sin separador.</li>
      <li>Una receta es <b>recipe</b>, su nombre (cadena), entre paréntesis dos atributos <b>en cualquier orden</b> separados por coma, y entre "{" y "}" los ingredientes y los pasos (en este orden).</li>
      <li>Los atributos son <b>difficulty</b> ":" uno de <b>easy</b>, <b>medium</b>, <b>hard</b>; y <b>time</b> ":" un entero (minutos).</li>
      <li>Los ingredientes son <b>ingredients</b> ":" y, entre corchetes, la lista de ingredientes separados por comas (no vacía), terminada en ";".</li>
      <li>Un ingrediente es, opcionalmente, una cantidad (entero) seguida opcionalmente de una unidad (<b>g</b>, <b>kg</b>, <b>ml</b>, <b>l</b>), y después el nombre: <b>una o más palabras</b> en minúsculas (pueden llevar tildes y ñ). La unidad solo puede aparecer si hay cantidad. Ej.: <i>4 huevos</i>, <i>500 g patatas</i>, <i>aceite de oliva</i>.</li>
      <li>Los pasos son <b>steps</b> ":" y, entre corchetes, cadenas separadas por comas (no vacía), terminada en ";".</li>
      <li>El lenguaje <b>no es sensible</b> a mayúsculas y minúsculas.</li></ol>`,
    tokens: { RECIPE: 'recipe', DIFFICULTY: 'difficulty', TIME: 'time', INGREDIENTS: 'ingredients', STEPS: 'steps', EASY: 'easy', MEDIUM: 'medium', HARD: 'hard', G: 'g', KG: 'kg', ML: 'ml', L: 'l', LPAREN: '(', RPAREN: ')', LBRACE: '{', RBRACE: '}', LBRACKET: '[', RBRACKET: ']', COLON: ':', SEMICOLON: ';', COMMA: ',', STRING: 'cadena', NUMBER: 'entero', WORD: 'palabra' },
    samples: [String.raw`recipe "Tortilla de patatas" (difficulty: medium, time: 45) {
    ingredients: [ 4 huevos, 500 g patatas, 1 cebolla, aceite de oliva, sal ];
    steps: [ "Pelar y cortar las patatas", "Freír", "Batir los huevos", "Cuajar" ];
}
recipe "Gazpacho" (time: 20, difficulty: easy) {
    ingredients: [ 1 kg tomates, 1 pepino, 100 ml aceite ];
    steps: [ "Triturar todo" ];
}`, String.raw`RECIPE "Agua" (TIME: 1, DIFFICULTY: EASY) { INGREDIENTS: [ 1 L agua ]; STEPS: [ "Servir" ]; }`],
    invalid: [
      [String.raw`recipe "X" (difficulty: easy) { ingredients: [ sal ]; steps: [ "a" ]; }`, 'Faltan los minutos: hay dos atributos obligatorios.'],
      [String.raw`recipe "X" (difficulty: easy, time: 5) { ingredients: [ g sal ]; steps: [ "a" ]; }`, 'Una unidad sin cantidad no es válida.'],
      [String.raw`recipe "X" (difficulty: easy, time: 5) { steps: [ "a" ]; ingredients: [ sal ]; }`, 'Los ingredientes van antes que los pasos.'],
      [String.raw`recipe "X" (difficulty: easy, time: 5) { ingredients: [ ]; steps: [ "a" ]; }`, 'La lista de ingredientes no puede estar vacía.'],
      [String.raw`recipe "X" (difficulty: extreme, time: 5) { ingredients: [ sal ]; steps: [ "a" ]; }`, 'extreme no es una dificultad válida.'],
      [String.raw`recipe "X" (difficulty: easy, time: 5) { ingredients: [ 2 ]; steps: [ "a" ]; }`, 'Falta el nombre del ingrediente.']
    ],
    probes: ['l leche L', 'g gramos kg kilo', 'aceite de oliva', 'Easy EASY easyx', 'piñones jamón', '500g', '%'],
    jlex: SKEL_JLEX + String.raw`%ignorecase

%%

"recipe"       { return new Symbol(sym.RECIPE); }
"difficulty"   { return new Symbol(sym.DIFFICULTY); }
"time"         { return new Symbol(sym.TIME); }
"ingredients"  { return new Symbol(sym.INGREDIENTS); }
"steps"        { return new Symbol(sym.STEPS); }
"easy"         { return new Symbol(sym.EASY); }
"medium"       { return new Symbol(sym.MEDIUM); }
"hard"         { return new Symbol(sym.HARD); }
"g"            { return new Symbol(sym.G); }
"kg"           { return new Symbol(sym.KG); }
"ml"           { return new Symbol(sym.ML); }
"l"            { return new Symbol(sym.L); }
"("            { return new Symbol(sym.LPAREN); }
")"            { return new Symbol(sym.RPAREN); }
"{"            { return new Symbol(sym.LBRACE); }
"}"            { return new Symbol(sym.RBRACE); }
"["            { return new Symbol(sym.LBRACKET); }
"]"            { return new Symbol(sym.RBRACKET); }
":"            { return new Symbol(sym.COLON); }
";"            { return new Symbol(sym.SEMICOLON); }
","            { return new Symbol(sym.COMMA); }
\"[^\"\n]*\"   { return new Symbol(sym.STRING, yytext()); }
[0-9]+         { return new Symbol(sym.NUMBER, new Integer(yytext())); }
[a-záéíóúüñ]+  { return new Symbol(sym.WORD, yytext()); }
[ \t\r\n]+     { }
.              { System.err.println("Error léxico (línea " + (yyline+1) + "): " + yytext()); }`,
    cup: String.raw`terminal RECIPE, DIFFICULTY, TIME, INGREDIENTS, STEPS, EASY, MEDIUM, HARD, G, KG, ML, L;
terminal LPAREN, RPAREN, LBRACE, RBRACE, LBRACKET, RBRACKET, COLON, SEMICOLON, COMMA;
terminal String STRING, WORD;
terminal Integer NUMBER;

non terminal file, recipe_list, recipe, attrs, difficulty, time, level;
non terminal ingredient_list, ingredient, opt_unit, unit, name, step_list;

file            ::= recipe_list ;
recipe_list     ::= recipe_list recipe
                  | recipe ;
recipe          ::= RECIPE STRING LPAREN attrs RPAREN LBRACE
                    INGREDIENTS COLON LBRACKET ingredient_list RBRACKET SEMICOLON
                    STEPS COLON LBRACKET step_list RBRACKET SEMICOLON
                    RBRACE ;
attrs           ::= difficulty COMMA time
                  | time COMMA difficulty ;
difficulty      ::= DIFFICULTY COLON level ;
level           ::= EASY | MEDIUM | HARD ;
time            ::= TIME COLON NUMBER ;
ingredient_list ::= ingredient_list COMMA ingredient
                  | ingredient ;
ingredient      ::= NUMBER opt_unit name
                  | name ;
opt_unit        ::= unit
                  | /* vacío */ ;
unit            ::= G | KG | ML | L ;
name            ::= name WORD
                  | WORD ;
step_list       ::= step_list COMMA STRING
                  | STRING ;`,
    notes: ['Con %ignorecase, "easy" encaja con la palabra reservada y con WORD: gana la reservada por ir antes. "leche" es WORD porque es más largo que "l".', 'Nombres de varias palabras: se resuelve en la gramática (<span class="mono">name ::= name WORD | WORD</span>), no con un testigo con espacios.', '"500g" da NUMBER y G: el analizador léxico no necesita espacios entre testigos.']
  });

  // ------------------------------------------------------------------ 8. Estaciones meteorológicas
  L.push({
    id: 'meteo', name: 'Estaciones meteorológicas', from: 'Nuevo, estilo examen',
    statement: `<p>Queremos un analizador léxico y sintáctico para un lenguaje de <b>estaciones meteorológicas</b>:</p><ol>
      <li>Un archivo contiene <b>una o más</b> estaciones, sin separador.</li>
      <li>Una estación es <b>STATION</b>, su código, su nombre (cadena) y, entre "{" y "}": las coordenadas, los sensores y, opcionalmente, las lecturas.</li>
      <li>El código es <b>ES</b> seguido de <b>3 dígitos</b> (ES001).</li>
      <li>Las coordenadas son <b>LAT</b> número y <b>LON</b> número, <b>en cualquier orden</b>. Los números son reales con signo opcional: "-"? dígitos y, opcionalmente, "." y dígitos (41.22, -3.5, 7).</li>
      <li>Los sensores son <b>SENSORS</b> y, entre "{" y "}", una lista no vacía separada por comas de: <b>TEMP</b>, <b>HUM</b>, <b>WIND</b>, <b>RAIN</b>.</li>
      <li>Las lecturas son <b>READINGS</b> y, entre "{" y "}", cero o más lecturas. Cada lectura es: fecha <b>aaaa-mm-dd</b>, hora <b>hh:mm</b>, sensor, número y ";".</li>
      <li>El lenguaje <b>es sensible</b> a mayúsculas y minúsculas.</li></ol>`,
    tokens: { STATION: 'STATION', LAT: 'LAT', LON: 'LON', SENSORS: 'SENSORS', READINGS: 'READINGS', TEMP: 'TEMP', HUM: 'HUM', WIND: 'WIND', RAIN: 'RAIN', LBRACE: '{', RBRACE: '}', COMMA: ',', SEMICOLON: ';', CODE: 'código de estación', STRING: 'cadena', NUMBER: 'número', DATE: 'fecha', TIME: 'hora' },
    samples: [String.raw`STATION ES001 "Vilanova" {
    LAT 41.22 LON 1.72
    SENSORS { TEMP, HUM, WIND }
    READINGS {
        2026-11-22 10:00 TEMP -3.5;
        2026-11-22 10:00 HUM 80;
    }
}
STATION ES002 "Montseny" {
    LON 2.4 LAT 41.75
    SENSORS { RAIN }
}`, String.raw`STATION ES999 "X" { LAT -0.5 LON -10 SENSORS { TEMP } READINGS { } }`],
    invalid: [
      [String.raw`STATION ES01 "X" { LAT 1 LON 1 SENSORS { TEMP } }`, 'ES01 solo tiene 2 dígitos.'],
      [String.raw`STATION ES001 "X" { LAT 1 SENSORS { TEMP } }`, 'Falta LON.'],
      [String.raw`STATION ES001 "X" { LAT 1 LON 1 SENSORS { } }`, 'La lista de sensores no puede estar vacía.'],
      [String.raw`STATION ES001 "X" { LAT 1 LON 1 SENSORS { TEMP } READINGS { 2026-11-22 TEMP 3; } }`, 'Falta la hora en la lectura.'],
      [String.raw`STATION ES001 "X" { SENSORS { TEMP } LAT 1 LON 1 }`, 'Las coordenadas van antes que los sensores.'],
      [String.raw`STATION ES001 "X" { LAT 1 LON 1 SENSORS { TEMP, PRESSURE } }`, 'PRESSURE no es un sensor válido.']
    ],
    probes: ['2026-11-22 2026-1-22 2026 -11', '-3.5 3. -0 .5', '10:00 1:00', 'ES001 ES01 es001 ES0011', 'TEMP Temp TEMPS', '*'],
    jlex: SKEL_JLEX + String.raw`
D = [0-9]

%%

"STATION"      { return new Symbol(sym.STATION); }
"LAT"          { return new Symbol(sym.LAT); }
"LON"          { return new Symbol(sym.LON); }
"SENSORS"      { return new Symbol(sym.SENSORS); }
"READINGS"     { return new Symbol(sym.READINGS); }
"TEMP"         { return new Symbol(sym.TEMP); }
"HUM"          { return new Symbol(sym.HUM); }
"WIND"         { return new Symbol(sym.WIND); }
"RAIN"         { return new Symbol(sym.RAIN); }
"{"            { return new Symbol(sym.LBRACE); }
"}"            { return new Symbol(sym.RBRACE); }
","            { return new Symbol(sym.COMMA); }
";"            { return new Symbol(sym.SEMICOLON); }
"ES"{D}{D}{D}  { return new Symbol(sym.CODE, yytext()); }
\"[^\"\n]*\"   { return new Symbol(sym.STRING, yytext()); }
{D}{D}{D}{D}"-"{D}{D}"-"{D}{D}   { return new Symbol(sym.DATE, yytext()); }
{D}{D}":"{D}{D}                  { return new Symbol(sym.TIME, yytext()); }
"-"?{D}+("."{D}+)?               { return new Symbol(sym.NUMBER, new Double(yytext())); }
[ \t\r\n]+     { }
.              { System.err.println("Error léxico (línea " + (yyline+1) + "): " + yytext()); }`,
    cup: String.raw`terminal STATION, LAT, LON, SENSORS, READINGS, TEMP, HUM, WIND, RAIN;
terminal LBRACE, RBRACE, COMMA, SEMICOLON;
terminal String CODE, STRING, DATE, TIME;
terminal Double NUMBER;

non terminal file, station_list, station, coords, sensor_list, sensor, opt_readings, reading_list, reading;

file         ::= station_list ;
station_list ::= station_list station
               | station ;
station      ::= STATION CODE STRING LBRACE coords SENSORS LBRACE sensor_list RBRACE opt_readings RBRACE ;
coords       ::= LAT NUMBER LON NUMBER
               | LON NUMBER LAT NUMBER ;
sensor_list  ::= sensor_list COMMA sensor
               | sensor ;
sensor       ::= TEMP | HUM | WIND | RAIN ;
opt_readings ::= READINGS LBRACE reading_list RBRACE
               | /* vacío */ ;
reading_list ::= reading_list reading
               | /* vacío */ ;
reading      ::= DATE TIME sensor NUMBER SEMICOLON ;`,
    semantic: { rules: ['Una lectura solo puede usar un sensor declarado en SENSORS (UNDECLARED_SENSOR).', 'No puede haber dos estaciones con el mismo código (DUPLICATED_STATION).', 'La latitud debe estar entre -90 y 90 (INVALID_LATITUDE).'], code: String.raw`sensor_list ::= sensor_list COMMA sensor:s {: parser.declared.add(s); :}
              | sensor:s {: parser.declared.add(s); :} ;
sensor      ::= TEMP {: RESULT = "TEMP"; :} | HUM {: RESULT = "HUM"; :}
              | WIND {: RESULT = "WIND"; :} | RAIN {: RESULT = "RAIN"; :} ;
reading     ::= DATE TIME sensor:s NUMBER SEMICOLON
                {: if (!parser.declared.contains(s)) parser.error("UNDECLARED_SENSOR"); :} ;
// declared es un HashSet<String> que se vacía al empezar cada estación
// (non terminal String sensor;)` },
    notes: ['"2026-11-22" se reconoce como DATE (10 caracteres) y no como NUMBER 2026 seguido de -11: gana el más largo.', 'El signo forma parte del número ("-3.5" es un único testigo NUMBER) porque en este lenguaje no hay resta.', 'Lista que puede estar vacía <b>sin separadores</b>: <span class="mono">reading_list ::= reading_list reading | ;</span> (aquí sí se puede poner la ε en la propia lista).']
  });

  root.LANGS = L;
  root.SKEL_JLEX = SKEL_JLEX;
  root.SKEL_CUP = String.raw`import java_cup.runtime.*;
import java.io.*;
import java.lang.String;

parser code {:
    // (método main de la plantilla del examen)
:}

/* Declaración de terminales */


/* Declaración de no terminales */


/* Reglas sintácticas */

`;
})(typeof window !== 'undefined' ? window : globalThis);
