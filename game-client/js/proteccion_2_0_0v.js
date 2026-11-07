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
