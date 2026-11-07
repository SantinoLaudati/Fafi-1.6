// FAFI PASS (estilo pase de batalla): 100 niveles, pase gratis y pase premium (se compra con Fafi Coins).
// La experiencia se gana jugando partidas de Defuse. El modo Aim no da experiencia ni coins: es solo practica.
// El progreso se guarda por usuario en localStorage con una firma; si se edita a mano, el pase se reinicia (disuasion, no seguridad real:
// para que sea a prueba de trampas el progreso tiene que validarse en el servidor).
import { SKINS_DB, RARITY } from './skins_2_0_0v.js';

export const PASS_LEVELS = 100;
export const XP_PER_LEVEL = 300;
export const PREMIUM_PRICE = 1000;
const PAGE = 10;
const SEASON = 'TEMPORADA 1';

const ORDER = { comun: 0, epica: 1, legendaria: 2 };
const POOL = SKINS_DB.slice().sort((a, b) => (ORDER[a.rarity] ?? 0) - (ORDER[b.rarity] ?? 0));
function skinAt(k, n) { const i = Math.min(POOL.length - 1, Math.floor(k / n * POOL.length)); return POOL[Math.max(0, i)]; }

export function rewardFor(lv, track) {
  if (track === 'free') {
    if (lv % 10 === 0 && POOL.length) { const s = skinAt(lv / 10 - 1, 10); return { type: 'skin', id: s.id, name: s.name, rarity: s.rarity, dup: 250 }; }
    return { type: 'coins', amount: 20 + lv * 2, name: (20 + lv * 2) + ' coins', rarity: 'comun' };
  }
  if (lv % 5 === 0 && POOL.length) { const s = skinAt(lv / 5 - 1 + 0.5, 20); return { type: 'skin', id: s.id, name: s.name, rarity: s.rarity, dup: 400 }; }
  return { type: 'coins', amount: 50 + lv * 5, name: (50 + lv * 5) + ' coins', rarity: lv % 5 === 3 ? 'epica' : 'comun' };
}

const key = () => 'fafi_pass_' + (window.currentUserId || 'local');
const SALT = 'fafi-pass-v1';
function sig(o) { const t = JSON.stringify([o.xp, o.claimed, o.claimedP, o.premium]) + SALT + key(); let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return h >>> 0; }
function fresh() { return { xp: 0, claimed: [], claimedP: [], premium: false }; }
function load() {
  try {
    const raw = localStorage.getItem(key()); if (!raw) return fresh();
    const d = JSON.parse(raw);
    const s = { xp: d.xp | 0, claimed: Array.isArray(d.claimed) ? d.claimed : [], claimedP: Array.isArray(d.claimedP) ? d.claimedP : [], premium: !!d.premium };
    return d.s === sig(s) ? s : fresh();
  } catch (e) { return fresh(); }
}
function save(s) { try { localStorage.setItem(key(), JSON.stringify({ ...s, s: sig(s) })); } catch (e) {} }
export const levelOf = (xp) => Math.min(PASS_LEVELS, Math.floor(xp / XP_PER_LEVEL));

export function addXp(n) {
  const s = load(); s.xp = Math.min(PASS_LEVELS * XP_PER_LEVEL, s.xp + Math.max(0, Math.round(n))); save(s); return s;
}
function claim(lv, track) {
  const s = load(), list = track === 'free' ? s.claimed : s.claimedP;
  if (lv > levelOf(s.xp) || list.includes(lv) || (track === 'prem' && !s.premium)) return null;
  const r = rewardFor(lv, track);
  if (r.type === 'coins') window.fafiCoins = (window.fafiCoins || 0) + r.amount;
  else if (!(window.userInventory || []).includes(r.id)) window.userInventory.push(r.id);
  else window.fafiCoins = (window.fafiCoins || 0) + r.dup;
  list.push(lv); save(s);
  try { window.fafiSave && window.fafiSave(); window.fafiRefreshCoins && window.fafiRefreshCoins(); } catch (e) {}
  return r;
}
function buyPremium() {
  const s = load(); if (s.premium) return;
  if ((window.fafiCoins || 0) < PREMIUM_PRICE) { try { window.fafiShowFloating('Necesitas ' + PREMIUM_PRICE + ' Fafi Coins'); } catch (e) {} return; }
  window.fafiCoins -= PREMIUM_PRICE; s.premium = true; save(s);
  try { window.fafiSave && window.fafiSave(); window.fafiRefreshCoins && window.fafiRefreshCoins(); } catch (e) {}
}

// experiencia al terminar una partida de Defuse
window.fafiPassMatch = (m) => {
  const won = m && m.winner && m.winner === m.team;
  const xp = 120 + (m.kills | 0) * 20 + Math.round((m.dmg || 0) / 12) + (won ? 180 : 0);
  addXp(xp);
  try { window.fafiShowFloating('+' + xp + ' XP Fafi Pass'); } catch (e) {}
};

let page = 0, sel = null;
function cell(lv, track, s) {
  const r = rewardFor(lv, track), list = track === 'free' ? s.claimed : s.claimedP, got = list.includes(lv);
  const open = lv <= levelOf(s.xp) && (track === 'free' || s.premium), can = open && !got;
  const col = (RARITY[r.rarity] || RARITY.comun).color;
  return '<div class="fp-c ' + (got ? 'got ' : can ? 'can ' : '') + (track === 'prem' && !s.premium ? 'plock ' : '') + (sel && sel.lv === lv && sel.track === track ? 'sel' : '') + '" data-lv="' + lv + '" data-tr="' + track + '" style="--c:' + col + '">'
    + '<div class="fp-ico">' + (r.type === 'skin' ? 'SKIN' : '+' + r.amount) + '</div><div class="fp-nm">' + r.name + '</div>'
    + (got ? '<div class="fp-st">RECLAMADO</div>' : can ? '<div class="fp-st go">RECLAMAR</div>' : '<div class="fp-st">' + (track === 'prem' && !s.premium ? 'PREMIUM' : 'BLOQUEADO') + '</div>') + '</div>';
}
function render() {
  const root = document.getElementById('fafi16-tab-pass'); if (!root) return;
  const s = load(), lv = levelOf(s.xp), into = lv >= PASS_LEVELS ? XP_PER_LEVEL : s.xp % XP_PER_LEVEL, pages = PASS_LEVELS / PAGE;
  page = Math.max(0, Math.min(pages - 1, page));
  const from = page * PAGE + 1;
  if (!sel) sel = { lv: Math.min(PASS_LEVELS, Math.max(1, lv)), track: 'free' };
  let heads = '', fr = '', pr = '';
  for (let i = from; i < from + PAGE; i++) { heads += '<div class="fp-n' + (i <= lv ? ' on' : '') + '">' + i + '</div>'; fr += cell(i, 'free', s); pr += cell(i, 'prem', s); }
  const r = rewardFor(sel.lv, sel.track), rc = (RARITY[r.rarity] || RARITY.comun);
  root.innerHTML =
    '<div class="fp-top"><div class="fp-season"><em>' + SEASON + '</em><b>FAFI PASS</b></div>'
    + '<div class="fp-lvbox"><span>NIVEL</span><b>' + lv + '</b></div>'
    + '<div class="fp-prog"><div class="fp-bar"><i style="width:' + Math.round(into / XP_PER_LEVEL * 100) + '%"></i></div><small>' + (lv >= PASS_LEVELS ? 'NIVEL MAXIMO' : into + ' / ' + XP_PER_LEVEL + ' XP') + '</small></div>'
    + '<div class="fp-buy">' + (s.premium ? '<span class="fp-own">PASE PREMIUM ACTIVO</span>' : '<button id="fpBuy">OBTENER PREMIUM · ' + PREMIUM_PRICE + ' COINS</button>') + '</div></div>'
    + '<div class="fp-main"><div class="fp-tbl"><div class="fp-rows"><div class="fp-lab"></div><div class="fp-lab t">PREMIUM</div><div class="fp-lab t">GRATIS</div></div>'
    + '<div class="fp-cols"><div class="fp-nums">' + heads + '</div><div class="fp-row">' + pr + '</div><div class="fp-row">' + fr + '</div></div></div>'
    + '<div class="fp-side"><div class="fp-pv" style="--c:' + rc.color + '"><em>' + (sel.track === 'free' ? 'PASE GRATIS' : 'PASE PREMIUM') + ' · NIVEL ' + sel.lv + '</em><b>' + r.name + '</b><span>' + rc.label + '</span><p>' + (r.type === 'skin' ? 'Skin para tu arma. Si ya la tienes recibes ' + r.dup + ' coins.' : 'Fafi Coins para la tienda de cajas.') + '</p></div></div></div>'
    + '<div class="fp-nav"><button id="fpPrev"' + (page === 0 ? ' disabled' : '') + '>&lsaquo;</button><span>PAGINA ' + (page + 1) + ' / ' + pages + '</span><button id="fpNext"' + (page >= pages - 1 ? ' disabled' : '') + '>&rsaquo;</button>'
    + '<button id="fpAll">RECLAMAR TODO</button></div>';
  root.querySelectorAll('.fp-c').forEach((c) => c.addEventListener('click', () => {
    const l = +c.dataset.lv, t = c.dataset.tr;
    if (c.classList.contains('can')) claim(l, t);
    sel = { lv: l, track: t }; render();
  }));
  const b = root.querySelector('#fpBuy'); if (b) b.addEventListener('click', () => { buyPremium(); render(); });
  root.querySelector('#fpPrev').addEventListener('click', () => { page--; render(); });
  root.querySelector('#fpNext').addEventListener('click', () => { page++; render(); });
  root.querySelector('#fpAll').addEventListener('click', () => { for (let i = 1; i <= lv; i++) { claim(i, 'free'); claim(i, 'prem'); } render(); });
}
window.fafiPassOpen = () => { sel = null; page = Math.floor((Math.max(1, levelOf(load().xp)) - 1) / PAGE); render(); };
