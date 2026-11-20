// CHAT DE VOZ (WebRTC). El servidor websocket solo hace de señalización (voice_join / voice_signal / voice_leave);
// el audio va directo entre los jugadores de la misma sala (malla P2P, pensada para salas de hasta 10).
// Se activa solo al entrar a una sala online o a un duelo 1v1 y se configura en Ajustes > Chat de voz.
// Requisitos del navegador: HTTPS (o localhost) y permiso de micrófono. Sin servidor TURN, algunas redes muy restrictivas (NAT simétrico)
// pueden no conectar: se puede agregar uno en window.FAFI_CONFIG.iceServers.
import { online } from './online_2_0_0v.js';

const KEY = 'fafi_voice';
const DEF = { enabled: true, mode: 'vad', pttKey: 'KeyV', muteKey: 'F8', micVol: 1, outVol: 1, threshold: 0.05, inputId: '', outputId: '', echo: true, noise: true, agc: true, muted: false, deafened: false, peerVol: {} };
let cfg = { ...DEF };
try { cfg = { ...DEF, ...(JSON.parse(localStorage.getItem(KEY) || '{}') || {}) }; } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} };

export const getConfig = () => ({ ...cfg, peerVol: { ...cfg.peerVol } });
export const supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.RTCPeerConnection);

let ctx = null, stream = null, micGain = null, analyser = null, dest = null, srcNode = null, active = false, pttDown = false, sendOn = false, holdUntil = 0, level = 0, loopT = 0;
const peers = new Map();          // id -> { pc, audio, name, speaking, an, anBuf }
const listeners = new Set();
const emit = () => listeners.forEach((f) => { try { f(); } catch (e) {} });
export const onChange = (f) => { listeners.add(f); return () => listeners.delete(f); };
export const isActive = () => active;
export const getLevel = () => level;
export const getPeers = () => [...peers.entries()].map(([id, p]) => ({ id, name: p.name, speaking: !!p.speaking }));
export const isSending = () => sendOn;

export function setConfig(patch) {
  const needRestart = ['inputId', 'echo', 'noise', 'agc'].some((k) => k in patch && patch[k] !== cfg[k]);
  cfg = { ...cfg, ...patch }; save();
  if (micGain) micGain.gain.value = cfg.micVol;
  applyOutput();
  if (active && (needRestart || ('enabled' in patch && !cfg.enabled))) { const wasOn = cfg.enabled; leave(); if (wasOn && online.room) join(); }
  else if (!active && 'enabled' in patch && cfg.enabled && online.room) join();
  emit();
}

// --------- dispositivos ---------
export async function listDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return { inputs: [], outputs: [] };
  const d = await navigator.mediaDevices.enumerateDevices();
  return { inputs: d.filter((x) => x.kind === 'audioinput'), outputs: d.filter((x) => x.kind === 'audiooutput') };
}
export async function askPermission() {          // sin permiso el navegador no muestra los nombres de los dispositivos
  const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach((t) => t.stop());
}
const constraints = () => ({ audio: { deviceId: cfg.inputId ? { exact: cfg.inputId } : undefined, echoCancellation: !!cfg.echo, noiseSuppression: !!cfg.noise, autoGainControl: !!cfg.agc, channelCount: 1 } });

// --------- prueba de micrófono (medidor en Ajustes) ---------
let testStream = null, testCtx = null, testRaf = 0;
export async function startMicTest(cb) {
  stopMicTest();
  testStream = await navigator.mediaDevices.getUserMedia(constraints());
  testCtx = new (window.AudioContext || window.webkitAudioContext)();
  const an = testCtx.createAnalyser(); an.fftSize = 512; const g = testCtx.createGain(); g.gain.value = cfg.micVol;
  testCtx.createMediaStreamSource(testStream).connect(g); g.connect(an);
  const buf = new Uint8Array(an.fftSize);
  const tick = () => { an.getByteTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; } cb(Math.min(1, Math.sqrt(s / buf.length) * 4)); testRaf = requestAnimationFrame(tick); };
  tick();
}
export function stopMicTest() { cancelAnimationFrame(testRaf); try { testStream && testStream.getTracks().forEach((t) => t.stop()); } catch (e) {} try { testCtx && testCtx.close(); } catch (e) {} testStream = testCtx = null; }

// --------- conexión ---------
const iceServers = () => (window.FAFI_CONFIG && window.FAFI_CONFIG.iceServers) || [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
function rms(an, buf) { an.getByteTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; } return Math.sqrt(s / buf.length) * 4; }
function applyOutput() {
  for (const p of peers.values()) {
    p.audio.volume = cfg.deafened ? 0 : Math.max(0, Math.min(1, cfg.outVol * (cfg.peerVol[p.id] ?? 1)));
    if (cfg.outputId && p.audio.setSinkId) p.audio.setSinkId(cfg.outputId).catch(() => {});
  }
}
function shouldSend() {
  if (cfg.muted || !cfg.enabled) return false;
  if (cfg.mode === 'open') return true;
  if (cfg.mode === 'ptt') return pttDown;
  const now = performance.now();
  if (level > cfg.threshold) holdUntil = now + 350;          // voz automática: se queda abierto un instante después de hablar
  return now < holdUntil;
}
function loop() {
  const buf = loop.buf || (loop.buf = new Uint8Array(512));
  if (analyser) level = Math.min(1, rms(analyser, buf));
  const on = active && shouldSend();
  if (stream) stream.getAudioTracks().forEach((t) => { t.enabled = on; });
  if (on !== sendOn) { sendOn = on; emit(); }
  let changed = false;
  for (const p of peers.values()) {
    if (!p.an) continue;
    const sp = rms(p.an, p.anBuf) > 0.05;
    if (sp !== p.speaking) { p.speaking = sp; changed = true; }
  }
  if (changed) emit();
}

function makePeer(id, name) {
  id = String(id);
  if (peers.has(id)) return peers.get(id);
  const pc = new RTCPeerConnection({ iceServers: iceServers() });
  const audio = new Audio(); audio.autoplay = true;
  const p = { id, name, pc, audio, speaking: false, an: null, anBuf: null };
  peers.set(id, p);
  if (dest) dest.stream.getAudioTracks().forEach((t) => pc.addTrack(t, dest.stream));
  pc.onicecandidate = (e) => { if (e.candidate) online.send('voice_signal', { to: id, data: { type: 'candidate', candidate: e.candidate } }); };
  pc.ontrack = (e) => {
    audio.srcObject = e.streams[0]; applyOutput(); audio.play().catch(() => {});
    try { const c = ctx || new (window.AudioContext || window.webkitAudioContext)(); const an = c.createAnalyser(); an.fftSize = 512; c.createMediaStreamSource(e.streams[0]).connect(an); p.an = an; p.anBuf = new Uint8Array(512); } catch (err) {}
  };
  pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) { if (pc.connectionState === 'failed') closePeer(id); } };
  applyOutput(); emit();
  return p;
}
function closePeer(id) {
  id = String(id);
  const p = peers.get(id); if (!p) return;
  try { p.pc.close(); } catch (e) {} try { p.audio.srcObject = null; } catch (e) {}
  peers.delete(id); emit();
}
async function offerTo(id, name) {
  id = String(id);
  const p = makePeer(id, name);
  const o = await p.pc.createOffer(); await p.pc.setLocalDescription(o);
  online.send('voice_signal', { to: id, data: { type: 'offer', sdp: p.pc.localDescription } });
}
async function onSignal(m) {
  const d = m.data; if (!d || !active) return;
  const id = String(m.from);
  if (d.type === 'offer') {
    const known = (online.players || []).find((x) => String(x.id) === String(id));
    const p = makePeer(id, (known && known.username) || 'Jugador');
    await p.pc.setRemoteDescription(d.sdp);
    const a = await p.pc.createAnswer(); await p.pc.setLocalDescription(a);
    online.send('voice_signal', { to: id, data: { type: 'answer', sdp: p.pc.localDescription } });
  } else if (d.type === 'answer') {
    const p = peers.get(id); if (p && p.pc.signalingState === 'have-local-offer') await p.pc.setRemoteDescription(d.sdp);
  } else if (d.type === 'candidate') {
    const p = peers.get(id); if (p && d.candidate) { try { await p.pc.addIceCandidate(d.candidate); } catch (e) {} }
  }
}

export async function join() {
  if (active || !cfg.enabled) return;
  if (!supported()) { toast('Tu navegador no admite chat de voz.'); return; }
  if (!online.room) return;
  try { stream = await navigator.mediaDevices.getUserMedia(constraints()); }
  catch (e) { toast('No se pudo usar el micrófono: ' + (e.name === 'NotAllowedError' ? 'permiso denegado.' : e.message)); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  srcNode = ctx.createMediaStreamSource(stream);
  micGain = ctx.createGain(); micGain.gain.value = cfg.micVol;
  analyser = ctx.createAnalyser(); analyser.fftSize = 512;
  dest = ctx.createMediaStreamDestination();
  srcNode.connect(micGain); micGain.connect(analyser); micGain.connect(dest);
  active = true; holdUntil = 0; clearInterval(loopT); loopT = setInterval(loop, 50);
  online.send('voice_join'); showBox(); emit();
}
export function leave() {
  if (!active && !stream) return;
  online.send('voice_leave');
  active = false; clearInterval(loopT);
  [...peers.keys()].forEach(closePeer);
  try { stream && stream.getTracks().forEach((t) => t.stop()); } catch (e) {} try { ctx && ctx.close(); } catch (e) {}
  stream = ctx = micGain = analyser = dest = srcNode = null; sendOn = false; level = 0;
  hideBox(); emit();
}
export const toggleMute = () => setConfig({ muted: !cfg.muted });

online.on('voice_peers', (m) => { if (!active) return; (m.peers || []).forEach((p) => offerTo(p.id, p.username).catch((e) => console.warn('voz', e))); });
online.on('voice_peer_left', (m) => closePeer(m.id));
online.on('voice_signal', (m) => onSignal(m).catch((e) => console.warn('voz', e)));
online.on('room_state', () => { if (cfg.enabled) join(); });
online.on('state', (m) => { if (m.state !== 'room') leave(); });

// --------- teclas: pulsar para hablar y silenciar ---------
const typing = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
window.addEventListener('keydown', (e) => {
  if (typing(e.target)) return;
  if (e.code === cfg.pttKey && !pttDown) { pttDown = true; }
  if (e.code === cfg.muteKey && !e.repeat && active) { e.preventDefault(); toggleMute(); }
}, true);
window.addEventListener('keyup', (e) => { if (e.code === cfg.pttKey) pttDown = false; }, true);
window.addEventListener('blur', () => { pttDown = false; });

// --------- panel flotante (quien habla) ---------
let box = null;
const esc = (s) => String(s).replace(/[<>&"']/g, '');
function toast(t) { if (window.fafiToast) window.fafiToast(esc(t), 5000); else console.warn(t); }
function showBox() {
  if (box) return;
  const st = document.createElement('style');
  st.textContent = '#voiceBox{position:fixed;left:14px;bottom:150px;z-index:9000;min-width:170px;background:rgba(8,12,18,.78);border-left:3px solid #e0a82e;padding:8px 10px;font:12px/1.3 system-ui,sans-serif;color:#dfe6ee;pointer-events:auto}#voiceBox b{display:block;letter-spacing:2px;font-size:10px;color:#e0a82e;margin-bottom:4px}#voiceBox .vr{display:flex;align-items:center;gap:7px;padding:2px 0}#voiceBox .vd{width:9px;height:9px;border-radius:50%;background:#444;flex:none}#voiceBox .vr.sp .vd{background:#4dff7a;box-shadow:0 0 8px #4dff7a}#voiceBox .vr.me.tx .vd{background:#4dff7a;box-shadow:0 0 8px #4dff7a}#voiceBox .vr.mu .vd{background:#ff5252}#voiceBox input{width:60px;margin-left:auto;accent-color:#e0a82e}#voiceBox button{margin-top:5px;background:#1b2230;border:1px solid #3a4558;color:#fff;font-size:10px;letter-spacing:1px;padding:4px 8px;cursor:pointer}';
  document.head.appendChild(st);
  box = document.createElement('div'); box.id = 'voiceBox'; document.body.appendChild(box);
  box.addEventListener('input', (e) => { const r = e.target.closest('[data-pv]'); if (r) { cfg.peerVol[r.dataset.pv] = +r.value; save(); applyOutput(); } });
  box.addEventListener('click', (e) => { if (e.target.id === 'vbMute') toggleMute(); if (e.target.id === 'vbDeaf') setConfig({ deafened: !cfg.deafened }); });
  onChange(drawBox);
  drawBox();
}
function hideBox() { if (box) { box.remove(); box = null; } }
function drawBox() {
  if (!box) return;
  const mode = cfg.mode === 'ptt' ? `Pulsar para hablar (${cfg.pttKey.replace('Key', '')})` : cfg.mode === 'open' ? 'Micrófono abierto' : 'Voz automática';
  box.innerHTML = '<b>CHAT DE VOZ</b>'
    + `<div class="vr me ${sendOn ? 'tx' : ''} ${cfg.muted ? 'mu' : ''}"><span class="vd"></span><span>Vos${cfg.muted ? ' (silenciado)' : ''}</span></div>`
    + getPeers().map((p) => `<div class="vr ${p.speaking ? 'sp' : ''}"><span class="vd"></span><span>${esc(p.name)}</span><input type="range" min="0" max="1" step="0.05" value="${cfg.peerVol[p.id] ?? 1}" data-pv="${esc(p.id)}" title="Volumen de ${esc(p.name)}"></div>`).join('')
    + `<div style="font-size:10px;color:#8a97a8;margin-top:4px">${mode}</div>`
    + `<button id="vbMute">${cfg.muted ? 'ACTIVAR MIC' : 'SILENCIAR MIC'}</button> <button id="vbDeaf">${cfg.deafened ? 'ESCUCHAR' : 'ENSORDECER'}</button>`;
}

window.fafiVoice = { getConfig, setConfig, join, leave, isActive };

// al salir de la sala con el boton SALIR tambien se cierra la voz
{ const orig = online.leaveRoom.bind(online); online.leaveRoom = () => { leave(); return orig(); }; }
