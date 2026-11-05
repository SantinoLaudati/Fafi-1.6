// Mapa del modo historia: nodos sobre Europa; cada hecho se desbloquea al ver el anterior.
import { ASPECT, proj, drawBase } from './mapa_2_0_0v.js';

// root: overlay. chapters: guion.json. level: capítulo más alto desbloqueado (1..N+1). onPlay(id).
export function renderStoryMap(root, chapters, level, onPlay) {
  const N = chapters.length, playable = chapters.filter(c => c.playable).length, done = level > 1 ? playable : 0, unlocked = (id) => !!(chapters.find(c => c.id === id) || {}).playable;
  root.innerHTML = '<div class="sm-head"><h1>MODO HISTORIA</h1><div class="sm-sub">La Segunda Guerra Mundial · hechos que llevaron a Normandía</div>'
    + '<div class="sm-prog"><i style="width:' + (done / N * 100) + '%"></i><span>' + done + ' / ' + N + ' hechos completados</span></div></div>'
    + '<div class="sm-body"><div class="sm-map"><canvas></canvas><div class="sm-nodes"></div></div><div class="sm-panel"></div></div>'
    + '<button class="fafi16-btn-standard sm-back" id="closeCampBtn">VOLVER AL MENÚ</button>';
  const mapEl = root.querySelector('.sm-map'), canvas = mapEl.querySelector('canvas'), nodesEl = root.querySelector('.sm-nodes'), panel = root.querySelector('.sm-panel');
  let sel = 1;
  const layout = () => {
    const bw = root.clientWidth || innerWidth, bh = root.clientHeight || innerHeight, narrow = bw < 900;
    const maxW = narrow ? bw * 0.94 : bw * 0.62, maxH = narrow ? bh * 0.44 : bh * 0.66;
    const w = Math.min(maxW, maxH * ASPECT), h = w / ASPECT;
    mapEl.style.width = w + 'px'; mapEl.style.height = h + 'px';
    const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const c = canvas.getContext('2d'); drawBase(c, canvas.width, canvas.height, { tint: '#161b20', land: '#46543a' });
    // ruta entre hechos: continua y dorada hasta donde has llegado, discontinua después
    for (let i = 0; i < N - 1; i++) {
      const a = proj(chapters[i].map[0], chapters[i].map[1]), b = proj(chapters[i + 1].map[0], chapters[i + 1].map[1]), open = false;
      const mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - 0.09 * Math.hypot(b[0] - a[0], b[1] - a[1]) * 3;
      c.strokeStyle = open ? '#e0a912' : 'rgba(200,190,150,.35)'; c.lineWidth = Math.max(2, canvas.width / 260); c.setLineDash(open ? [] : [canvas.width / 90, canvas.width / 110]);
      c.beginPath(); c.moveTo(a[0] * canvas.width, a[1] * canvas.height); c.quadraticCurveTo(mx * canvas.width, my * canvas.height, b[0] * canvas.width, b[1] * canvas.height); c.stroke();
    }
    c.setLineDash([]);
  };
  const show = () => {
    nodesEl.querySelectorAll('.sm-node').forEach(n => n.classList.toggle('sel', +n.dataset.id === sel));
    const ch = chapters.find(c => c.id === sel), un = unlocked(sel);
    panel.innerHTML = un
      ? '<div class="sm-n">HECHO ' + ch.id + ' · ' + ch.date + '</div><h2>' + ch.title + '</h2><div class="sm-place">' + ch.place + '</div><p>' + ch.summary + '</p><button class="fafi16-btn-standard sm-play">' + (level > 1 ? '↻ VER DE NUEVO' : '▶ VER HECHO') + '</button>'
      : '<div class="sm-n">HECHO ' + ch.id + '</div><h2>🔒 Bloqueado</h2><p>Este hecho estará disponible próximamente.</p>';
    const pb = panel.querySelector('.sm-play'); if (pb) pb.addEventListener('click', () => onPlay(ch.id));
  };
  chapters.forEach((ch) => {
    const [x, y] = proj(ch.map[0], ch.map[1]), un = unlocked(ch.id), ok = ch.playable && level > 1;
    const b = document.createElement('button'); b.className = 'sm-node' + (un ? ' open' : ' locked') + (ok ? ' done' : '');
    b.style.left = x * 100 + '%'; b.style.top = y * 100 + '%'; b.dataset.id = ch.id; b.title = un ? ch.title : 'Bloqueado';
    b.innerHTML = '<span>' + (un ? (ok ? '✓' : ch.id) : '🔒') + '</span><em>' + (un ? ch.date : '???') + '</em>';
    b.addEventListener('click', () => { sel = ch.id; show(); });
    nodesEl.appendChild(b);
  });
  layout(); show();
  const onResize = () => { if (!root.isConnected) { removeEventListener('resize', onResize); return; } if (root.style.display !== 'none') layout(); };
  addEventListener('resize', onResize);
}
