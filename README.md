# Compiladores · práctica interactiva

App web (y PWA para el móvil) para estudiar **Compiladores (UOC 75.580)** resolviendo ejercicios que se generan solos y se corrigen paso a paso.

**Abrir la app:** https://albertcontreras98.github.io/compiladores-interactivo/

Todo funciona en el navegador, sin servidor: el `index.html` lleva dentro motores propios de expresiones regulares, JLex, CUP (LALR), análisis LL/LR, código de tres direcciones y optimizaciones. El progreso se guarda en el almacenamiento local del navegador.

## Contenido
- **Fundamentos**: test de teoría, clasificación de errores, diagramas de Tombstone.
- **Análisis léxico**: expresiones regulares en JLex (equivalencia exacta), lectura de ER, simulador de JLex.
- **Análisis sintáctico**: Primeros/Siguientes, predicción y tabla LL(1), colección LR(0), tabla SLR(1), trazas, ambigüedad, recursividad y factorización.
- **JLex + CUP (examen)**: patrones de gramáticas CUP y 8 problemas de examen (JLex + CUP) corregidos automáticamente.
- **Semántica y código intermedio**: notación postfija, gramáticas atribuidas, código de tres direcciones desde C, cuádruplas y tercetos.
- **Optimización**: bloques básicos, optimizaciones individuales y la cadena completa de la PEC3.

## Desarrollo
`node build.js` genera `dist/index.html` a partir de `src/`. Copia el resultado a la raíz para publicarlo.
