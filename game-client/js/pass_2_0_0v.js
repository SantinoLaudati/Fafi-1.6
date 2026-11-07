// FAFI PASS (estilo pase de batalla): 100 niveles, pase gratis y pase premium (de pago con dinero real: aun no habilitado, solo se muestra).
// La experiencia se gana jugando partidas de Defuse. El modo Aim no da experiencia ni coins: es solo practica.
// El progreso se guarda por usuario en localStorage con una firma; si se edita a mano, el pase se reinicia (disuasion, no seguridad real:
// para que sea a prueba de trampas el progreso tiene que validarse en el servidor).
import { SKINS_DB, RARITY, thumb } from './skins_2_0_0v.js';

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
// experiencia al terminar una partida de Defuse
window.fafiPassMatch = (m) => {
  const won = m && m.winner && m.winner === m.team;
  const xp = 120 + (m.kills | 0) * 20 + Math.round((m.dmg || 0) / 12) + (won ? 180 : 0);
  addXp(xp);
  try { window.fafiShowFloating('+' + xp + ' XP Fafi Pass'); } catch (e) {}
};


export const PREMIUM_USD = '4,99';
const COIN = '<i class="fcoin"></i>';
const LOCK = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M7 10V8a5 5 0 0 1 10 0v2h1.5A1.5 1.5 0 0 1 20 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-8A1.5 1.5 0 0 1 5.5 10H7zm2 0h6V8a3 3 0 0 0-6 0v2z" fill="currentColor"/></svg>';
const skinOf = (id) => SKINS_DB.find((x) => x.id === id);

let sel = null;
function art(r, big) {
  if (r.type === 'skin') return '<img class="fp-img' + (big ? ' big' : '') + '" data-skin="' + r.id + '" alt="">';
  return '<div class="fp-coin' + (big ? ' big' : '') + '">' + COIN + '<b>' + r.amount + '</b></div>';
}
function cell(lv, track, s) {
  const r = rewardFor(lv, track), list = track === 'free' ? s.claimed : s.claimedP, got = list.includes(lv);
  const open = lv <= levelOf(s.xp) && (track === 'free' || s.premium), can = open && !got;
  const col = (RARITY[r.rarity] || RARITY.comun).color, prem = track === 'prem';
  return '<div class="fp-c ' + (prem ? 'prem ' : '') + (got ? 'got ' : can ? 'can ' : '') + (sel && sel.lv === lv && sel.track === track ? 'sel' : '') + '" data-lv="' + lv + '" data-tr="' + track + '" style="--c:' + col + '">'
    + (prem && !s.premium ? '<span class="fp-lk">' + LOCK + '</span>' : '')
    + '<div class="fp-art">' + art(r, false) + '</div><div class="fp-nm">' + r.name + '</div>'
    + (got ? '<div class="fp-st ok">RECLAMADO</div>' : can ? '<div class="fp-st go">RECLAMAR</div>' : '<div class="fp-st">' + (prem && !s.premium ? 'PREMIUM' : 'NIVEL ' + lv) + '</div>') + '</div>';
}
async function fillThumbs(root) {
  for (const img of root.querySelectorAll('img[data-skin]')) {
    const sk = skinOf(img.dataset.skin); if (!sk) continue;
    try { img.src = await thumb(sk, img.classList.contains('big') ? 520 : 320, img.classList.contains('big') ? 300 : 190); img.classList.add('ok'); } catch (e) {}
  }
}
function render(scrollTo) {
  const root = document.getElementById('fafi16-tab-pass'); if (!root) return;
  const old = root.querySelector('.fp-scroll'), keep = old ? old.scrollLeft : 0;
  const s = load(), lv = levelOf(s.xp), into = lv >= PASS_LEVELS ? XP_PER_LEVEL : s.xp % XP_PER_LEVEL;
  if (!sel) sel = { lv: Math.min(PASS_LEVELS, Math.max(1, lv)), track: 'free' };
  let heads = '', fr = '', pr = '';
  for (let i = 1; i <= PASS_LEVELS; i++) { heads += '<div class="fp-n' + (i <= lv ? ' on' : '') + '">' + i + '</div>'; fr += cell(i, 'free', s); pr += cell(i, 'prem', s); }
  const r = rewardFor(sel.lv, sel.track), rc = RARITY[r.rarity] || RARITY.comun, sk = r.type === 'skin' ? skinOf(r.id) : null;
  root.innerHTML =
    '<div class="fp-top"><div class="fp-season"><em>TEMPORADA 1</em><b>FAFI PASS</b></div>'
    + '<div class="fp-lvbox"><span>NIVEL</span><b>' + lv + '</b></div>'
    + '<div class="fp-prog"><div class="fp-bar"><i style="width:' + Math.round(into / XP_PER_LEVEL * 100) + '%"></i></div><small>' + (lv >= PASS_LEVELS ? 'NIVEL MAXIMO' : into + ' / ' + XP_PER_LEVEL + ' XP') + '</small></div>'
    + '<div class="fp-buy"><div class="fp-pbox"><b>PASE PREMIUM</b><span>$' + PREMIUM_USD + ' USD</span></div><button class="fp-soon" disabled>PROXIMAMENTE</button></div></div>'
    + '<div class="fp-body"><div class="fp-tbl"><div class="fp-rows"><div class="fp-rl">NIVEL</div><div class="fp-rl t prem">PREMIUM</div><div class="fp-rl t">GRATIS</div></div>'
    + '<button class="fp-arr l" id="fpPrev">&lsaquo;</button><div class="fp-scroll"><div class="fp-grid"><div class="fp-line nums">' + heads + '</div><div class="fp-line">' + pr + '</div><div class="fp-line">' + fr + '</div></div></div><button class="fp-arr r" id="fpNext">&rsaquo;</button></div>'
    + '<div class="fp-side"><div class="fp-pv" style="--c:' + rc.color + '"><em>' + (sel.track === 'free' ? 'PASE GRATIS' : 'PASE PREMIUM') + ' / NIVEL ' + sel.lv + '</em>'
    + '<div class="fp-show">' + art(r, true) + '</div><b>' + r.name + '</b><span>' + rc.label + '</span><p>' + (r.type === 'skin' ? (sk ? 'Para: ' + sk.weapon.toUpperCase() + '. ' : '') + 'Si ya la tienes recibes ' + r.dup + ' coins.' : 'Fafi Coins para la tienda de cajas.') + '</p></div>'
    + '<button id="fpAll">RECLAMAR TODO</button></div></div>';
  const sc = root.querySelector('.fp-scroll');
  sc.scrollLeft = scrollTo != null ? Math.max(0, (scrollTo - 1) * 158 - 160) : keep;
  root.querySelectorAll('.fp-c').forEach((c) => c.addEventListener('click', () => {
    const l = +c.dataset.lv, t = c.dataset.tr;
    if (c.classList.contains('can')) claim(l, t);
    sel = { lv: l, track: t }; render();
  }));
  root.querySelector('#fpPrev').addEventListener('click', () => sc.scrollBy({ left: -790, behavior: 'smooth' }));
  root.querySelector('#fpNext').addEventListener('click', () => sc.scrollBy({ left: 790, behavior: 'smooth' }));
  root.querySelector('#fpAll').addEventListener('click', () => { for (let i = 1; i <= lv; i++) { claim(i, 'free'); claim(i, 'prem'); } render(); });
  fillThumbs(root);
}
window.fafiPassOpen = () => { sel = null; render(Math.max(1, levelOf(load().xp))); };
