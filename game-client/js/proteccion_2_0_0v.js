// Disuasion basica: F12 desactivado siempre; fuera de ?dev=1 tambien se bloquean el menu contextual y los atajos de herramientas de desarrollo / ver codigo fuente.
// Esto NO es seguridad real (el codigo del navegador siempre puede leerse); la proteccion contra trampas debe estar en el servidor.
const dev = /[?&]dev=1/.test(location.search);
const stop = (e) => { e.preventDefault(); e.stopPropagation(); return false; };
window.addEventListener('keydown', (e) => {
  const k = (e.key || '').toLowerCase();
  if (e.key === 'F12' || e.code === 'F12') return stop(e);
  if (dev) return;
  if ((e.ctrlKey && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) || (e.ctrlKey && ['u', 's'].includes(k)) || (e.metaKey && e.altKey && ['i', 'j', 'u'].includes(k))) stop(e);
}, true);
if (!dev) {
  window.addEventListener('contextmenu', stop, true);
  window.addEventListener('dragstart', stop, true);
}

// Escribiendo en un campo de texto (usuario, email, contrasena, chat...) los atajos del juego no deben tocar la tecla:
// antes teclas como AltGr+2 (@ en teclado espanol) o la del grafiti se cancelaban y no se podia escribir.
const typing = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
for (const type of ['keydown', 'keyup', 'keypress']) {
  window.addEventListener(type, (e) => { if (e.code !== 'F12' && typing(e.target)) e.stopImmediatePropagation(); }, true);
}
