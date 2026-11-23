// Construye dist/index.html (un único fichero) a partir de src/
const fs = require('fs'); const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const core = ['regex', 'grammar', 'gramgen', 'tac', 'minic', 'tools'].map(f => 'src/core/' + f + '.js');
const ui = ['src/ui/lib.js', 'src/ui/app.js'];
const ex = fs.readdirSync(path.join(__dirname, 'src/ex')).filter(f => f.endsWith('.js')).sort().map(f => 'src/ex/' + f);
const data = fs.existsSync(path.join(__dirname, 'src/data')) ? fs.readdirSync(path.join(__dirname, 'src/data')).filter(f => f.endsWith('.js')).sort().map(f => 'src/data/' + f) : [];
const order = (process.env.ORDER || 'fundamentos.js,lexico.js,sintactico.js,herramientas.js,examen.js,semantica.js,optimizacion.js').split(',').filter(Boolean);
const exSorted = ex.sort((a, b) => { const ia = order.indexOf(path.basename(a)), ib = order.indexOf(path.basename(b)); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b); });
const js = [...core, ...ui, ...data, ...exSorted].map(f => '// ---- ' + f + ' ----\n' + R(f)).join('\n');
const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Compiladores · práctica interactiva</title>
<meta name="theme-color" content="#17203a">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="icons/icon-192.png">
<style>
${R('src/ui/style.css')}
</style>
</head>
<body>
<noscript>Esta app necesita JavaScript.</noscript>
<script>
${js.replace(/<\/script/gi, '<\\/script')}
document.addEventListener('DOMContentLoaded', function () { App.start(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') { navigator.serviceWorker.register('sw.js').catch(function () {}); }
</script>
</body>
</html>
`;
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB', ex.length, 'módulos de ejercicios');
