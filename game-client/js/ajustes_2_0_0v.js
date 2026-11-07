// Ajustes avanzados del menú: configuración gráfica detallada + editor de mira.
// Los valores se guardan en localStorage ('fafi_gfx' y 'fafi_xh') y el juego los lee desde js/quality_2_0_0v.js y game_2_0_0v.js.
import { QUALITY, QUALITY_LEVELS, loadOverrides, saveOverrides } from './quality_2_0_0v.js';
import * as THREE from 'three';

const XH_KEY = 'fafi_xh', TIME_KEY = 'fafi_time';
const XH_DEF = { style: 'cruz', color: '#ffffff', len: 8, thick: 2, gap: 3, dot: false, dotSize: 2, outline: 1, alpha: 1, dynamic: true };
const XH_COLORS = ['#ffffff', '#3dff6a', '#ffe14a', '#2ad4ff', '#ff4a4a', '#ff4ad8', '#ff9a2e'];

const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

// ---------- mira ----------
export function loadCrosshair() { try { return { ...XH_DEF, ...(JSON.parse(lsGet(XH_KEY, '{}')) || {}) }; } catch (e) { return { ...XH_DEF }; } }
function crosshairCss(c) {
  const T = c.thick, L = c.len, O = c.outline, col = c.color, A = c.alpha;
  const sel = (s) => `#crosshair ${s},#axXh ${s}`;
  const show = c.style !== 'punto' && c.style !== 'circulo';
  const hideTop = c.style === 't';
  const ring = c.style === 'circulo' ? (L + 6) : 0;
  return `
${sel('.xh')}{background:${col};opacity:${A};box-shadow:0 0 0 ${O}px rgba(0,0,0,.85);display:${show ? 'block' : 'none'}}
${sel('.xh.t')}{width:${T}px;height:${L}px;left:${-T / 2}px;top:calc(-1 * var(--g) - ${L}px);${hideTop ? 'display:none' : ''}}
${sel('.xh.b')}{width:${T}px;height:${L}px;left:${-T / 2}px;top:var(--g)}
${sel('.xh.l')}{height:${T}px;width:${L}px;top:${-T / 2}px;left:calc(-1 * var(--g) - ${L}px)}
${sel('.xh.r')}{height:${T}px;width:${L}px;top:${-T / 2}px;left:var(--g)}
${sel('.dot')}{display:${c.dot || c.style === 'punto' ? 'block' : 'none'};width:${c.dotSize}px!important;height:${c.dotSize}px!important;left:${-c.dotSize / 2}px!important;top:${-c.dotSize / 2}px!important;background:${col}!important;opacity:${A};border-radius:50%;box-shadow:0 0 0 ${O}px rgba(0,0,0,.85)!important;position:absolute}
#crosshair::before,#axXh::before{display:${ring ? 'block' : 'none'}!important;content:'';position:absolute;box-sizing:border-box;width:${ring * 2}px!important;height:${ring * 2}px!important;left:${-ring}px!important;top:${-ring}px!important;border:${T}px solid ${col};border-radius:50%;opacity:${A};box-shadow:0 0 0 ${O}px rgba(0,0,0,.85), inset 0 0 0 ${O}px rgba(0,0,0,.85);background:none!important}
#crosshair::after{display:none!important}`;
}
export function applyCrosshair(c = loadCrosshair()) {
  let st = document.getElementById('xhStyle');
  if (!st) { st = document.createElement('style'); st.id = 'xhStyle'; document.head.appendChild(st); }
  st.textContent = crosshairCss(c);
  window.fafiXh = { gap: c.gap, dynamic: c.dynamic };
  const ax = document.getElementById('axXh'); if (ax) ax.style.setProperty('--g', c.gap + 'px');
  const cr = document.getElementById('crosshair'); if (cr && c.dynamic === false) cr.style.setProperty('--g', c.gap + 'px');
}

// ---------- gráficos ----------
const SHADOW_NAME = (t) => t === THREE.BasicShadowMap ? 'hard' : t === THREE.PCFSoftShadowMap ? 'soft' : 'pcf';
function effective(level) {
  const q = QUALITY[level] || QUALITY.high, o = loadOverrides(), dpr = window.devicePixelRatio || 1;
  const d = {
    resScale: q.resScale != null ? q.resScale : Math.min(dpr, q.maxPixelRatio) / dpr,
    dynRes: false, targetFps: 60, fpsCap: q.fpsCap || 0, aa: q.aa !== false, fov: 75, viewDist: 160, showFps: true,
    shadows: !!q.shadows, shadowSize: q.shadowMapSize, shadowRange: q.shadowRange || 30, shadowType: SHADOW_NAME(q.shadowType),
    tone: !!q.tone, exposure: q.exposure || 1.05, fogMul: q.fogMul, time: lsGet(TIME_KEY, 'auto'),
    fx: q.fx != null ? q.fx : 1, maxBots: q.maxBots, tex: q.tex
  };
  for (const k of ['dynRes', 'targetFps', 'fov', 'viewDist', 'showFps']) if (o[k] != null) d[k] = o[k];
  return d;
}

const pct = (v) => Math.round(v * 100) + '%';
const GFX = [
  { h: 'IMAGEN Y RENDIMIENTO', items: [
    { k: 'resScale', t: 'range', label: 'Escala de resolución', min: 0.4, max: 1.5, step: 0.05, fmt: pct, hint: 'Menos = más FPS (imagen más borrosa). Más de 100 % suaviza los bordes pero exige mucho a la placa.' },
    { k: 'dynRes', t: 'toggle', label: 'Resolución dinámica', hint: 'Baja la resolución sola cuando los FPS caen del objetivo y la recupera cuando sobra rendimiento. Recomendado para PC modestas.' },
    { k: 'targetFps', t: 'select', label: 'FPS objetivo (resolución dinámica)', opts: [[30, '30'], [45, '45'], [60, '60'], [90, '90'], [120, '120'], [144, '144']] },
    { k: 'fpsCap', t: 'select', label: 'Límite de FPS', opts: [[0, 'Sin límite'], [30, '30'], [60, '60'], [90, '90'], [120, '120'], [144, '144']], hint: 'Limitar los FPS baja el calor y el consumo.' },
    { k: 'aa', t: 'toggle', label: 'Antialiasing (MSAA)', reload: true, hint: 'Suaviza los bordes. Se aplica al reiniciar el juego.' },
    { k: 'fov', t: 'range', label: 'Campo de visión (FOV)', min: 60, max: 110, step: 1, fmt: (v) => v + '°' },
    { k: 'viewDist', t: 'range', label: 'Distancia de dibujado', min: 40, max: 300, step: 10, fmt: (v) => v + ' m', hint: 'Lo que está más lejos no se dibuja.' },
    { k: 'showFps', t: 'toggle', label: 'Mostrar contador de FPS' }
  ] },
  { h: 'SOMBRAS E ILUMINACIÓN', items: [
    { k: 'shadows', t: 'toggle', label: 'Sombras en tiempo real', hint: 'Lo que más cuesta en rendimiento.' },
    { k: 'shadowSize', t: 'select', label: 'Calidad de sombras', opts: [[512, 'Baja (512)'], [1024, 'Media (1024)'], [2048, 'Alta (2048)'], [4096, 'Ultra (4096)']] },
    { k: 'shadowRange', t: 'range', label: 'Alcance de sombras', min: 10, max: 80, step: 5, fmt: (v) => v + ' m' },
    { k: 'shadowType', t: 'select', label: 'Filtrado de sombras', opts: [['hard', 'Duro'], ['pcf', 'Suave'], ['soft', 'Muy suave']] },
    { k: 'tone', t: 'toggle', label: 'Tone mapping cinematográfico' },
    { k: 'exposure', t: 'range', label: 'Brillo / exposición', min: 0.6, max: 1.6, step: 0.05, fmt: (v) => v.toFixed(2) },
    { k: 'fogMul', t: 'range', label: 'Densidad de niebla', min: 0.3, max: 2, step: 0.05, fmt: (v) => v.toFixed(2) + 'x', hint: 'Más alto = la niebla empieza más lejos.' },
    { k: 'time', t: 'select', label: 'Hora del día (mapas libres y Defuse)', opts: [['auto', 'Automática (Mirage de día, el resto de noche)'], ['dia', 'Siempre de día'], ['noche', 'Siempre de noche']] }
  ] },
  { h: 'EFECTOS Y DETALLE', items: [
    { k: 'fx', t: 'range', label: 'Partículas e impactos', min: 0.2, max: 1.5, step: 0.1, fmt: pct, hint: 'Cantidad de polvo y esquirlas al disparar.' },
    { k: 'maxBots', t: 'range', label: 'Bots máximos en pantalla', min: 2, max: 10, step: 1, fmt: (v) => String(v) },
    { k: 'tex', t: 'select', label: 'Calidad de texturas de mapa', reload: true, opts: [['low', 'Baja'], ['med', 'Media']], hint: 'Se aplica la próxima vez que cargues un mapa.' }
  ] }
];

const CSS = `
#ax-root{margin-top:14px}
#ax-root .ax-h{margin:20px 0 6px;font-weight:800;letter-spacing:2px;font-size:12px;color:#d69f0f;text-transform:uppercase;border-bottom:1px solid rgba(214,159,15,.25);padding-bottom:4px}
#ax-root .ax-row{display:grid;grid-template-columns:minmax(150px,1.1fr) 2fr 70px;gap:10px;align-items:center;padding:6px 2px;border-bottom:1px solid rgba(255,255,255,.04)}
#ax-root .ax-row label{font-size:13px;color:#e8e8e8}
#ax-root .ax-row label small{display:block;color:#7c8088;font-size:10.5px;line-height:1.25;margin-top:2px}
#ax-root .ax-row input[type=range]{width:100%;accent-color:#d69f0f;margin:0}
#ax-root .ax-row select,#ax-root .ax-row input[type=color]{background:#14171d;color:#fff;border:1px solid #333a46;border-radius:4px;padding:5px 6px;font-size:12px;width:100%;grid-column:2/4;height:30px}
#ax-root .ax-row input[type=color]{padding:1px 3px;width:60px;grid-column:2}
#ax-root .ax-row b{color:#d69f0f;font-size:12px;text-align:right;font-weight:700}
#ax-root .ax-tg{grid-column:2/4;display:flex;align-items:center;gap:8px}
#ax-root .ax-tg input{width:18px;height:18px;accent-color:#d69f0f}
#ax-root .ax-tg span{font-size:12px;color:#9aa0aa}
#ax-root .ax-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
#ax-root .ax-btn{background:#1b1f27;border:1px solid #3a4150;color:#ddd;padding:8px 14px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:700;letter-spacing:1px}
#ax-root .ax-btn:hover{border-color:#d69f0f;color:#fff}
#ax-root .ax-note{font-size:11px;color:#8a909c;margin-top:6px}
#ax-root .ax-xh{display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start}
#ax-root .ax-xh .ax-ctl{flex:1 1 360px;min-width:0}
#axPrev{position:relative;width:200px;height:150px;border:1px solid #333a46;border-radius:6px;background:linear-gradient(135deg,#6e7f8d,#3d4a55 55%,#26313a);flex:0 0 auto;overflow:hidden}
#axXh{position:absolute;left:50%;top:50%;width:0;height:0;--g:3px}
#axXh .xh{position:absolute;pointer-events:none}
.ax-sw{display:flex;gap:6px;grid-column:2/4}
.ax-sw i{width:22px;height:22px;border-radius:50%;border:2px solid #333;cursor:pointer;display:block}
.ax-sw i.sel{border-color:#d69f0f;transform:scale(1.12)}
`;

function rowHtml(it, v) {
  const hint = it.hint ? `<small>${it.hint}${it.reload ? ' (requiere reiniciar)' : ''}</small>` : (it.reload ? '<small>Requiere reiniciar o recargar el mapa.</small>' : '');
  const lab = `<label for="ax_${it.k}">${it.label}${hint}</label>`;
  if (it.t === 'range') return `<div class="ax-row" data-k="${it.k}">${lab}<input type="range" id="ax_${it.k}" min="${it.min}" max="${it.max}" step="${it.step}" value="${v}"><b>${it.fmt(+v)}</b></div>`;
  if (it.t === 'toggle') return `<div class="ax-row" data-k="${it.k}">${lab}<div class="ax-tg"><input type="checkbox" id="ax_${it.k}" ${v ? 'checked' : ''}><span>${v ? 'Activado' : 'Desactivado'}</span></div></div>`;
  return `<div class="ax-row" data-k="${it.k}">${lab}<select id="ax_${it.k}">${it.opts.map(([val, name]) => `<option value="${val}" ${String(val) === String(v) ? 'selected' : ''}>${name}</option>`).join('')}</select></div>`;
}

export function initAjustes(opts = {}) {
  applyCrosshair();
  { const o = loadOverrides(); const fc = document.getElementById('fpsCounter'); if (fc && o.showFps === false) fc.style.visibility = 'hidden'; }
  const panel = document.getElementById('fafi16-tab-ajustes');
  if (!panel || document.getElementById('ax-root')) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'ax-root';
  const logout = document.getElementById('logoutBtn');
  panel.insertBefore(root, logout || null);

  const level = () => (opts.getQualityLevel ? opts.getQualityLevel() : 'medium');

  const renderGfx = () => {
    const eff = effective(level());
    let html = '<div class="ax-h" style="margin-top:8px">Gráficos avanzados</div><div class="ax-note">Cada opción pisa al preset elegido arriba. Si elegís un preset (Mínima, Baja, Media, Alta), se borran los ajustes manuales de calidad.</div>';
    for (const g of GFX) { html += `<div class="ax-h">${g.h}</div>`; for (const it of g.items) html += rowHtml(it, eff[it.k]); }
    html += '<div class="ax-btns"><button class="ax-btn" id="axAuto">AUTODETECTAR MI PC</button><button class="ax-btn" id="axReset">RESTABLECER GRÁFICOS</button></div><div class="ax-note" id="axMsg"></div>';
    const holder = root.querySelector('#axGfx'); holder.innerHTML = html;
    bindGfx(holder);
  };
  const commit = (k, val) => {
    if (k === 'time') { lsSet(TIME_KEY, val); }
    else { const o = loadOverrides(); o[k] = val; saveOverrides(o); }
    window.dispatchEvent(new Event('fafi-gfx-change'));
  };
  const bindGfx = (holder) => {
    holder.querySelectorAll('.ax-row').forEach((row) => {
      const k = row.dataset.k, it = GFX.flatMap((g) => g.items).find((x) => x.k === k), el = row.querySelector('input,select');
      if (it.t === 'range') {
        el.addEventListener('input', () => { row.querySelector('b').textContent = it.fmt(+el.value); });
        el.addEventListener('change', () => commit(k, +el.value));
      } else if (it.t === 'toggle') {
        el.addEventListener('change', () => { row.querySelector('span').textContent = el.checked ? 'Activado' : 'Desactivado'; commit(k, el.checked); if (it.reload) holder.querySelector('#axMsg').textContent = 'Reiniciá la página para aplicar el antialiasing.'; });
      } else {
        el.addEventListener('change', () => { const raw = el.value; commit(k, (k === 'shadowType' || k === 'tex' || k === 'time') ? raw : +raw); });
      }
    });
    holder.querySelector('#axReset').addEventListener('click', () => { saveOverrides({}); lsSet(TIME_KEY, 'auto'); window.dispatchEvent(new Event('fafi-gfx-change')); renderGfx(); });
    holder.querySelector('#axAuto').addEventListener('click', () => {
      const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 4;
      const lvl = (mem <= 4 || cores <= 2) ? 'min' : (mem <= 6 || cores <= 4) ? 'low' : cores <= 6 ? 'medium' : 'high';
      saveOverrides({ dynRes: true, targetFps: 60 });
      document.querySelector(`.q-btn[data-q="${lvl}"]`)?.click();
      const o = loadOverrides(); o.dynRes = true; o.targetFps = 60; saveOverrides(o);
      window.dispatchEvent(new Event('fafi-gfx-change')); renderGfx();
      holder.querySelector('#axMsg').textContent = `Detectado: ${cores} núcleos, ${mem} GB. Preset ${QUALITY_LEVELS.includes(lvl) ? QUALITY[lvl].label : lvl} con resolución dinámica a 60 FPS.`;
    });
  };

  // ----- editor de mira -----
  const renderXh = () => {
    const c = loadCrosshair();
    const sw = XH_COLORS.map((x) => `<i data-c="${x}" style="background:${x}" class="${x === c.color ? 'sel' : ''}"></i>`).join('');
    const rg = (k, label, min, max, step, fmt) => `<div class="ax-row" data-x="${k}"><label for="axx_${k}">${label}</label><input type="range" id="axx_${k}" min="${min}" max="${max}" step="${step}" value="${c[k]}"><b>${fmt(c[k])}</b></div>`;
    const tg = (k, label) => `<div class="ax-row" data-x="${k}"><label for="axx_${k}">${label}</label><div class="ax-tg"><input type="checkbox" id="axx_${k}" ${c[k] ? 'checked' : ''}><span>${c[k] ? 'Sí' : 'No'}</span></div></div>`;
    root.querySelector('#axXhBox').innerHTML = `
      <div class="ax-h">Personalización de mira</div>
      <div class="ax-xh">
        <div id="axPrev"><div id="axXh"><i class="xh t"></i><i class="xh b"></i><i class="xh l"></i><i class="xh r"></i><div class="dot"></div></div></div>
        <div class="ax-ctl">
          <div class="ax-row" data-x="style"><label for="axx_style">Estilo</label><select id="axx_style">${[['cruz', 'Cruz clásica'], ['t', 'Cruz en T'], ['punto', 'Solo punto'], ['circulo', 'Círculo']].map(([v, n]) => `<option value="${v}" ${v === c.style ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="ax-row"><label>Color</label><div class="ax-sw">${sw}</div></div>
          <div class="ax-row" data-x="color"><label for="axx_color">Color personalizado</label><input type="color" id="axx_color" value="${c.color}"></div>
          ${rg('len', 'Largo de las líneas', 1, 30, 1, (v) => v + ' px')}
          ${rg('thick', 'Grosor', 1, 8, 1, (v) => v + ' px')}
          ${rg('gap', 'Separación del centro', 0, 20, 1, (v) => v + ' px')}
          ${rg('outline', 'Contorno negro', 0, 3, 1, (v) => v + ' px')}
          ${rg('alpha', 'Opacidad', 0.2, 1, 0.05, (v) => Math.round(v * 100) + '%')}
          ${tg('dot', 'Punto central')}
          ${rg('dotSize', 'Tamaño del punto', 1, 8, 1, (v) => v + ' px')}
          ${tg('dynamic', 'Mira dinámica (se abre al moverte y disparar)')}
          <div class="ax-btns"><button class="ax-btn" id="axxReset">RESTABLECER MIRA</button></div>
        </div>
      </div>
      <div class="ax-note">La mira se aplica en tiempo real en la partida. Con arma de mira (AWP, VSS) al apuntar se muestra la retícula del zoom.</div>`;
    const box = root.querySelector('#axXhBox');
    const save = (patch) => { const cur = { ...loadCrosshair(), ...patch }; lsSet(XH_KEY, JSON.stringify(cur)); applyCrosshair(cur); return cur; };
    box.querySelectorAll('[data-x]').forEach((row) => {
      const k = row.dataset.x, el = row.querySelector('input,select');
      if (!el) return;
      if (el.type === 'range') el.addEventListener('input', () => { row.querySelector('b').textContent = k === 'alpha' ? Math.round(el.value * 100) + '%' : el.value + ' px'; save({ [k]: +el.value }); });
      else if (el.type === 'checkbox') el.addEventListener('change', () => { row.querySelector('span').textContent = el.checked ? 'Sí' : 'No'; save({ [k]: el.checked }); });
      else if (el.type === 'color') el.addEventListener('input', () => { save({ color: el.value }); box.querySelectorAll('.ax-sw i').forEach((i) => i.classList.toggle('sel', i.dataset.c === el.value)); });
      else el.addEventListener('change', () => save({ [k]: el.value }));
    });
    box.querySelectorAll('.ax-sw i').forEach((i) => i.addEventListener('click', () => { save({ color: i.dataset.c }); box.querySelectorAll('.ax-sw i').forEach((x) => x.classList.toggle('sel', x === i)); const ci = box.querySelector('#axx_color'); if (ci) ci.value = i.dataset.c; }));
    box.querySelector('#axxReset').addEventListener('click', () => { lsSet(XH_KEY, JSON.stringify(XH_DEF)); applyCrosshair({ ...XH_DEF }); renderXh(); });
    applyCrosshair(c);
  };

  root.innerHTML = '<div id="axGfx"></div><div id="axXhBox"></div>';
  renderGfx(); renderXh();
  window.addEventListener('fafi-gfx-refresh', renderGfx);
}
