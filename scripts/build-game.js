/*
 * FAFI 1.6 — generador del módulo único del cliente.
 *
 * Los archivos player.js, controls.js y main.js comparten estado mutable
 * (munición, recoil, posición, etc.). En ES Modules las importaciones son
 * de solo lectura, así que asignar desde player.js/controls.js a variables
 * importadas de main.js lanza "Assignment to constant variable".
 *
 * Este script concatena los tres módulos en un único archivo (game.js) para
 * que todas las variables compartan el mismo ámbito. Los archivos originales
 * siguen siendo la fuente de verdad; ejecuta este script después de editarlos:
 *
 *   node scripts/build-game.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const jsDir = path.join(root, 'game-client', 'js');

function read(file) {
  return fs.readFileSync(path.join(jsDir, file), 'utf8').replace(/\r\n/g, '\n');
}

function stripImports(src) {
  return src
    .split('\n')
    .filter((line) => !/^\s*import\s/.test(line))
    .join('\n');
}

function stripMainExport(src) {
  // Elimina el bloque final "export { ... };" de main.js.
  return src.replace(/\nexport\s*\{[\s\S]*?\};\s*$/m, '\n');
}

const player = stripImports(read('player.js')).trim();
const controls = stripImports(read('controls.js')).trim();
const main = stripMainExport(stripImports(read('main.js'))).trim();

const banner = `/*
 * FAFI 1.6 — cliente unificado (ARCHIVO GENERADO).
 * No edites game.js a mano: edita player.js, controls.js o main.js y ejecuta
 *   node scripts/build-game.js
 *
 * Motivo: los tres módulos comparten estado mutable. Al concatenarlos en un
 * solo módulo, las asignaciones dejan de apuntar a importaciones de solo
 * lectura y el motor puede actualizar munición, recoil, movimiento, etc.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

/* =========================================================================
 * player.js
 * ========================================================================= */
${player}

/* =========================================================================
 * controls.js
 * ========================================================================= */
${controls}

/* =========================================================================
 * main.js
 * ========================================================================= */
${main}
`;

fs.writeFileSync(path.join(jsDir, 'game.js'), banner, 'utf8');
console.log('Generado game-client/js/game.js');
