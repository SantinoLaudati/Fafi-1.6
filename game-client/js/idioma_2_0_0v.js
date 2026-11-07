// Idioma del juego (Español / English). El texto original está en español: al elegir inglés se traducen los textos de la pantalla
// (menús, ajustes, HUD, avisos) con este diccionario y se restauran al volver a español. Lo que no esté en el diccionario queda en español.
// Para agregar una traducción basta con sumar un par [español, inglés] a PAIRS.
const KEY = 'fafi_lang';
const PAIRS = [
  // menú principal y pestañas
  ['Jugar', 'Play'], ['Equipamiento', 'Loadout'], ['Tienda', 'Store'], ['Perfil', 'Profile'], ['Ajustes', 'Settings'], ['CERRAR SESIÓN', 'LOG OUT'],
  ['BIENVENIDO,', 'WELCOME,'], ['Fafi Coins', 'Fafi Coins'], ['Skins', 'Skins'], ['Hechos', 'Facts'], ['TU EQUIPO', 'YOUR LOADOUT'], ['ENTRENAMIENTO', 'TRAINING'],
  ['Campo de tiro', 'Shooting range'], ['30 s de blancos móviles. Todas las armas libres.', '30 s of moving targets. All weapons unlocked.'], ['Defuse', 'Defuse'],
  ['5 vs 5 · BOTS', '5 vs 5 · BOTS'], ['Terroristas contra antiterroristas: planta o desactiva la bomba.', 'Terrorists vs counter-terrorists: plant or defuse the bomb.'],
  ['EXPLORACIÓN', 'EXPLORATION'], ['Mapa libre', 'Free map'], ['Dust II, Italy y Office sin reglas, para practicar.', 'Dust II, Italy and Office with no rules, for practice.'],
  ['CAMPAÑA', 'CAMPAIGN'], ['Modo historia', 'Story mode'], ['Los hechos de la Segunda Guerra Mundial hasta el Día D.', 'World War II events up to D-Day.'],
  ['Controles:', 'Controls:'], ['mover', 'move'], ['agacharse', 'crouch'], ['saltar', 'jump'], ['cuchillo', 'knife'], ['granadas', 'grenades'], ['comprar', 'buy'], ['plantar/desactivar', 'plant/defuse'],
  ['marcador', 'scoreboard'], ['recargar', 'reload'], ['inspeccionar', 'inspect'],
  // menú de partida
  ['COMPETITIVO', 'COMPETITIVE'], ['ONLINE', 'ONLINE'], ['‹ VOLVER', '‹ BACK'], ['VOLVER', 'BACK'], ['DEFUSE 5v5 · CONTRA BOTS · ELEGÍ EL MAPA', 'DEFUSE 5v5 · VS BOTS · PICK A MAP'],
  ['ONLINE · SALAS ABIERTAS · 5 CONTRA 5', 'ONLINE · OPEN ROOMS · 5 VS 5'], ['LISTO', 'READY'], ['CARGANDO', 'LOADING'], ['ALEATORIO', 'RANDOM'], ['SORPRESA', 'SURPRISE'],
  ['CLÁSICO', 'CLASSIC'], ['CIUDAD', 'CITY'], ['INTERIORES', 'INDOORS'], ['COMPETITIVO', 'COMPETITIVE'],
  ['18 rondas · gana el primero en llegar a 12 · bando aleatorio y cambio de lado a mitad de partida', '18 rounds · first to 12 wins · random side and side swap at halftime'],
  ['Equipos de 5 al azar · bando T/CT al azar · el mapa lo vota la sala', 'Random 5-player teams · random T/CT side · the room votes the map'],
  ['CREAR SALA', 'CREATE ROOM'], ['ACTUALIZAR', 'REFRESH'], ['UNIRSE', 'JOIN'], ['SALIR', 'LEAVE'], ['SALA', 'ROOM'], ['ANFITRIÓN', 'HOST'], ['JUGADORES', 'PLAYERS'], ['EN JUEGO', 'IN GAME'], ['LLENA', 'FULL'],
  ['INICIAR PARTIDA', 'START MATCH'], ['VOTÁ EL MAPA', 'VOTE FOR THE MAP'], ['EQUIPO 1', 'TEAM 1'], ['EQUIPO 2', 'TEAM 2'], ['esperando jugador...', 'waiting for player...'],
  ['No hay salas abiertas. ¡Creá la primera!', 'There are no open rooms. Create the first one!'], ['Nombre de tu sala', 'Room name'],
  ['Solo el anfitrión inicia la partida', 'Only the host can start the match'], ['REINTENTAR', 'RETRY'], ['Conectando con el servidor...', 'Connecting to the server...'],
  ['Para jugar online iniciá sesión con tu cuenta (no el modo sin conexión).', 'To play online, log in with your account (not offline mode).'],
  ['Todos los jugadores conectados al servidor ven tu sala y pueden unirse (máximo 10).', 'Every player connected to the server can see your room and join (max 10).'],
  // HUD
  ['TIEMPO DE COMPRA', 'BUY TIME'], ['BOMBA PLANTADA', 'BOMB PLANTED'], ['RONDA', 'ROUND'], ['MUNICIÓN', 'AMMO'], ['DINERO', 'MONEY'], ['PUNTOS', 'SCORE'], ['BLANCOS', 'TARGETS'], ['PRECISIÓN', 'ACCURACY'], ['TIEMPO', 'TIME'],
  ['RECARGANDO...', 'RELOADING...'], ['CERROJO', 'BOLT'], ['PLANTANDO', 'PLANTING'], ['DESACTIVANDO', 'DEFUSING'],
  ['COMIENZA LA PARTIDA', 'MATCH STARTS'], ['CAMBIO DE BANDO', 'SIDES SWAPPED'], ['¡A POR ELLOS!', 'GO GO GO!'], ['¡VICTORIA!', 'VICTORY!'], ['DERROTA', 'DEFEAT'], ['EMPATE', 'DRAW'],
  ['TERRORISTAS GANAN LA RONDA', 'TERRORISTS WIN THE ROUND'], ['ANTITERRORISTAS GANAN LA RONDA', 'COUNTER-TERRORISTS WIN THE ROUND'], ['TERRORISTAS', 'TERRORISTS'], ['ANTITERRORISTAS', 'COUNTER-TERRORISTS'],
  ['Plantá la bomba en A o B', 'Plant the bomb at A or B'], ['Defendé los sitios A y B', 'Defend sites A and B'], ['Has muerto', 'You died'],
  ['Todos los antiterroristas eliminados', 'All counter-terrorists eliminated'], ['Todos los terroristas eliminados', 'All terrorists eliminated'], ['Se acabó el tiempo', 'Time ran out'],
  ['Pulsá ESC para volver al menú.', 'Press ESC to return to the menu.'], ['Marcador final', 'Final score'], ['Ahora jugás de terrorista', 'You are now a terrorist'], ['Ahora jugás de antiterrorista', 'You are now a counter-terrorist'],
  ['MENÚ DE COMPRA', 'BUY MENU'], ['CERRAR [B]', 'CLOSE [B]'], ['PAUSA', 'PAUSED'], ['CONTINUAR', 'RESUME'], ['MENÚ PRINCIPAL', 'MAIN MENU'], ['CAMBIAR DE BANDO', 'SWITCH SIDE'], ['JUGAR DE NUEVO', 'PLAY AGAIN'],
  ['Presiona ESC para volver al menú o CLICK para continuar', 'Press ESC to return to the menu or CLICK to continue'], ['VOLVER AL MENÚ', 'BACK TO MENU'],
  ['Cargando…', 'Loading…'], ['Preparando el juego...', 'Getting the game ready...'], ['Descargando archivos...', 'Downloading files...'], ['Optimizando', 'Optimizing'], ['Preparando colisiones de', 'Preparing collisions for'],
  ['Cargando personajes…', 'Loading characters…'], ['Generando navegación del mapa…', 'Building map navigation…'], ['Cargando bomba…', 'Loading bomb…'], ['Cargando gallinas…', 'Loading chickens…'],
  ['Listo', 'Done'], ['Descargando:', 'Downloading:'], ['Preparando:', 'Preparing:'],
  // login
  ['INICIAR SESIÓN', 'LOG IN'], ['Iniciar Sesión', 'Log In'], ['ENTRAR AL JUEGO', 'ENTER THE GAME'], ['JUGAR SIN CONEXIÓN', 'PLAY OFFLINE'], ['CREAR CUENTA', 'CREATE ACCOUNT'], ['CREAR NUEVA CUENTA', 'CREATE NEW ACCOUNT'],
  ['Nombre de usuario', 'Username'], ['Contraseña', 'Password'], ['Regístrate aquí', 'Sign up here'], ['¿No tienes cuenta?', 'No account?'], ['Volver a', 'Back to'],
  ['Guardado en la base de datos MySQL por usuario • Coins, skins, amigos y sensibilidad se conservan', 'Saved in the MySQL database per user • Coins, skins, friends and sensitivity are kept'],
  // perfil / amigos
  ['Tu Perfil Fafi', 'Your Fafi Profile'], ['Historial de Compras (Fafi Coins)', 'Purchase history (Fafi Coins)'], ['Logros Desbloqueados', 'Unlocked achievements'], ['Amigos', 'Friends'],
  ['CAMBIAR FOTO', 'CHANGE PHOTO'], ['QUITAR', 'REMOVE'], ['GUARDAR PERFIL', 'SAVE PROFILE'], ['VER MI PERFIL', 'VIEW MY PROFILE'], ['COPIAR CÓDIGO DE MI MIRA', 'COPY MY CROSSHAIR CODE'], ['IMPORTAR MIRA', 'IMPORT CROSSHAIR'],
  ['Escribí una descripción tuya (máx. 160 caracteres)', 'Write a short bio (max. 160 characters)'], ['LOGROS DESTACADOS (hasta 3)', 'FEATURED ACHIEVEMENTS (up to 3)'], ['COPIAR ESTA MIRA', 'COPY THIS CROSSHAIR'],
  ['PERFIL DE JUGADOR', 'PLAYER PROFILE'], ['CERRAR', 'CLOSE'], ['Buscar jugador por nombre...', 'Search player by name...'], ['AÑADIR', 'ADD'], ['Solicitudes', 'Requests'], ['Enviadas', 'Sent'], ['Bloqueados', 'Blocked'],
  ['ACEPTAR', 'ACCEPT'], ['RECHAZAR', 'DECLINE'], ['CANCELAR', 'CANCEL'], ['BLOQUEAR', 'BLOCK'], ['DESBLOQUEAR', 'UNBLOCK'], ['PERFIL', 'PROFILE'], ['RETAR 1v1', 'CHALLENGE 1v1'], ['Cuenta activa', 'Active account'],
  ['Todavía no tenés amigos. Buscá un jugador arriba y mandale una solicitud.', "You don't have friends yet. Search for a player above and send a request."], ['Quiere ser tu amigo', 'Wants to be your friend'], ['Esperando respuesta', 'Waiting for reply'],
  ['te desafía a un 1v1', 'challenges you to a 1v1'],
  // ajustes
  ['Sonido', 'Sound'], ['Silenciar todo', 'Mute all'], ['Volumen general', 'Master volume'], ['Disparos de armas', 'Weapon shots'], ['Recarga y sacar arma', 'Reload and draw'], ['Pasos y aterrizaje', 'Footsteps and landing'],
  ['Impactos y cuchillo', 'Impacts and knife'], ['Granadas', 'Grenades'], ['Bomba (C4)', 'Bomb (C4)'], ['Menú y rondas', 'Menu and rounds'], ['PROBAR DISPARO', 'TEST SHOT'], ['RESTABLECER SONIDO', 'RESET SOUND'],
  ['Gráficos avanzados', 'Advanced graphics'], ['IMAGEN Y RENDIMIENTO', 'IMAGE AND PERFORMANCE'], ['SOMBRAS E ILUMINACIÓN', 'SHADOWS AND LIGHTING'], ['EFECTOS Y DETALLE', 'EFFECTS AND DETAIL'],
  ['Escala de resolución', 'Resolution scale'], ['Resolución dinámica', 'Dynamic resolution'], ['Límite de FPS', 'FPS limit'], ['Campo de visión (FOV)', 'Field of view (FOV)'], ['Distancia de dibujado', 'Draw distance'],
  ['Mostrar contador de FPS', 'Show FPS counter'], ['Sombras en tiempo real', 'Real-time shadows'], ['Calidad de sombras', 'Shadow quality'], ['Alcance de sombras', 'Shadow range'], ['Filtrado de sombras', 'Shadow filtering'],
  ['Brillo / exposición', 'Brightness / exposure'], ['Densidad de niebla', 'Fog density'], ['Hora del día (mapas libres y Defuse)', 'Time of day (free maps and Defuse)'], ['Partículas e impactos', 'Particles and impacts'],
  ['Bots máximos en pantalla', 'Max bots on screen'], ['Calidad de texturas de mapa', 'Map texture quality'], ['AUTODETECTAR MI PC', 'AUTO-DETECT MY PC'], ['RESTABLECER GRÁFICOS', 'RESET GRAPHICS'],
  ['Personalización de mira', 'Crosshair customization'], ['Estilo', 'Style'], ['Color', 'Color'], ['Largo de las líneas', 'Line length'], ['Grosor', 'Thickness'], ['Separación del centro', 'Center gap'], ['Contorno negro', 'Black outline'],
  ['Opacidad', 'Opacity'], ['Punto central', 'Center dot'], ['Tamaño del punto', 'Dot size'], ['RESTABLECER MIRA', 'RESET CROSSHAIR'], ['Idioma', 'Language'],
  ['Sensibilidad de la Cámara (1-20, se guarda por usuario)', 'Camera sensitivity (1-20, saved per user)'], ['Configuración visual', 'Visual settings'], ['MÍNIMA', 'MINIMUM'], ['BAJA', 'LOW'], ['MEDIA', 'MEDIUM'], ['ALTA', 'HIGH'],
  ['Ajustes del Juego (se aplican al motor V2)', 'Game Settings (applied to the V2 engine)'], ['Desactivado', 'Off'], ['Activado', 'On'],
  // tienda / equipo
  ['Tienda de Cajas', 'Crate Store'], ['Caja Básica', 'Basic Crate'], ['Caja Avanzada', 'Advanced Crate'], ['Caja Clasificada', 'Classified Crate'], ['ABRIR CAJA', 'OPEN CRATE'], ['ACEPTAR', 'OK'],
  ['SELECCIONA UN ARMA', 'SELECT A WEAPON'], ['Comunes + chance Épica.', 'Commons + chance of Epic.'], ['Alta prob. Épicas.', 'High chance of Epics.'], ['Épica o Legendaria.', 'Epic or Legendary.'],
  // avisos del juego
  ['De vuelta al cuerpo', 'Back in your body'], ['Vuelo desactivado', 'Flight off'], ['Sin conexión', 'Offline'], ['¡Hola', 'Hello'], ['lanzada', 'thrown'], ['No tienes', "You don't have"], ['Pulsa B para comprar', 'Press B to buy'],
  ['Guardado en este equipo', 'Saved on this device']
];
let lang = 'es';
try { lang = localStorage.getItem(KEY) || 'es'; } catch (e) {}
const ES2EN = new Map(PAIRS.map(([a, b]) => [a, b]));
const SORTED = PAIRS.filter(([a]) => a.length >= 4).sort((x, y) => y[0].length - x[0].length);
const orig = new WeakMap();
export function t(s) {
  if (lang !== 'en' || !s) return s;
  const k = String(s).trim(); if (ES2EN.has(k)) return String(s).replace(k, ES2EN.get(k));
  let out = String(s);
  for (const [a, b] of SORTED) if (out.includes(a)) out = out.split(a).join(b);
  return out;
}
window.t = t;
function tr(node) {
  if (node.nodeType === 3) {
    const v = node.nodeValue; if (!v || !v.trim()) return;
    if (lang === 'en') { if (!orig.has(node)) orig.set(node, v); const nv = t(orig.has(node) && node.__en === v ? orig.get(node) : v); if (nv !== v) { node.__en = nv; node.nodeValue = nv; } }
    else if (orig.has(node)) { node.nodeValue = orig.get(node); orig.delete(node); node.__en = null; }
  } else if (node.nodeType === 1) {
    if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
    for (const a of ['placeholder', 'title']) { const v = node.getAttribute && node.getAttribute(a); if (v) { const k = '_o_' + a; if (lang === 'en') { if (node[k] === undefined) node[k] = v; const nv = t(node[k]); if (nv !== v) node.setAttribute(a, nv); } else if (node[k] !== undefined) { node.setAttribute(a, node[k]); node[k] = undefined; } } }
    node.childNodes.forEach(tr);
  }
}
let pending = new Set(), raf = 0;
const flush = () => { raf = 0; const list = [...pending]; pending.clear(); for (const n of list) if (n.isConnected !== false) tr(n); };
const obs = new MutationObserver((muts) => {
  if (lang !== 'en') return;
  for (const m of muts) { if (m.type === 'childList') m.addedNodes.forEach((n) => pending.add(n)); else if (m.type === 'characterData') { const n = m.target; if (n.__en !== n.nodeValue) { orig.delete(n); pending.add(n); } } }
  if (!raf) raf = requestAnimationFrame(flush);
});
export function getLang() { return lang; }
export function setLang(l) {
  lang = l === 'en' ? 'en' : 'es'; try { localStorage.setItem(KEY, lang); } catch (e) {}
  document.documentElement.lang = lang; tr(document.body); window.dispatchEvent(new Event('fafi-lang-change'));
}
export function initIdioma() {
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  document.documentElement.lang = lang; if (lang === 'en') tr(document.body);
  window.fafiSetLang = setLang; window.fafiGetLang = getLang;
}
