// Audio desactivado: el juego no reproduce ningún sonido (ni efectos ni ambiente).
// Se conserva la misma interfaz (SFX.play, SFX.at, SFX.loop...) para que el resto del código no cambie.
// Para volver a tener sonido basta con restaurar la versión anterior de este archivo desde el historial de git.
const noop = () => null;
export const SFX = {
  init() {},
  preload() { return Promise.resolve(); },
  play: noop,
  at: noop,
  loop() { return { set() {}, stop() {} }; },
  listener() {},
  setVolume() {},
  duck() {},
  get ctx() { return null; },
  get ready() { return false; },
  surface: 'step',
  bus() { return null; },
  has() { return false; },
};
window.SFX = SFX;
