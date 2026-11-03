// Menús del juego: inventario 3D (visor de armas arrastrable), tienda de cajas y el equipo equipado del menú principal.
import { SKINS_DB, DEFAULTS, RARITY, WEAPON_LABEL, WEAPON_ORDER, thumb, createWeaponViewer, skinById } from './skins.js';
import { CRATES, crateThumb, createCrateViewer, preloadCrate } from './cajas.js';

const $ = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstElementChild; };
const owned = () => window.userInventory || [];
const equippedId = (w) => (window.equippedSkins && window.equippedSkins[w]) || null;
const isEquipped = (s) => s.isDefault ? !equippedId(s.weapon) : equippedId(s.weapon) === s.id;
const ownsSkin = (s) => s.isDefault || owned().includes(s.id);
const rarityRank = { legendaria: 0, epica: 1, comun: 2 };
const sortSkins = (a, b) => WEAPON_ORDER.indexOf(a.weapon) - WEAPON_ORDER.indexOf(b.weapon) || (a.isDefault ? -1 : b.isDefault ? 1 : 0) || rarityRank[a.rarity] - rarityRank[b.rarity] || a.name.localeCompare(b.name);
const PATTERN_NAME = { camo: 'Camuflaje', stripes: 'Rayas', hex: 'Colmena', flame: 'Llamas', scales: 'Escamas', fade: 'Degradado', carbon: 'Fibra de carbono', digital: 'Camuflaje digital', tiger: 'Tigre', tech: 'Circuito luminoso', splatter: 'Salpicadura', galaxy: 'Nebulosa', waves: 'Oleaje', plates: 'Placas' };

// cola de miniaturas (una a una para no bloquear la interfaz)
let chain = Promise.resolve();
const queueThumb = (img, skin) => { chain = chain.then(async () => { try { img.src = await thumb(skin, 360, 205); img.classList.add('ok'); } catch (e) { } }); };

function overlay(id, cls) {
  let el = document.getElementById(id); if (el) el.remove();
  el = document.createElement('div'); el.id = id; el.className = 'm2-overlay ' + cls; document.body.appendChild(el); return el;
}
function coinsHtml() { return '<span class="m2-coin">◉</span> ' + (window.fafiCoins || 0).toLocaleString('es'); }

// =============================================================== INVENTARIO
let invState = null;
export function openInventory() {
  const root = overlay('inv2', 'inv2');
  root.innerHTML = '<div class="m2-head"><button class="m2-back">◂ VOLVER</button><h1>INVENTARIO</h1><div class="m2-sub" id="iv-count"></div><div class="m2-coins" id="iv-coins"></div></div>'
    + '<div class="iv-body"><aside class="iv-side"><div class="m2-h">ARMA</div><div class="iv-chips" id="iv-w"></div><div class="m2-h">RAREZA</div><div class="iv-chips" id="iv-r"></div>'
    + '<label class="iv-check"><input type="checkbox" id="iv-all"> Mostrar toda la colección</label></aside>'
    + '<section class="iv-list"><div class="iv-grid" id="iv-grid"></div></section>'
    + '<section class="iv-view"><div class="iv-stage"><canvas id="iv-canvas"></canvas><div class="iv-rarity-bar" id="iv-rbar"></div><div class="iv-hint">Arrastra para girar · rueda para acercar · doble clic para reiniciar</div></div>'
    + '<div class="iv-info" id="iv-info"></div></section></div>';
  const st = invState = { w: 'all', r: 'all', all: false, sel: null, viewer: null, timer: 0 };
  const grid = root.querySelector('#iv-grid');
  const chips = (el, items, key) => { el.innerHTML = items.map(([v, l]) => '<button class="iv-chip' + (st[key] === v ? ' on' : '') + '" data-v="' + v + '">' + l + '</button>').join(''); el.querySelectorAll('button').forEach(b => b.onclick = () => { st[key] = b.dataset.v; chips(el, items, key); build(); }); };
  const items = () => {
    let l = [...DEFAULTS, ...SKINS_DB]; if (!st.all) l = l.filter(ownsSkin);
    if (st.w !== 'all') l = l.filter(s => s.weapon === st.w); if (st.r !== 'all') l = l.filter(s => s.rarity === st.r);
    return l.sort(sortSkins);
  };
  const build = () => {
    const list = items(); grid.innerHTML = '';
    for (const s of list) {
      const own = ownsSkin(s), rc = RARITY[s.rarity];
      const c = $('<div class="iv-card r-' + s.rarity + (own ? '' : ' locked') + (isEquipped(s) ? ' eq' : '') + (st.sel && st.sel.id === s.id ? ' sel' : '') + '"><div class="iv-th"><img alt=""><i>🔒</i></div><div class="iv-nm">' + s.name.split('|').pop().trim() + '</div><div class="iv-mt">' + WEAPON_LABEL[s.weapon] + ' · ' + rc.label + '</div><span class="iv-badge">EQUIPADO</span></div>');
      c.onclick = () => select(s); c.ondblclick = () => { if (own) equip(s); };
      grid.appendChild(c); queueThumb(c.querySelector('img'), s);
    }
    root.querySelector('#iv-count').textContent = 'Skins: ' + owned().length + ' / ' + SKINS_DB.length;
    if (!st.sel || !list.find(x => x.id === st.sel.id)) select(list[0] || null);
  };
  const info = () => {
    const el = root.querySelector('#iv-info'), s = st.sel; if (!s) { el.innerHTML = '<div class="m2-empty">Sin objetos con ese filtro.</div>'; return; }
    const rc = RARITY[s.rarity], own = ownsSkin(s), eq = isEquipped(s);
    root.querySelector('#iv-rbar').style.background = 'linear-gradient(90deg,transparent,' + rc.color + ',transparent)';
    el.innerHTML = '<div class="iv-rar" style="color:' + rc.color + '">' + rc.label + ' · ' + WEAPON_LABEL[s.weapon] + '</div><h2>' + s.name.split('|').pop().trim() + '</h2>'
      + '<div class="iv-pat">' + (s.pattern ? 'Diseño: ' + (PATTERN_NAME[s.pattern.type] || s.pattern.type) : 'Acabado de fábrica') + '</div>'
      + '<div class="iv-actions">' + (own ? '<button class="m2-btn pri" id="iv-eq">' + (eq ? '✓ EQUIPADO' : '▶ EQUIPAR') + '</button>' : '<button class="m2-btn" disabled>🔒 NO LA TIENES · ábrela en las cajas</button>') + '<button class="m2-btn" id="iv-insp">⟳ INSPECCIONAR</button></div>';
    const be = el.querySelector('#iv-eq'); if (be) be.onclick = () => equip(s);
    el.querySelector('#iv-insp').onclick = () => st.viewer && st.viewer.inspect();
  };
  const select = (s) => { st.sel = s; grid.querySelectorAll('.iv-card').forEach((c, i) => { }); build_sel(); info(); if (s && st.viewer) st.viewer.show(s); };
  const build_sel = () => { const list = items(); grid.querySelectorAll('.iv-card').forEach((c, i) => c.classList.toggle('sel', !!st.sel && list[i] && list[i].id === st.sel.id)); };
  const equip = (s) => { if (typeof window.fafiSetSkin === 'function') window.fafiSetSkin(s.weapon, s.isDefault ? null : s.id); grid.querySelectorAll('.iv-card').forEach((c, i) => { const l = items()[i]; if (l) c.classList.toggle('eq', isEquipped(l)); }); info(); };
  chips(root.querySelector('#iv-w'), [['all', 'Todas'], ...WEAPON_ORDER.map(w => [w, WEAPON_LABEL[w]])], 'w');
  chips(root.querySelector('#iv-r'), [['all', 'Todas'], ['legendaria', 'Legendaria'], ['epica', 'Épica'], ['comun', 'Común']], 'r');
  root.querySelector('#iv-all').onchange = (e) => { st.all = e.target.checked; build(); };
  root.querySelector('.m2-back').onclick = closeInventory;
  const tick = () => { const c = root.querySelector('#iv-coins'); if (c) c.innerHTML = coinsHtml(); }; tick(); st.timer = setInterval(tick, 700);
  createWeaponViewer(root.querySelector('#iv-canvas')).then(v => { st.viewer = v; if (st.sel) v.show(st.sel); });
  build();
}
export function closeInventory() {
  const root = document.getElementById('inv2'); if (!root) return;
  if (invState) { clearInterval(invState.timer); invState.viewer && invState.viewer.dispose(); invState = null; }
  root.remove(); const m = document.getElementById('menus'); if (m) m.style.display = 'flex';
  if (window.fafiRefreshLoadout) window.fafiRefreshLoadout();
}

// =============================================================== TIENDA
let shopState = null;
export function openStore() {
  const root = overlay('shop2', 'shop2');
  root.innerHTML = '<div class="m2-head"><button class="m2-back">◂ VOLVER</button><h1>TIENDA DE CAJAS</h1><div class="m2-sub" id="sh-count"></div><div class="m2-coins" id="sh-coins"></div></div>'
    + '<div class="sh-body"><aside class="sh-crates" id="sh-crates"></aside>'
    + '<section class="sh-main"><div class="sh-stage"><canvas id="sh-canvas"></canvas></div><div class="sh-info" id="sh-info"></div></section></div>'
    + '<div class="sh-contents"><div class="m2-h" id="sh-ch"></div><div class="sh-grid" id="sh-grid"></div></div>';
  const st = shopState = { tier: 'advanced', viewer: null, timer: 0, busy: false };
  const crateList = root.querySelector('#sh-crates');
  const cards = Object.values(CRATES).map(c => {
    const el = $('<button class="sh-crate" data-t="' + c.id + '" style="--c:#' + c.color.toString(16).padStart(6, '0') + '"><img alt=""><div class="sc-nm">' + c.name + '</div><div class="sc-tag">' + c.tag + '</div><div class="sc-pr">◉ ' + c.price + '</div></button>');
    el.onclick = () => selectTier(c.id); crateList.appendChild(el); crateThumb(c.id).then(u => { el.querySelector('img').src = u; }); return el;
  });
  const grid = root.querySelector('#sh-grid');
  const selectTier = (t) => {
    st.tier = t; const c = CRATES[t];
    cards.forEach(el => el.classList.toggle('on', el.dataset.t === t)); st.viewer && st.viewer.setTier(t);
    const bars = ['legendaria', 'epica', 'comun'].filter(r => c.odds[r] > 0).map(r => '<div class="sh-odd"><span style="color:' + RARITY[r].color + '">' + RARITY[r].label + '</span><div><i style="width:' + c.odds[r] + '%;background:' + RARITY[r].color + '"></i></div><b>' + c.odds[r] + '%</b></div>').join('');
    root.querySelector('#sh-info').innerHTML = '<div class="sh-n">' + c.tag.toUpperCase() + '</div><h2>' + c.name + '</h2><div class="sh-odds">' + bars + '</div>'
      + '<button class="m2-btn pri big" id="sh-open">ABRIR CAJA · ◉ ' + c.price + '</button><div class="sh-dup">Si te toca una repetida recibes coins de vuelta (50 / 150 / 400).</div>';
    root.querySelector('#sh-open').onclick = () => buy(t); refreshBtn();
    // contenido: todas las skins de las rarezas que da la caja, con su probabilidad
    const rs = Object.keys(c.odds).filter(r => c.odds[r] > 0).sort((a, b) => rarityRank[a] - rarityRank[b]);
    root.querySelector('#sh-ch').textContent = 'CONTENIDO DE LA CAJA · ' + rs.map(r => RARITY[r].label).join(' / ');
    grid.innerHTML = '';
    for (const r of rs) {
      const l = SKINS_DB.filter(s => s.rarity === r).sort(sortSkins), each = (c.odds[r] / l.length).toFixed(1);
      for (const s of l) { const own = owned().includes(s.id), el = $('<div class="sh-item r-' + r + (own ? ' own' : '') + '"><div class="iv-th"><img alt=""></div><div class="iv-nm">' + s.name.split('|').pop().trim() + '</div><div class="iv-mt">' + WEAPON_LABEL[s.weapon] + ' · ' + each + '%</div>' + (own ? '<span class="iv-badge on">TUYA</span>' : '') + '</div>'); grid.appendChild(el); queueThumb(el.querySelector('img'), s); }
    }
  };
  const refreshBtn = () => {
    const b = root.querySelector('#sh-open'); if (!b) return; const c = CRATES[st.tier], need = c.price - (window.fafiCoins || 0);
    b.disabled = st.busy || need > 0; b.textContent = need > 0 ? 'FALTAN ◉ ' + need + ' · JUEGA AIM PARA GANAR COINS' : 'ABRIR CAJA · ◉ ' + c.price;
  };
  const buy = async (t) => {
    if (st.busy) return; st.busy = true; refreshBtn();
    try { await window.buyBox(t); } finally { st.busy = false; refreshBtn(); selectTier(st.tier); }
  };
  root.querySelector('.m2-back').onclick = closeStore;
  const tick = () => { const c = root.querySelector('#sh-coins'); if (c) c.innerHTML = coinsHtml(); const k = root.querySelector('#sh-count'); if (k) k.textContent = 'Colección: ' + owned().length + ' / ' + SKINS_DB.length; refreshBtn(); }; tick(); st.timer = setInterval(tick, 700);
  createCrateViewer(root.querySelector('#sh-canvas'), st.tier).then(v => { st.viewer = v; v.setTier(st.tier); });
  selectTier(st.tier);
}
export function closeStore() {
  const root = document.getElementById('shop2'); if (!root) return;
  if (shopState) { clearInterval(shopState.timer); shopState.viewer && shopState.viewer.dispose(); shopState = null; }
  root.remove(); const m = document.getElementById('menus'); if (m) m.style.display = 'flex';
  if (window.fafiRefreshLoadout) window.fafiRefreshLoadout();
}

// =============================================================== equipo equipado (menú principal)
export function renderLoadout(el) {
  if (!el) return;
  el.innerHTML = WEAPON_ORDER.map(w => { const id = equippedId(w), s = id ? skinById(id) : DEFAULTS.find(d => d.weapon === w), rc = RARITY[s.rarity]; return '<div class="lo-card r-' + s.rarity + '" data-w="' + w + '"><img alt=""><div class="lo-w">' + WEAPON_LABEL[w] + '</div><div class="lo-n" style="color:' + rc.color + '">' + (id ? s.name.split('|').pop().trim() : 'Estándar') + '</div></div>'; }).join('');
  el.querySelectorAll('.lo-card').forEach((c, i) => { const w = WEAPON_ORDER[i], id = equippedId(w); queueThumb(c.querySelector('img'), id ? skinById(id) : DEFAULTS.find(d => d.weapon === w)); c.onclick = () => window.openInventory && window.openInventory(); });
}
