// FAFI PASS: 100 niveles. Se gana experiencia jugando partidas de Defuse; cada nivel tiene una recompensa (coins o una skin).
// El progreso se guarda por usuario en localStorage (fafi_pass_<id>). El modo Aim no da experiencia ni coins: es solo practica.
import { SKINS_DB, RARITY } from './skins_2_0_0v.js';

export const PASS_LEVELS = 100;
export const XP_PER_LEVEL = 300;

const ORDER = { comun: 0, epica: 1, legendaria: 2 };
// skins del pase: de menos a mas raras, una cada 5 niveles (20 skins); el nivel 100 es la mas rara
const PASS_SKINS = SKINS_DB.slice().sort((a, b) => (ORDER[a.rarity] ?? 0) - (ORDER[b.rarity] ?? 0));
function skinForLevel(lv) {
  const i = Math.min(PASS_SKINS.length - 1, Math.floor((lv / 5 - 1) * PASS_SKINS.length / 20));
  return PASS_SKINS[Math.max(0, i)];
}
export function rewardFor(lv) {
  if (lv % 5 === 0 && PASS_SKINS.length) { const s = skinForLevel(lv); return { type: 'skin', id: s.id, name: s.name, rarity: s.rarity, dup: 300 }; }
  return { type: 'coins', amount: 40 + lv * 4, name: (40 + lv * 4) + ' coins' };
}

const key = () => 'fafi_pass_' + (window.currentUserId || 'local');
function load() { try { const d = JSON.parse(localStorage.getItem(key()) || '{}'); return { xp: d.xp | 0, claimed: Array.isArray(d.claimed) ? d.claimed : [] }; } catch (e) { return { xp: 0, claimed: [] }; } }
function save(s) { try { localStorage.setItem(key(), JSON.stringify(s)); } catch (e) {} }
export const levelOf = (xp) => Math.min(PASS_LEVELS, Math.floor(xp / XP_PER_LEVEL));

export function addXp(n) {
  const s = load(); s.xp = Math.min(PASS_LEVELS * XP_PER_LEVEL, s.xp + Math.max(0, Math.round(n))); save(s);
  return s;
}
function claim(lv) {
  const s = load();
  if (lv > levelOf(s.xp) || s.claimed.includes(lv)) return null;
  const r = rewardFor(lv);
  if (r.type === 'coins') window.fafiCoins = (window.fafiCoins || 0) + r.amount;
  else if (!(window.userInventory || []).includes(r.id)) window.userInventory.push(r.id);
  else window.fafiCoins = (window.fafiCoins || 0) + r.dup;
  s.claimed.push(lv); save(s);
  try { window.fafiSave && window.fafiSave(); window.fafiRefreshCoins && window.fafiRefreshCoins(); } catch (e) {}
  return r;
}

// experiencia al terminar una partida de Defuse
window.fafiPassMatch = (m) => {
  const won = m && m.winner && m.winner === m.team;
  const xp = 120 + (m.kills | 0) * 20 + Math.round((m.dmg || 0) / 12) + (won ? 180 : 0);
  addXp(xp);
  try { window.fafiShowFloating && window.fafiShowFloating('+' + xp + ' XP Fafi Pass'); } catch (e) {}
};

function render() {
  const root = document.getElementById('fafi16-tab-pass'); if (!root) return;
  const s = load(), lv = levelOf(s.xp), into = lv >= PASS_LEVELS ? XP_PER_LEVEL : s.xp % XP_PER_LEVEL;
  const pend = []; for (let i = 1; i <= lv; i++) if (!s.claimed.includes(i)) pend.push(i);
  let h = '<div class="fp-head"><div><h2>FAFI PASS</h2><div class="fp-sub">Juega Defuse para ganar experiencia y desbloquear recompensas en 100 niveles.</div></div>'
    + '<div class="fp-lv"><b>' + lv + '</b><span>NIVEL</span></div></div>'
    + '<div class="fp-bar"><i style="width:' + Math.round(into / XP_PER_LEVEL * 100) + '%"></i></div>'
    + '<div class="fp-xp">' + (lv >= PASS_LEVELS ? 'NIVEL MAXIMO' : into + ' / ' + XP_PER_LEVEL + ' XP para el nivel ' + (lv + 1)) + '</div>'
    + '<div class="fp-actions"><button class="fp-claimall" ' + (pend.length ? '' : 'disabled') + '>RECLAMAR TODO (' + pend.length + ')</button></div><div class="fp-grid">';
  for (let i = 1; i <= PASS_LEVELS; i++) {
    const r = rewardFor(i), got = s.claimed.includes(i), can = i <= lv && !got;
    const col = r.type === 'skin' ? (RARITY[r.rarity] || RARITY.comun).color : '#c9a64a';
    h += '<div class="fp-cell' + (got ? ' got' : can ? ' can' : i <= lv ? '' : ' lock') + '" style="--c:' + col + '"><em>' + i + '</em><b>' + r.name + '</b><span>' + (r.type === 'skin' ? 'SKIN' : 'COINS') + '</span>'
      + (can ? '<button data-lv="' + i + '">RECLAMAR</button>' : got ? '<u>RECLAMADO</u>' : '') + '</div>';
  }
  root.innerHTML = h + '</div>';
  root.querySelectorAll('button[data-lv]').forEach((b) => b.addEventListener('click', () => { claim(+b.dataset.lv); render(); }));
  const all = root.querySelector('.fp-claimall'); if (all) all.addEventListener('click', () => { pend.forEach(claim); render(); });
}
window.fafiPassOpen = render;
