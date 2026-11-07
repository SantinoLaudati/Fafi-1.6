// Disuasion basica: bloquea el menu contextual, F12 y los atajos de herramientas de desarrollo / ver codigo fuente.
// Esto NO es seguridad real (el codigo del navegador siempre puede leerse); la proteccion contra trampas debe estar en el servidor.
// Con ?dev=1 se desactiva para poder depurar.
if (!/[?&]dev=1/.test(location.search)) {
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); return false; };
  window.addEventListener('contextmenu', stop, true);
  window.addEventListener('keydown', (e) => {
    const k = (e.key || '').toLowerCase();
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) || (e.ctrlKey && ['u', 's'].includes(k)) || (e.metaKey && e.altKey && ['i', 'j', 'u'].includes(k))) stop(e);
  }, true);
  window.addEventListener('dragstart', stop, true);
}
