import * as THREE from 'three';
import { makeLoader } from './loaders.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { QUALITY, SUN_DIR, loadQualityLevel, saveQualityLevel, applyQuality, updateSun, makeBlobShadow } from './quality.js';
import { createDefuse, TEAM_BADGE } from './defuse.js';
import { createGrenades, GRENADES } from './grenades.js';
import { loadWeaponPack, makeViewWeapon, makeWorldWeapon, repaintWeapon, setWeaponSkin } from './characters.js';
import { ZONAS } from './zonas.js';
import { openCrate, preloadCrate } from './cajas.js';
import { SKINS_DB, skinById, applyKnifeSkin } from './skins.js';
import * as menu2 from './menu2.js';
import { SFX } from './sfx.js';



/* === FAFI 1.6 MAIN port: todo el menú + configurables sobre motor V2 (sin colisiones con V2) === */
window.fafiCoins = 2000;
window.userInventory = [];
window.equippedSkins = { ak:null, m4:null, awp:null, deagle:null, knife:null };
window.currentUserId = null;
window.purchaseHistory = [];
window.friendsList = [];
window.campaignLevel = 1;
window.campaignActiveLevel = 0;
window.fafiAimSpeedMult = 1;
window.fafiSensVal = 5;
window.fafiQualityHigh = true;
window.achievements = [
  { id:'first_blood', name:'Recluta', desc:'Entra a tu primera partida V2.', unlocked:false },
  { id:'rich_boy', name:'Inversor de Fafi', desc:'Abre tu primera caja.', unlocked:false },
  { id:'campaign_hero', name:'Héroe de Guerra', desc:'Supera un nivel de campaña (600+ pts).', unlocked:false },
  { id:'dust_explorer', name:'Explorador Dust2', desc:'Entra a Dust II por primera vez.', unlocked:false },
  { id:'aim_pro', name:'Aim Pro', desc:'Consigue 1000+ pts en AIM.', unlocked:false }
];
// Skins: `zones` recolorea las zonas del modelo del arma (ver characters.js: wood/woodD madera, steel/steelD metal, poly polímero,
// chrome corredera, olive cuerpo del AWP, mag/magAk cargador). El cuchillo usa `colors.metal` (tinte del modelo).
const fafiSkinsDB = SKINS_DB;
function fafiSkinById(id){ return skinById(id); }
function fafiSaveGameData(){
  if(!window.currentUserId) return;
  try{
    localStorage.setItem('fafi_save_'+window.currentUserId, JSON.stringify({
      coins:window.fafiCoins, inventory:window.userInventory, equipped:window.equippedSkins,
      purchases:window.purchaseHistory, friends:window.friendsList, achievements:window.achievements,
      level:window.campaignLevel, sens:window.fafiSensVal, quality:window.fafiQualityHigh
    }));
  }catch(e){}
}
function fafiLoadGameData(){
  if(!window.currentUserId) return;
  try{
    const raw = localStorage.getItem('fafi_save_'+window.currentUserId);
    if(!raw) return;
    const d = JSON.parse(raw);
    if(typeof d.coins==='number') window.fafiCoins=d.coins;
    if(Array.isArray(d.inventory)) window.userInventory=d.inventory;
    if(d.equipped) window.equippedSkins=Object.assign({ak:null,awp:null,deagle:null,knife:null}, d.equipped);
    if(Array.isArray(d.purchases)) window.purchaseHistory=d.purchases;
    if(Array.isArray(d.friends)) window.friendsList=d.friends;
    if(Array.isArray(d.achievements)) window.achievements=d.achievements;
    if(d.level) window.campaignLevel=d.level;
    if(d.sens) window.fafiSensVal=d.sens;
    if(typeof d.quality==='boolean') window.fafiQualityHigh=d.quality;
  }catch(e){}
}
/* === INTEGRACIÓN BASE DE DATOS (backend PHP/MySQL del proyecto) === */
const FAFI_DB_SKINNAME = {
  'AK-47 Oro Macizo':'ak_oro', 'AK-47 Glaciar':'ak_hielo', 'AK-47 Táctica':'ak_tactical',
  'Sniper Vacío':'awp_void', 'Sniper Camuflaje':'awp_camo', 'AWP Magma':'awp_magma',
  'Deagle Carmesí':'d_crimson', 'Deagle Neón':'d_neon', 'Deagle Desierto':'d_desert',
  'Cuchillo Zafiro':'k_karambit', 'Cuchillo Sangre':'k_blood', 'Cuchillo Táctico':'k_tactical'
};
window.fafiDbArticles = {};
function fafiDbOnline(){
  return !!(window.authService && window.authService.isAuthenticated() && !window.authService.isDevMode());
}
function fafiDbApplyEquippedFromServer(eq){
  window.equippedSkins = { ak:null, m4:null, awp:null, deagle:null, knife:null };
  if(!eq || !eq.equipped_skins || typeof eq.equipped_skins!=='object') return;
  const wmap = { ak47:'ak', ak:'ak', sniper:'awp', awp:'awp', deagle:'deagle', knife:'knife' };
  for(const k in eq.equipped_skins){
    const idv = eq.equipped_skins[k];
    for(const sid in window.fafiDbArticles){
      if(String(window.fafiDbArticles[sid].articulo_id)===String(idv)){
        window.equippedSkins[wmap[window.fafiDbArticles[sid].arma_base] || window.fafiDbArticles[sid].arma_base] = sid;
      }
    }
  }
}
async function fafiApiLoadProfile(){
  if(!fafiDbOnline()) return;
  try{
    const coins = await window.apiService.getCoins();
    if(coins && typeof coins.coins==='number') window.fafiCoins=coins.coins;
    const inv = await window.apiService.getInventory();
    if(inv && Array.isArray(inv.inventory)){
      window.fafiDbArticles = {};
      const ids=[];
      for(const it of inv.inventory){
        const sid = FAFI_DB_SKINNAME[it.nombre];
        if(sid && fafiSkinById(sid)){
          ids.push(sid);
          if(!window.fafiDbArticles[sid]) window.fafiDbArticles[sid]={ articulo_id: it.articulo_id, arma_base: it.arma_base };
        }
      }
      window.userInventory = ids;
    }
    const eq = await window.apiService.getEquipped();
    fafiDbApplyEquippedFromServer(eq);
    const purch = await window.apiService.getPurchaseHistory();
    if(purch && Array.isArray(purch.history)){
      window.purchaseHistory = purch.history.map(h=>({ box: h.articulo_nombre || 'Caja', cost: Math.round(parseFloat(h.monto_gastado)||0) }));
    }
    const friends = await window.apiService.getFriends();
    if(friends && Array.isArray(friends.friends)){
      window.friendsList = friends.friends.filter(f=>f.estado==='aceptada').map(f=>f.username);
    }
    const ach = await window.apiService.getAchievements();
    if(ach && Array.isArray(ach.achievements)){
      const unlocked = new Set(ach.achievements.filter(a=>a.unlocked).map(a=>String(a.nombre||'').trim()));
      for(const a of window.achievements){ if(unlocked.has(a.id)) a.unlocked=true; }
    }
    const camp = await window.apiService.getCampaignProgress();
    if(camp && camp.progress){
      const lvl = parseInt(camp.progress.ultimo_nivel||1);
      if(!isNaN(lvl)) window.campaignLevel = Math.max(1, Math.min(8, lvl));
    }
    const cfg = await window.apiService.getConfig();
    if(cfg && cfg.config && cfg.config.sensibilidad_mouse){
      const s = parseFloat(cfg.config.sensibilidad_mouse);
      if(!isNaN(s) && s>0) window.fafiSensVal = Math.max(1, Math.min(20, Math.round(s)));
    }
  }catch(e){ console.warn('Fafi DB: no se pudo cargar perfil', e); }
}
async function fafiDbSaveConfig(){
  if(!fafiDbOnline()) return;
  try{ await window.apiService.updateConfig({ sensibilidad_mouse: window.fafiSensVal || 5 }); }catch(e){}
}
async function fafiDbAwardCoins(coins){
  if(!fafiDbOnline() || !(coins>0)) return;
  try{
    const d = await window.authService.request('/game/coins/earn', { method:'POST', body: JSON.stringify({ coins }) });
    if(d && typeof d.coins==='number') window.fafiCoins = d.coins;
  }catch(e){ console.warn('Fafi DB: guardar coins', e); }
}
async function fafiDbCompleteCampaign(nivel){
  if(!fafiDbOnline() || !nivel) return;
  try{
    const d = await window.apiService.completeCampaignLevel(nivel, 'normal');
    if(d && typeof d.total_coins==='number') window.fafiCoins = d.total_coins;
  }catch(e){ console.warn('Fafi DB: campaña', e); }
}
async function fafiDbPushEquipped(skinId){
  if(!fafiDbOnline() || !skinId) return;
  try{
    const art = window.fafiDbArticles[skinId];
    if(art){
      await window.apiService.equipSkin(art.articulo_id, art.arma_base);
      const eq = await window.apiService.getEquipped();
      fafiDbApplyEquippedFromServer(eq);
    }
  }catch(e){ console.warn('Fafi DB: equipar', e); }
}
function fafiResetUserState(){
  window.fafiCoins=2000; window.userInventory=[]; window.equippedSkins={ak:null,m4:null,awp:null,deagle:null,knife:null};
  window.purchaseHistory=[]; window.friendsList=[]; window.campaignLevel=1; window.fafiAimSpeedMult=1; window.fafiSensVal=5;
  for(const a of window.achievements){ a.unlocked=false; }
}
function fafiSetSkin(weapon, id){
  window.equippedSkins[weapon]=id||null; fafiSaveGameData(); fafiApplyEquippedSkins(); fafiUpdateCoinsDisplay();
  if(id) fafiDbPushEquipped(id);
}
window.fafiSetSkin=fafiSetSkin; window.fafiRefreshLoadout=()=>{ try{ menu2.renderLoadout(document.getElementById('fafi-current-loadout')); }catch(e){} };
function fafiUpdateCoinsDisplay(){
  const a=document.getElementById('coins-display-menu'); if(a) a.textContent='FAFI COINS: '+window.fafiCoins;
  const b=document.getElementById('coins-display-store'); if(b) b.textContent='FAFI COINS: '+window.fafiCoins;
  const mc=document.getElementById('mm-coins'); if(mc) mc.textContent=(window.fafiCoins||0).toLocaleString('es');
  const ms=document.getElementById('mm-skins'); if(ms) ms.textContent=(window.userInventory||[]).length+'/'+fafiSkinsDB.length;
  const mh=document.getElementById('mm-story'); if(mh) mh.textContent=((window.campaignLevel||1)>1?1:0)+"/1";
  const mu=document.getElementById('mm-user'); if(mu) mu.textContent=window.currentUserId||'JUGADOR';
  if(window.fafiRefreshLoadout) window.fafiRefreshLoadout();
}
function fafiUpdateProfileUI(){
  const hist=document.getElementById('purchase-history-list');
  if(hist) hist.innerHTML = window.purchaseHistory.length===0 ? "<div class='fafi-list-item'>No hay compras.</div>" : window.purchaseHistory.slice().reverse().map(p=>"<div class='fafi-list-item'><span>Caja "+p.box.toUpperCase()+"</span><span>-"+p.cost+" Coins</span></div>").join('');
  const fr=document.getElementById('friends-list');
  if(fr) fr.innerHTML = window.friendsList.length===0 ? "<div class='fafi-list-item'>Sin amigos.</div>" : window.friendsList.map(f=>"<div class='fafi-list-item'><span>"+f+"</span><span style='color:#4ade80;'>Online</span></div>").join('');
  const ach=document.getElementById('achievements-list');
  if(ach) ach.innerHTML = window.achievements.map(a=>"<div class='fafi-list-item "+(a.unlocked?'achievement-unlocked':'achievement-locked')+"'><div><b>"+a.name+"</b><br><small style='color:#777;'>"+a.desc+"</small></div><span>"+(a.unlocked?'✅':'🔒')+"</span></div>").join('');
  fafiUpdateCoinsDisplay();
}
function fafiUnlock(id){
  const a=window.achievements.find(x=>x.id===id);
  if(a && !a.unlocked){ a.unlocked=true; fafiSaveGameData(); fafiUpdateProfileUI(); }
}
function fafiApplySensitivity(){
  const v=window.fafiSensVal||5;
  try{ if(typeof controls!=='undefined' && controls) controls.pointerSpeed = v/5; }catch(e){}
  const sv=document.getElementById('sens-val'); if(sv) sv.textContent=v;
  const sl=document.getElementById('sens-slider'); if(sl && document.activeElement!==sl) sl.value=v;
}
function fafiApplyQuality(){ try{ applyGraphicsQuality(); }catch(e){} }
function fafiApplyEquippedSkins(){
  try{
    const sk=(w)=>{ const id=window.equippedSkins[w]; return id?fafiSkinById(id):null; };
    if(typeof akModel!=='undefined' && akModel) setWeaponSkin(akModel, sk('ak'));
    if(typeof awpModel!=='undefined' && awpModel) setWeaponSkin(awpModel, sk('awp'));
    if(typeof deagleModel!=='undefined' && deagleModel) setWeaponSkin(deagleModel, sk('deagle'));
    if(animW && animW.m4) setWeaponSkin(animW.m4.model, sk('m4'));
    if(typeof knifeModel!=='undefined' && knifeModel){ knifeModel.traverse(o=>{ if(o.isMesh && !o.userData._own){ o.userData._own=1; o.material=Array.isArray(o.material)?o.material.map(x=>x.clone()):o.material.clone(); } }); applyKnifeSkin(knifeModel, sk('knife')); }
  }catch(e){ console.warn('skins',e); }
}

function fafiHideShell(){
  const m=document.getElementById('menus'); if(m) m.style.display='none';
  const c=document.getElementById('campaign-map-overlay'); if(c) c.style.display='none';
  const s=document.getElementById('store-ui'); if(s) s.style.display='none';
  const iv=document.getElementById('inventory-ui'); if(iv) iv.style.display='none';
}
function fafiShowShell(){
  if(!window.currentUserId) return;
  fafiHideShell();
  const m=document.getElementById('menus'); if(m) m.style.display='flex';
  try{ if(typeof menu!=='undefined'&&menu) menu.style.display='none'; }catch(e){}
  fafiUpdateProfileUI(); fafiRenderEquipTab(); fafiApplySensitivity(); fafiApplyQuality();
}
async function fafiFinalizeAuth(user, isLocal){
  const username = (user && (user.username || user.id)) || 'DevPlayer';
  fafiResetUserState();
  window.currentUserId = username;
  document.getElementById('login-overlay').style.display='none';
  document.getElementById('player-name').textContent=username;
  const sub=document.getElementById('profile-sub');
  if(sub) sub.textContent = (!isLocal && fafiDbOnline()) ? 'DB Online (MySQL) • Motor V2 GLB' : 'Sin conexión • progreso guardado en este equipo';
  if(!isLocal && fafiDbOnline()){
    await fafiApiLoadProfile();
  } else {
    fafiLoadGameData();
  }
  fafiApplySensitivity(); fafiApplyQuality();
  fafiShowShell();
  try{ if(typeof showFloating==='function'&&typeof gameActive!=='undefined'&&gameActive) showFloating('¡Hola '+username+'!'); }catch(e){}
}
function fafiRenderEquipTab(){
  const g=document.getElementById('equip-grid'); if(!g) return;
  const order=[['ak','AK-47'],['m4','M4A4'],['awp','AWP'],['deagle','Desert Eagle'],['knife','Cuchillo']];
  g.innerHTML=order.map(([w,label])=>{
    const owned=fafiSkinsDB.filter(s=>s.weapon===w && window.userInventory.includes(s.id));
    const eq=window.equippedSkins[w];
    const opts=owned.map(s=>"<div class='fafi-list-item'><span class='rarity-"+s.rarity+"'>"+s.name+"</span><button class='btn-equip "+(eq===s.id?'equipped':'')+"' data-eq='"+s.id+"' data-w='"+w+"' style='width:110px;'>"+(eq===s.id?'EQUIPADO':'EQUIPAR')+"</button></div>").join('');
    return "<div style='margin-bottom:12px;'><span class='fafi16-label'>"+label+" — "+(eq?(fafiSkinById(eq)?.name||eq):'default')+"</span><div class='fafi-list-container' style='max-height:130px;'>"+opts+"<div class='fafi-list-item'><span>Default V2</span><button class='btn-equip' data-eq='' data-w='"+w+"' style='width:110px;'>QUITAR</button></div></div></div>";
  }).join('');
  g.querySelectorAll('button[data-eq]').forEach(b=>b.addEventListener('click',()=>{
    const w=b.getAttribute('data-w'), id=b.getAttribute('data-eq');
    if(id===''){ window.equippedSkins[w]=null; fafiSaveGameData(); fafiApplyEquippedSkins(); fafiRenderEquipTab(); fafiRenderInventory(); fafiUpdateCoinsDisplay(); }
    else fafiEquipSkin(id, w);
  }));
}
function fafiRenderInventory(){
  const list=document.getElementById('inventory-list'); if(!list) return;
  list.innerHTML='';
  if(window.userInventory.length===0){ list.innerHTML="<p style='color:#aaa;'>Sin skins. Abre cajas en Tienda.</p>"; return; }
  window.userInventory.forEach(skinId=>{
    const skin=fafiSkinById(skinId); if(!skin) return;
    const isEq=window.equippedSkins[skin.weapon]===skin.id;
    const card=document.createElement('div'); card.className='skin-card';
    card.addEventListener('mouseenter',()=>fafiPreviewSkin(skin.id, skin.weapon));
    card.innerHTML="<div class='skin-name rarity-"+skin.rarity+"'>"+skin.name+"</div><div class='skin-weapon'>"+skin.weapon.toUpperCase()+" • "+skin.rarity.toUpperCase()+"</div><button class='btn-equip "+(isEq?'equipped':'')+"'>"+(isEq?'EQUIPADO':'EQUIPAR')+"</button>";
    card.querySelector('button').addEventListener('click',()=>fafiEquipSkin(skin.id, skin.weapon));
    list.appendChild(card);
  });
}
function fafiEquipSkin(skinId, weaponId){
  window.equippedSkins[weaponId] = (window.equippedSkins[weaponId]===skinId)?null:skinId;
  fafiSaveGameData(); fafiRenderInventory(); fafiRenderEquipTab(); fafiApplyEquippedSkins(); fafiUpdateCoinsDisplay();
  const now = window.equippedSkins[weaponId];
  if(now) fafiDbPushEquipped(now);
}
let fafiPrevScene=null, fafiPrevCam=null, fafiPrevRen=null, fafiPrevModel=null, fafiPrevLoop=false;
function fafiBuildPreviewMesh_old(weaponId, skinId){
  const g=new THREE.Group();
  if(weaponId!=='knife'){
    const sk0=skinId?fafiSkinById(skinId):null;
    const real=makeWorldWeapon(weaponId,{ length:0.8, forward:false, skin: sk0&&sk0.zones?sk0.zones:undefined });
    if(real.children.length){ real.rotation.y=-Math.PI/2; const wrap=new THREE.Group(); wrap.add(real); return wrap; }
  }
  let cDark=0x111111, cGrey=0x2a2a2a, cMetal=0x555555, cAccent=0xff4655, cWood=0x5c3a21;
  const s=skinId?fafiSkinById(skinId):null;
  if(s&&s.colors){ if(s.colors.dark!==undefined)cDark=s.colors.dark; if(s.colors.body!==undefined)cGrey=s.colors.body; if(s.colors.metal!==undefined)cMetal=s.colors.metal; if(s.colors.accent!==undefined)cAccent=s.colors.accent; if(s.colors.wood!==undefined)cWood=s.colors.wood; }
  const mD=new THREE.MeshStandardMaterial({color:cDark,roughness:0.8,metalness:0.3});
  const mG=new THREE.MeshStandardMaterial({color:cGrey,roughness:0.6,metalness:0.5});
  const mM=new THREE.MeshStandardMaterial({color:cMetal,roughness:0.3,metalness:0.8});
  const mW=new THREE.MeshStandardMaterial({color:cWood,roughness:0.9,metalness:0.1});
  const mGlass=new THREE.MeshStandardMaterial({color:0x050505,roughness:0.1,metalness:0.9});
  if(weaponId==='ak'){
    const body=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.12,0.35),mM); const stock=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.1,0.22),mW); stock.position.set(0,-0.03,0.25);
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.35),mM); barrel.rotation.x=Math.PI/2; barrel.position.set(0,0.01,-0.35);
    g.add(body,stock,barrel);
  } else if(weaponId==='awp'){
    const body=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.1,0.65),mD); const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.016,0.7),mM); barrel.rotation.x=Math.PI/2; barrel.position.set(0,0,-0.6);
    const scope=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.35),mM); scope.rotation.x=Math.PI/2; scope.position.set(0,0.12,-0.1); g.add(body,barrel,scope);
  } else if(weaponId==='deagle'){
    const slide=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.06,0.28),mM); slide.position.set(0,0.05,-0.05);
    const grip=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.12,0.06),mD); grip.position.set(0,-0.02,0.05); g.add(slide,grip);
  } else {
    const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.02,0.12,16),mD); handle.rotation.x=Math.PI/2; handle.position.z=0.06;
    const blade=new THREE.Mesh(new THREE.BoxGeometry(0.006,0.035,0.2),mM); blade.position.set(0,0,-0.08); g.add(handle,blade);
  }
  g.scale.set(1.5,1.5,1.5); return g;
}
function fafiInitPreview(){
  const c=document.getElementById('inventory-preview-container'); if(!c||fafiPrevScene) return;
  try{
    fafiPrevScene=new THREE.Scene();
    fafiPrevCam=new THREE.PerspectiveCamera(50, Math.max(1,c.clientWidth)/Math.max(1,c.clientHeight||300), 0.1, 100);
    fafiPrevCam.position.set(0,0,1.2);
    fafiPrevRen=new THREE.WebGLRenderer({alpha:true,antialias:true});
    fafiPrevRen.setSize(c.clientWidth||380, c.clientHeight||320);
    c.insertBefore(fafiPrevRen.domElement, c.firstChild);
    fafiPrevScene.add(new THREE.AmbientLight(0xffffff,0.8));
    const d=new THREE.DirectionalLight(0xffffff,1.2); d.position.set(2,2,2); fafiPrevScene.add(d);
    const loop=()=>{ requestAnimationFrame(loop); if(fafiPrevModel) fafiPrevModel.rotation.y+=0.01; try{fafiPrevRen.render(fafiPrevScene,fafiPrevCam);}catch(e){} };
    if(!fafiPrevLoop){ fafiPrevLoop=true; loop(); }
  }catch(e){}
}
function fafiPreviewSkin(skinId, weaponId){
  if(!fafiPrevScene) return;
  try{
    if(fafiPrevModel) fafiPrevScene.remove(fafiPrevModel);
    fafiPrevModel=fafiBuildPreviewMesh_old(weaponId, skinId);
    const box=new THREE.Box3().setFromObject(fafiPrevModel); const ctr=box.getCenter(new THREE.Vector3()); fafiPrevModel.position.sub(ctr);
    fafiPrevScene.add(fafiPrevModel);
    const sk=fafiSkinById(skinId); const el=document.getElementById('preview-name');
    if(el&&sk){ el.textContent=sk.name; el.className='rarity-'+sk.rarity; el.style.position='absolute'; el.style.bottom='14px'; el.style.width='100%'; }
  }catch(e){}
}
let fafiOpeningBox=false;
async function fafiBuyBox(type){
  if(fafiOpeningBox) return;
  const cost = type==='basic'?200:(type==='advanced'?500:1000);
  if(window.fafiCoins<cost){ alert('¡No tienes suficientes FafiCoins! Juega AIM para ganar.'); return; }
  fafiOpeningBox=true;
  try{
    window.fafiCoins-=cost; window.purchaseHistory.push({box:type,cost});
    fafiUnlock('rich_boy');
    let roll=Math.random()*100, target='comun';
    if(type==='basic') target = roll<15?'epica':'comun';
    else if(type==='advanced') target = roll<20?'legendaria':(roll<70?'epica':'comun');
    else target = roll<50?'legendaria':'epica';
    let poss=fafiSkinsDB.filter(s=>s.rarity===target); if(!poss.length) poss=fafiSkinsDB;
    const won=poss[Math.floor(Math.random()*poss.length)];
    const dup=window.userInventory.includes(won.id);
    const refund = dup ? (won.rarity==='legendaria'?400:(won.rarity==='epica'?150:50)) : 0;
    if(dup) window.fafiCoins+=refund; else window.userInventory.push(won.id);
    fafiSaveGameData(); fafiUpdateCoinsDisplay(); fafiUpdateProfileUI(); fafiRenderInventory(); fafiRenderEquipTab();
    await loadWeaponPack();                    // el arma del premio se construye con el pack de armas
    document.getElementById('menus')&&(document.getElementById('menus').style.visibility='hidden');
    const st=document.getElementById('store-ui'); if(st) st.style.visibility='hidden';
    try{ await openCrate({ skin:won, boxType:type, refund }); }
    finally{ document.getElementById('menus')&&(document.getElementById('menus').style.visibility=''); if(st) st.style.visibility=''; }
  } finally { fafiOpeningBox=false; }
}

function fafiGiveSkin(won, rarity){
  const t=document.getElementById('popup-title'), d=document.getElementById('popup-desc'), n=document.getElementById('popup-skin-name');
  if(window.userInventory.includes(won.id)){
    const refund = rarity==='legendaria'?400:(rarity==='epica'?150:50);
    window.fafiCoins+=refund; if(t) t.textContent='¡SKIN DUPLICADA!'; if(d) d.textContent='Ya la tenías. +'+refund+' coins.'; if(n){ n.textContent=won.name; n.className='rarity-'+won.rarity; }
  } else {
    window.userInventory.push(won.id); if(t) t.textContent='¡NUEVA SKIN DESBLOQUEADA!'; if(d) d.textContent='Arma: '+won.weapon.toUpperCase()+' | '+won.rarity.toUpperCase()+' — Equípala en Equipamiento.'; if(n){ n.textContent=won.name; n.className='rarity-'+won.rarity; }
  }
  fafiSaveGameData(); fafiUpdateCoinsDisplay(); fafiUpdateProfileUI(); fafiRenderInventory(); fafiRenderEquipTab();
  const p=document.getElementById('skin-popup'); if(p) p.style.display='block';
}

const menu = document.getElementById('menu');
const gameEl = document.getElementById('game');
const playBtn = document.getElementById('playBtn');
const scoreEl = document.getElementById('scoreEl');
const hitsEl = document.getElementById('hitsEl');
const accEl = document.getElementById('accEl');
const timeEl = document.getElementById('timeEl');
const hitMarker = document.getElementById('hitMarker');
const resultOverlay = document.getElementById('resultOverlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const rScore = document.getElementById('rScore');
const rHits = document.getElementById('rHits');
const rAcc = document.getElementById('rAcc');
const rRank = document.getElementById('rRank');
const teamOverlay = document.getElementById('teamOverlay');

let scene, camera, renderer, controls, raycaster, akModel, mixer;
let targets = [];
let score=0, hits=0, shots=0, timeLeft=Infinity, gameActive=false, rafId, clock, targetSpawnTimer=0;
let audioCtx;
// arma: munición y animaciones
let isAiming=false, aimProgress=0, isReloading=false, reloadProgress=0;
let ammoInMag=30, maxMag=30, reserveAmmo=90;
let awpAmmo=10, awpMaxMag=10, awpReserve=30;
let akStoredAmmo=30, akStoredReserve=90;
let weaponBasePos=null, weaponAimPos=null;
let weaponBaseRot=null, weaponAimRot=null;
let recoilKick=0;
const baseFov=75, aimFov=52;
const awpAimFov=11;
// === VIEWMODEL: arma y manos se dibujan en un 2º pase con su propia cámara (capa 1) ===
// Con el FOV del mundo (75° vertical = ~107° horizontal a 16:9) las armas salían deformadas y enormes.
// El viewmodel usa un FOV horizontal fijo (84° ≈ 53° vertical a 16:9, como el viewmodel_fov de CS) y se
// aleja VM_PUSH en Z desde la cámara para conservar el encuadre calibrado; así no hay deformación gran
// angular ni se atraviesan paredes (se dibuja encima del mundo).
const VM_HFOV=84, VM_MAX_ASPECT=16/9;
let VM_PUSH=-0.32;
let viewCamera=null, vmRoot=null;
function vmVFov(){ const a=Math.min(innerWidth/Math.max(1,innerHeight), VM_MAX_ASPECT); return THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(VM_HFOV)/2)/a)); }
function vmResize(){ if(!viewCamera) return; viewCamera.aspect=innerWidth/Math.max(1,innerHeight); viewCamera.fov=vmVFov(); viewCamera.updateProjectionMatrix(); }
function vmAdd(obj){
  obj.traverse(o=>{ o.layers.set(1); if(o.isMesh){ o.castShadow=false; o.receiveShadow=false; o.frustumCulled=false; } });
  vmRoot.add(obj); return obj;
}
function vmLayer(obj){ obj.traverse(o=>{ if(!o.isLight) o.layers.set(1); }); return obj; }
function renderFrame(){
  renderer.render(scene, camera);                            // mundo (capa 0)
  if(!viewCamera || !vmRoot) return;
  camera.updateMatrixWorld();
  camera.matrixWorld.decompose(viewCamera.position, viewCamera.quaternion, viewCamera.scale);
  const bg=scene.background, sa=renderer.shadowMap.autoUpdate, ma=scene.matrixWorldAutoUpdate;
  scene.background=null; renderer.shadowMap.autoUpdate=false; scene.matrixWorldAutoUpdate=false;
  renderer.autoClear=false; renderer.clearDepth();
  renderer.render(scene, viewCamera);                        // viewmodel (capa 1) encima
  renderer.autoClear=true; scene.background=bg; renderer.shadowMap.autoUpdate=sa; scene.matrixWorldAutoUpdate=ma;
}
// cadencia y recoil realista AK-47
let fireRate = 105; // ms entre disparos ~ 571 rpm (AK real 600 rpm)
let lastShotTime = 0;
let viewRecoilX=0, viewRecoilY=0; // pitch/yaw acumulado para retroceso de cámara
let spreadAccum=0; // dispersión acumulada por ráfaga
let isHoldingShoot=false;
let recoilPatternStep=0;
// movimiento WASD + agachado con SHIFT — más lento base + peso por arma (cuchillo más liviano)
let keys={};
let baseMoveSpeed=2.35, baseCrouchSpeed=1.18; // base lenta (antes 3.8/1.9)
let moveSpeed=baseMoveSpeed, crouchSpeed=baseCrouchSpeed; // compat
// animación de caminata / salto / agachado (view bob) + anti bunny hop
let walkTime=0, viewBobY=0, lastViewBobY=0, landShake=0, jumpBob=0;
let prevGrounded=true;
// fatiga bunny hop: saltos seguidos cansan y bajan salto/velocidad
let jumpFatigueMult=1, consecutiveJumps=0, lastJumpTime=0, fatigueTimer=0;
let aimOffset = {x:-0.385, y:0.11, z:0.25}; // BAJADO: antes 0.13 dejaba la mira muy alta. Ahora 0.05 baja el arma para alinear alza con retícula
let playerVelocity = new THREE.Vector3(); // para suavizado opcional
const wallLimit = {xmin:-10.2, xmax:10.2, zmin:-11, zmax:16};
let isCrouching=false, crouchProgress=0;
const baseStandHeight=1.6, baseCrouchHeight=1.05, basePlayerRadius=0.25;
let standHeight=baseStandHeight, crouchHeight=baseCrouchHeight;
const eyeStandHeight = 0.85, eyeCrouchHeight = 0.58; // OJOS fijos a 0.85m (no escalan con , . K L)
let freeCam=false;
const SPAWN_ZONE_RADIUS = 3; // radio visual/zona de cada spawn marcado
let tSpawnOverride=null, ctSpawnOverride=null; // {x,z} marcados con < y Z
let tSpawnRing=null, ctSpawnRing=null;
// (las marcas guardadas se cargan por mapa en loadSpawnOverrides)
// Spawns PREDETERMINADOS (marcados en partida con < y Z, horneados al código)
let DEFAULT_T_SPAWN = { x: -4.063, z: 23.117 };   // se reemplazan al activar cada mapa
let DEFAULT_CT_SPAWN = { x: 7.444, z: -14.528 };
// física Dust2
let playerVelY=0, playerGrounded=false;
const pVel = new THREE.Vector3();     // velocidad horizontal del jugador (inercia: aceleración, fricción y poco control en el aire)
let dust2Colliders=[];
let dust2GroundY=null;
let playerRadius=basePlayerRadius;
let colScale=1, stepMax=0.68;   // escala de colisión del jugador según la escala del mapa (Office ~0.55x: puertas y pasillos más estrechos)
const playerGravity=-18;
const playerJumpForce=5.4;
let playerScale=1;
let playerRadiusScale=1;
// cargar escala guardada
try{
  const s = parseFloat(localStorage.getItem('fafi_playerScale'));
  const rs = parseFloat(localStorage.getItem('fafi_playerRadiusScale'));
  if(!isNaN(s) && s>=0.05 && s<=3.0){ playerScale=s; }
  if(!isNaN(rs) && rs>=0.05 && rs<=3.0){ playerRadiusScale=rs; }
  playerRadius=basePlayerRadius*playerScale*playerRadiusScale;
  standHeight=baseStandHeight*playerScale;
  crouchHeight=baseCrouchHeight*playerScale;
}catch(e){}
let playerDummy=null, dummyAK=null, dummyKnife=null, dummyAWP=null, dummyDeagle=null;
// balas trazadoras realistas
let bullets = [];
let spamHeat = 0; // crece con cada disparo seguido, hace el recoil exponencial
let consecutiveSpam = 0;
// inspección estilo CS:GO / Valorant - más lenta y sutil
let isInspecting=false, inspectProgress=0, inspectDuration=3.35;
// cuchillo
let knifeModel=null, knifeBasePos=null, knifeBaseRot=null;
let currentWeapon='ak'; // 'ak' | 'knife' | 'awp' | 'deagle'
let isKnifeSwinging=false, knifeSwingProgress=0, knifeSwingDir=1;
// AWP
let awpModel=null, awpBasePos=null, awpBaseRot=null, awpAimPos=null, awpAimRot=null;
let isBoltCycling=false, boltProgress=0;
const awpMag=10; const awpReserveInit=30;
// Deagle CS:GO
let deagleModel=null, deagleBasePos=null, deagleBaseRot=null, deagleAimPos=null, deagleAimRot=null;
let deagleAmmo=7, deagleMaxMag=7, deagleReserve=35;
// Mapas / modos
let gameMode='aim'; // 'aim' | 'dust2'
let playerTeam=null; // 't' | 'ct' (solo Dust2)
let teamReturn='menu'; // de dónde se abrió el selector de bando
let aimMapGroup=null, dust2Group=null;
let dust2Loaded=false, dust2Loading=false;
// === ECONOMÍA + INVENTARIO estilo CS:GO (solo Dust2) ===
// Inventario: cuchillo siempre, 1 secundaria (deagle), 1 primaria (ak O awp, excluyentes)
let money=3000;
const WEAPON_PRICES={ deagle:700, ak:2500, awp:4750, m4:3100 };
const PRIMARIES=['ak','m4','awp'];
let owned={ knife:true, deagle:false, ak:false, awp:false, m4:false };
let buyMenuOpen=false;

// Caja envolvente fiable para modelos con esqueleto (sin esto la caja de un SkinnedMesh sale gigante y el arma queda diminuta)
// El eje largo del arma debe quedar en -Z (cañón al frente). Los glb de AWP y Deagle vienen con el cañón en +X.
function orientYaw(obj){ const b=safeBox(obj), s=b.getSize(new THREE.Vector3()); return s.x > s.z*1.4 ? Math.PI/2 : 0; }
function safeBox(obj){ obj.updateMatrixWorld(true); obj.traverse(o=>{ if(o.isSkinnedMesh){ o.skeleton.update(); o.boundingBox=null; o.boundingSphere=null; } }); return new THREE.Box3().setFromObject(obj); }

// Calidad gráfica (ver js/quality.js)
let qualityLevel = loadQualityLevel();
let sunLight=null, hemiLight=null, fillLight=null, muzzleLight=null;
const lightPool=[];
function acquireLight(color,intensity,distance,pos){ const l=lightPool.find(x=>x.userData.free); if(!l) return null; l.userData.free=false; l.color.set(color); l.intensity=intensity; l.distance=distance; l.position.copy(pos); return l; }
function releaseLight(l){ if(!l) return; l.intensity=0; l.userData.free=true; }
function applyGraphicsQuality(){
  if(!renderer) return;
  const q = applyQuality(renderer, sunLight, qualityLevel);
  if(fillLight) fillLight.visible = q.fill && gameMode!=='dust2';
  if(scene && scene.fog && scene.userData.fogBase){ scene.fog.near=scene.userData.fogBase[0]*q.fogMul; scene.fog.far=scene.userData.fogBase[1]*q.fogMul; }
  // recompilar materiales (tipo de sombra / tone mapping)
  if(scene) scene.traverse(o=>{ if(o.material){ (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ m.needsUpdate=true; }); } });
  window.fafiQualityLevel = qualityLevel;
  document.querySelectorAll('.q-btn').forEach(b=>b.classList.toggle('sel', b.dataset.q===qualityLevel));
  const d=document.getElementById('q-desc'); if(d) d.textContent = q.desc;
}
function applyFog(){ const q=QUALITY[qualityLevel]; if(scene && scene.fog && scene.userData.fogBase){ scene.fog.near=scene.userData.fogBase[0]*q.fogMul; scene.fog.far=scene.userData.fogBase[1]*q.fogMul; } if(fillLight) fillLight.visible = q.fill && gameMode!=='dust2'; }
function setQualityLevel(level){
  if(!QUALITY[level]) return;
  qualityLevel = level; saveQualityLevel(level);
  applyGraphicsQuality();
  // los mapas pesados cargan otra resolución de textura: se recargan al volver a elegirlos
}

// THREE setup
function initThree(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1424);
  scene.fog = new THREE.Fog(0x0d1424, 18, 55); scene.userData.fogBase=[18,55];

  camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 100);
  camera.position.set(0,1.6,4);
  viewCamera = new THREE.PerspectiveCamera(vmVFov(), innerWidth/innerHeight, 0.02, 12);
  viewCamera.layers.set(1);
  vmRoot = new THREE.Group(); vmRoot.position.set(0,0,VM_PUSH); vmRoot.layers.set(1); camera.add(vmRoot);

  renderer = new THREE.WebGLRenderer({ antialias: QUALITY[qualityLevel].aa!==false, powerPreference:'high-performance', precision: QUALITY[qualityLevel].fpsCap?'mediump':'highp' });
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  // attach canvas once
  if(!document.getElementById('c')) {
    renderer.domElement.id='c';
    renderer.domElement.style.position='absolute';
    renderer.domElement.style.inset='0';
    gameEl.prepend(renderer.domElement);
  }

  // grupos de mapas separados
  aimMapGroup = new THREE.Group();
  dust2Group = new THREE.Group();
  dust2Group.visible = false;
  scene.add(aimMapGroup);
  scene.add(dust2Group);

  // luces globales (quedan siempre)
  hemiLight = new THREE.HemisphereLight(0xcde6ff, 0x1a1a22, 1.2);
  scene.add(hemiLight);
  sunLight = new THREE.DirectionalLight(0xfff2dd, 1.9);
  sunLight.position.set(30,52,20);
  sunLight.castShadow=true;
  scene.add(sunLight);
  scene.add(sunLight.target);
  fillLight = new THREE.PointLight(0x3aa0ff, 40, 20);
  fillLight.position.set(0,4,-8);
  scene.add(fillLight);
  // luces persistentes (añadir/quitar luces recompila todos los materiales: se reutilizan)
  for(let i=0;i<4;i++){ const l=new THREE.PointLight(0xffffff,0,10); l.userData.free=true; scene.add(l); lightPool.push(l); }
  muzzleLight=new THREE.PointLight(0xffcc66,0,3); camera.add(muzzleLight);
  [hemiLight, sunLight, fillLight, ...lightPool].forEach(l=>l.layers.enable(1));   // iluminan también el viewmodel (el fogonazo no: quemaba las manos)
  applyGraphicsQuality();

  // ---- AIM MAP (solo en modo AIM) ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40,40), new THREE.MeshStandardMaterial({color:0x1a2738, roughness:0.85}));
  floor.rotation.x=-Math.PI/2;
  floor.receiveShadow=true;
  aimMapGroup.add(floor);
  const grid = new THREE.GridHelper(40,40,0x2a3a52,0x1e2d42);
  aimMapGroup.add(grid);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(22,10,0.6), new THREE.MeshStandardMaterial({color:0x172033}));
  wall.position.set(0,4.5,-12);
  wall.receiveShadow=true;
  aimMapGroup.add(wall);
  const sideMat = new THREE.MeshStandardMaterial({color:0x111a2a});
  const leftW = new THREE.Mesh(new THREE.BoxGeometry(0.6,8,30), sideMat); leftW.position.set(-11,4,0); aimMapGroup.add(leftW);
  const rightW = new THREE.Mesh(new THREE.BoxGeometry(0.6,8,30), sideMat); rightW.position.set(11,4,0); aimMapGroup.add(rightW);
  for(let i=-8;i<=8;i+=4){
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12,12,12), new THREE.MeshStandardMaterial({color:0x3aa0ff, emissive:0x3aa0ff, emissiveIntensity:2}));
    bulb.position.set(i,7.5,-11.6);
    aimMapGroup.add(bulb);
    const pl = new THREE.PointLight(0x3aa0ff, 6, 5); pl.position.copy(bulb.position); aimMapGroup.add(pl);
  }

  controls = new PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());

  // block pointer lock events
  controls.addEventListener('lock', ()=>{ if(gameActive){ pauseOverlay.classList.remove('show'); if(typeof buyMenuOpen!=='undefined'&&buyMenuOpen){ const bm=document.getElementById('buyMenu'); if(bm) bm.classList.remove('show'); buyMenuOpen=false; } } });
  controls.addEventListener('unlock', ()=>{ if(gameActive && timeLeft>0 && !(typeof buyMenuOpen!=='undefined'&&buyMenuOpen)) pauseOverlay.classList.add('show'); });

  raycaster = new THREE.Raycaster();
  clock = new THREE.Clock();

  // armas en primera persona: modelos del pack "low poly weapon free pack" (assets/armas por defecto)
  buildPackWeapons();

  // cuchillo mariposa con sus brazos
  loadKnifeAnim();
  grenades.load().then(()=>buildGrenadeHolders());

  // dummy espectador
  playerDummy = new THREE.Group();
  const dummyBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.85, 4, 12), new THREE.MeshStandardMaterial({color:0x1e2a3a}));
  dummyBody.position.y=0.95;
  const dummyHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshStandardMaterial({color:0xe8c8a8}));
  dummyHead.position.y=1.52;
  const dummyBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,0.04,12), new THREE.MeshStandardMaterial({color:0x0f1a2a}));
  dummyBase.position.y=0.02;
  playerDummy.add(dummyBody); playerDummy.add(dummyHead); playerDummy.add(dummyBase);
  playerDummy.visible=false;
  playerDummy.scale.setScalar(playerScale);
  scene.add(playerDummy);
  // establecer AWP actual como predeterminada si ya lo ajustaste - guarda automáticamente lo que ves ahora



  window.addEventListener('resize', ()=>{
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    vmResize();
    renderer.setSize(innerWidth,innerHeight);
  });
  animate();
}

// === MAPAS (Dust II, Italy, Office) + PERSONAJES ===
// dust2Group / dust2Colliders / dust2Group.userData.bounds siempre apuntan al mapa ACTIVO.
// Italy y Office traen la luz horneada (materiales unlit) y texturas de 8192/4096 px: se usan las
// versiones reducidas de assets/Mapas para tt vs ct/optimizados (herramientas/optimizar-mapas.bat).
const MAP_DIR = 'assets/Mapas para tt vs ct/';
const MAPS = {
  dust2: {
    name:'DUST II', file:MAP_DIR+'de_dust2_-_cs_map.glb', size:64,
    logo:'assets/Logos mapas/dust 2 logo.jpg', baked:false,
    zones:ZONAS.dust2
  },
  italy: {
    name:'ITALY', files:{ low:MAP_DIR+'optimizados/cs_italy_1k.glb', med:MAP_DIR+'optimizados/cs_italy_2k.glb' }, size:74,
    logo:'assets/Logos mapas/italy logo.jpg', baked:true, zones:ZONAS.italy
  },
  office: {
    name:'OFFICE', files:{ low:MAP_DIR+'optimizados/cs_office_1k.glb', med:MAP_DIR+'optimizados/cs_office_2k.glb' }, size:72,
    logo:'assets/Logos mapas/office logo.jpg', baked:true, zones:ZONAS.office, nav:{ cell:0.5, headroom:0.95, step:0.6 }
  }
};
function mapFile(key){ const d=MAPS[key]; return d.files ? d.files[QUALITY[qualityLevel].tex] : d.file; }
let currentMapKey='dust2';
let currentMapFile=null;
let selectedMap='dust2';
try{ const sm=localStorage.getItem('fafi_map'); if(sm && MAPS[sm]) selectedMap=sm; }catch(e){}
const mapCache={};   // clave: key|archivo
let siteBoxGroup=null;

// BVH opcional: acelera los raycasts de colisión. Si el CDN falla el juego sigue igual (más lento).
const bvhPromise = import('three-mesh-bvh').then(m=>{
  THREE.BufferGeometry.prototype.computeBoundsTree = m.computeBoundsTree;
  THREE.BufferGeometry.prototype.disposeBoundsTree = m.disposeBoundsTree;
  THREE.Mesh.prototype.raycast = m.acceleratedRaycast;
  return true;
}).catch(e=>{ console.warn('three-mesh-bvh no disponible', e); return false; });

function loadSpawnOverrides(key){
  const sfx = '_'+key+'_v4';   // v4: las marcas guardadas con zonas anteriores ya no valen (spawns y sitios corregidos con los overview oficiales)
  tSpawnOverride=null; ctSpawnOverride=null;
  try{
    const okSp = (v)=> v && isFinite(v.x) && isFinite(v.z) && Math.abs(v.x)<200 && Math.abs(v.z)<200;
    const st = JSON.parse(localStorage.getItem('fafi_spawn_t'+sfx)||'null');
    const sc = JSON.parse(localStorage.getItem('fafi_spawn_ct'+sfx)||'null');
    if(okSp(st)) tSpawnOverride={x:st.x, z:st.z};
    if(okSp(sc)) ctSpawnOverride={x:sc.x, z:sc.z};
  }catch(e){}
}

// Busca suelo caminable (con espacio libre arriba y a los lados) y elige los dos puntos más
// alejados del nivel principal del mapa: uno para T y otro para CT.
function computeAutoSpawns(entry){
  const b=entry.bounds, cols=entry.colliders;
  const top=b.max.y+0.5, len=(b.max.y-b.min.y)+1;
  const N=20, pad=Math.max(2, Math.min(b.max.x-b.min.x, b.max.z-b.min.z)*0.06);
  const ray=new THREE.Raycaster();
  const DOWN=new THREE.Vector3(0,-1,0), UP=new THREE.Vector3(0,1,0);
  const SIDES=[new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0), new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1)];
  const all=[];
  for(let i=0;i<N;i++) for(let j=0;j<N;j++){
    const x=b.min.x+pad+(b.max.x-b.min.x-2*pad)*i/(N-1);
    const z=b.min.z+pad+(b.max.z-b.min.z-2*pad)*j/(N-1);
    ray.set(new THREE.Vector3(x,top,z), DOWN); ray.far=len;
    const hits=ray.intersectObjects(cols,false);
    for(const h of hits){
      if(!h.face) continue;
      const n=h.face.normal.clone().transformDirection(h.object.matrixWorld);
      if(n.y<0.7) continue;
      const p=h.point;
      ray.set(new THREE.Vector3(p.x,p.y+0.15,p.z), UP); ray.far=2.6;
      if(ray.intersectObjects(cols,false).length) continue;
      let blocked=false;
      for(const d of SIDES){
        ray.set(new THREE.Vector3(p.x,p.y+0.7,p.z), d); ray.far=1.2;
        if(ray.intersectObjects(cols,false).length){ blocked=true; break; }
      }
      if(!blocked) all.push({x:p.x, y:p.y, z:p.z});
    }
  }
  const cx=(b.min.x+b.max.x)/2, cz=(b.min.z+b.max.z)/2;
  if(all.length<2) return { t:{x:cx, z:b.max.z-4}, ct:{x:cx, z:b.min.z+4} };
  // nivel principal: pisos en bandas de 1 m; se elige el MÁS BAJO con presencia real
  // (>=30% de la banda más poblada) para caer en la calle y no sobre techos o muros.
  const hist=new Map();
  for(const p of all){ const k=Math.round(p.y); hist.set(k,(hist.get(k)||0)+1); }
  const score=new Map(); let maxC=0;
  for(const [k,c] of hist){ const cc=c+(hist.get(k-1)||0)+(hist.get(k+1)||0); score.set(k,cc); if(cc>maxC) maxC=cc; }
  let bestK=null;
  for(const [k,cc] of score){ if(cc>=maxC*0.3 && (bestK===null || k<bestK)) bestK=k; }
  let lvl=all.filter(p=>Math.abs(p.y-bestK)<=1.5);
  if(lvl.length<2) lvl=all;
  let A=lvl[0], B=lvl[1], bd=-1;
  for(let i=0;i<lvl.length;i++) for(let j=i+1;j<lvl.length;j++){
    const d=(lvl[i].x-lvl[j].x)**2+(lvl[i].z-lvl[j].z)**2;
    if(d>bd){ bd=d; A=lvl[i]; B=lvl[j]; }
  }
  const t = A.z>=B.z ? A : B, ct = A.z>=B.z ? B : A;
  return { t:{x:t.x, y:t.y, z:t.z}, ct:{x:ct.x, y:ct.y, z:ct.z} };
}

function activateMap(key){
  const e=mapCache[key+'|'+mapFile(key)];
  currentMapFile=mapFile(key);
  for(const c of [...dust2Group.children]) dust2Group.remove(c);
  tSpawnRing=null; ctSpawnRing=null; activeChars=[];
  dust2Group.add(e.model);
  dust2Group.userData.bounds=e.bounds.clone();
  dust2Colliders=e.colliders; colScale=Math.max(0.4, Math.min(1, (e.scale||1)*0.8)); stepMax = 0.68;
  currentMapKey=key;
  SFX.surface = key==='office' ? 'step_metal' : key==='italy' ? 'step_stone' : 'step';
  try{ applyAtmosphere(); }catch(e){}
  wallLimit.xmin=e.bounds.min.x+1.0; wallLimit.xmax=e.bounds.max.x-1.0;
  wallLimit.zmin=e.bounds.min.z+1.0; wallLimit.zmax=e.bounds.max.z-1.0;
  DEFAULT_T_SPAWN=e.spawns.t; DEFAULT_CT_SPAWN=e.spawns.ct;
  loadSpawnOverrides(key);
  dust2GroundY=null;
  refreshSpawnRings();
  dust2Loaded=true;
  try{ localStorage.setItem('fafi_map', key); }catch(err){}
  refreshMapPicker();
  console.log('Mapa activo:', key, 'bounds', e.bounds.min, e.bounds.max, 'spawns', e.spawns, 'colliders', e.colliders.length);
}

function loadMap(key, onDone){
  const def=MAPS[key];
  if(!def) return;
  const ck=key+'|'+mapFile(key);
  if(mapCache[ck]){ activateMap(key); if(onDone) onDone(); return; }
  if(dust2Loading) return;
  dust2Loading=true; refreshMapPicker();
  const loadingEl=document.getElementById('dust2Loading');
  if(loadingEl){ loadingEl.style.display='block'; loadingEl.textContent='Cargando '+def.name+'... 0%'; }
  makeLoader().load(mapFile(key), async (gltf)=>{
    const model=gltf.scene;
    if(def.rot) model.rotation.set(def.rot[0],def.rot[1],def.rot[2]);
    // Normalizar al tamaño del mapa y centrar
    const box=new THREE.Box3().setFromObject(model);
    const size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3());
    const s=def.size/Math.max(size.x,size.y,size.z);
    const fl=def.flip||[1,1,1];
    model.scale.set(s*fl[0], s*fl[1], s*fl[2]);
    model.position.set(0,0,0); model.updateMatrixWorld(true);
    model.position.sub(new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()));
    model.position.y+=0.02;
    model.traverse(o=>{
      if(!o.isMesh) return;
      o.castShadow=true; o.receiveShadow=true;
      const mats=Array.isArray(o.material)?o.material:[o.material];
      for(const m of mats){
        if(!m) continue;
        // una sola cara + transparentes del glb causaban paredes invisibles al mirar desde dentro
        m.side=THREE.DoubleSide; m.depthWrite=true;
        // hojas/vallas con alfa: recorte duro (sin ordenar transparencias); el resto opaco
        if(m.transparent || m.alphaTest){ if(m.map){ m.alphaTest=0.5; } m.transparent=false; m.opacity=1; }
        m.needsUpdate=true;
      }
    });
    model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model);
    const colliders=[]; model.traverse(o=>{ if(o.isMesh) colliders.push(o); });
    if(loadingEl) loadingEl.textContent='Preparando colisiones de '+def.name+'...';
    if(await bvhPromise){ for(const m of colliders){ try{ if(!m.geometry.boundsTree) m.geometry.computeBoundsTree(); }catch(err){} } }
    const entry={ model, bounds, colliders, spawns:null, scale:s };
    entry.spawns = def.zones ? { t:{x:def.zones.t.x, z:def.zones.t.z, y:def.zones.t.y}, ct:{x:def.zones.ct.x, z:def.zones.ct.z, y:def.zones.ct.y} } : computeAutoSpawns(entry);
    mapCache[ck]=entry;
    dust2Loading=false;
    if(loadingEl) loadingEl.style.display='none';
    activateMap(key);
    if(onDone) onDone();
  }, (xhr)=>{
    if(loadingEl && xhr.lengthComputable){
      loadingEl.textContent='Cargando '+def.name+'... '+Math.round(xhr.loaded/xhr.total*100)+'%';
    }
  }, (err)=>{
    console.warn('No se pudo cargar '+mapFile(key), err);
    dust2Loading=false;
    if(loadingEl){ loadingEl.textContent='Error cargando '+def.name; setTimeout(()=>{ loadingEl.style.display='none'; }, 1800); }
    refreshMapPicker();
    if(!mapCache[ck]){
      // Fallback simple: plano grande
      const fb=new THREE.Mesh(new THREE.PlaneGeometry(50,50), new THREE.MeshStandardMaterial({color:0x2a2a2a, roughness:0.9}));
      fb.rotation.x=-Math.PI/2; fb.receiveShadow=true; fb.updateMatrixWorld(true);
      const grp=new THREE.Group(); grp.add(fb);
      mapCache[ck]={ model:grp, bounds:new THREE.Box3(new THREE.Vector3(-25,-1,-25), new THREE.Vector3(25,4,25)), colliders:[fb], spawns:{ t:{x:0,z:20}, ct:{x:0,z:-20} } };
      activateMap(key);
      if(onDone) onDone();
    }
  });
}
function loadDust2Map(onDone){ loadMap(selectedMap, onDone); }

const MAP_INFO = {
  dust2:  { tag:'CLÁSICO', desc:'Dos sitios de bomba conectados por túneles largos y una plaza central abierta. Ideal para duelos de rifle y AWP.', stats:[['Sitios','A · B'],['Estilo','Abierto'],['Ritmo','Medio']] },
  italy:  { tag:'CIUDAD', desc:'Callejones, plazas y mercados mediterráneos con muchos ángulos y cobertura. Premia moverse en equipo.', stats:[['Sitios','A · B'],['Estilo','Urbano'],['Ritmo','Medio']] },
  office: { tag:'INTERIORES', desc:'Pasillos estrechos, oficinas y puertas: combate cercano donde la pistola y el rifle corto mandan.', stats:[['Sitios','A · B'],['Estilo','Cerrado'],['Ritmo','Rápido']] }
};
function refreshMapPicker(){
  const el=document.getElementById('mapPicker');
  if(!el) return;
  if(!el.dataset.built){
    el.dataset.built='1';
    for(const k of Object.keys(MAPS)){
      const b=document.createElement('button');
      const info=MAP_INFO[k]||{ tag:'', desc:'', stats:[] };
      b.className='map-pick'; b.dataset.map=k; b.innerHTML='<div class="mp-art"><img src="'+encodeURI(MAPS[k].logo)+'" alt=""><i class="mp-load"><b></b></i></div><div class="mp-body"><em>'+info.tag+'</em><strong>'+MAPS[k].name+'</strong><p>'+info.desc+'</p><div class="mp-stats">'+info.stats.map(s=>'<span><b>'+s[1]+'</b>'+s[0]+'</span>').join('')+'</div></div>';
      b.addEventListener('click', ()=>selectMap(k));
      el.appendChild(b);
    }
  }
  el.querySelectorAll('.map-pick').forEach(b=>{
    const k=b.dataset.map;
    b.classList.toggle('sel', k===selectedMap);
    b.classList.toggle('loading', dust2Loading && k===selectedMap);
  });
}
function mapReady(){ return dust2Loaded && !dust2Loading && currentMapKey===selectedMap && currentMapFile===mapFile(selectedMap); }
function selectMap(key){
  if(dust2Loading || !MAPS[key]) return;
  selectedMap=key;
  refreshMapPicker();
  if(!mapReady()) loadMap(key, refreshMapPicker);
}

// --- Personajes: T = Phoenix, CT = FBI. Sin clips en el glb -> idle procedural por huesos ---
const CHAR_SCALE = 64/4480; // 1 hu = 1/70 m (misma escala que Dust II)
const CHAR_FILES = { t:'assets/Personajes terror/tm_phoenix_v2-_csgo_terrorist_characters.glb', ct:'assets/Personajes terror/ctm_fbi_variantd_v2_-_csgo_karakteri.glb' };
const charModels = {};
let activeChars = [];
function loadCharacter(team, cb){
  if(charModels[team]){ cb(); return; }
  makeLoader().load(CHAR_FILES[team], (gltf)=>{
    const scene3=gltf.scene;
    const box=new THREE.Box3().setFromObject(scene3);
    scene3.scale.setScalar(CHAR_SCALE);
    scene3.position.y = -box.min.y*CHAR_SCALE;   // pies en y=0 del root
    scene3.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.frustumCulled=false; } });
    const root=new THREE.Group(); root.add(scene3);
    const find=(re)=>{ let r=null; scene3.traverse(o=>{ if(!r && o.isBone && re.test(o.name)) r=o; }); return r; };
    const rig={};
    const names={ spine1:/^spine_1_\d+$/, spine2:/^spine_2_\d+$/, spine3:/^spine_3_\d+$/, neck:/^neck_0_\d+$/, head:/^head_0_\d+$/, armL:/^arm_upper_L_\d+$/, armR:/^arm_upper_R_\d+$/ };
    for(const k in names){ const b=find(names[k]); if(b) rig[k]={ bone:b, base:b.quaternion.clone() }; }
    charModels[team]={ root, rig, phase:Math.random()*6.28 };
    cb();
  }, undefined, (err)=>{ console.warn('No se pudo cargar personaje '+team, err); cb(); });
}
const _qIdle=new THREE.Quaternion(), _eIdle=new THREE.Euler();
function updateCharacters(){
  if(!activeChars.length) return;
  const t=performance.now()*0.001;
  for(const ch of activeChars){
    const p=t+ch.phase;
    const set=(k,x,y,z)=>{ const r=ch.rig[k]; if(!r) return; _eIdle.set(x,y,z); r.bone.quaternion.copy(r.base).multiply(_qIdle.setFromEuler(_eIdle)); };
    const br=Math.sin(p*1.7);                    // respiración
    set('spine1', br*0.010, 0, 0);
    set('spine2', br*0.014, 0, 0);
    set('spine3', br*0.010, 0, 0);
    set('neck', 0, Math.sin(p*0.45)*0.22, 0);     // mira a los lados
    set('head', 0, Math.sin(p*0.45+0.4)*0.18, Math.sin(p*0.8)*0.02);
    set('armL', 0, 0, Math.sin(p*1.7)*0.012);
    set('armR', 0, 0, -Math.sin(p*1.7)*0.012);
  }
}
function placeCharacters(team){
  for(const c of activeChars) dust2Group.remove(c.root);
  activeChars=[];
  if(!dust2Group.userData.bounds) return;
  const foeTeam = team==='t' ? 'ct' : 't';
  const sp=getTeamSpawn(team);
  const put=(tm, pos, look)=>{
    const ch=charModels[tm]; if(!ch) return;
    const g=findSpawnGround(pos.x, pos.z, pos.y);
    ch.root.position.set(g?g.x:pos.x, g?g.y:(pos.y||0), g?g.z:pos.z);
    ch.root.rotation.y=Math.atan2(look.x-pos.x, look.z-pos.z);
    dust2Group.add(ch.root);
    activeChars.push(ch);
  };
  // rival en su spawn mirando hacia ti; compañero 2.2 m al costado del tuyo
  const dx=sp.foe.x-sp.pos.x, dz=sp.foe.z-sp.pos.z, L=Math.hypot(dx,dz)||1;
  const sx=-dz/L, sz=dx/L;   // vector lateral (el poste del spawn queda libre)
  put(foeTeam, { x:sp.foe.x+sx*1.6, z:sp.foe.z+sz*1.6, y:sp.foe.y }, sp.pos);
  put(team, { x:sp.pos.x+sx*2.2, z:sp.pos.z+sz*2.2, y:sp.pos.y }, sp.foe);
}
function ensureCharacters(team){
  loadCharacter('t', ()=> loadCharacter('ct', ()=>{ if(gameActive && gameMode==='dust2') placeCharacters(team); }));
}


// === ARMAS DEL PACK (low poly weapon free pack) + M4 PROCEDURAL + CUCHILLO MARIPOSA CON SUS BRAZOS ===
// Todos los modelos salen de assets/armas por defecto/low_poly_weapon_free_pack.glb (AK, M4, sniper=AWP,
// magnum=Deagle). Ese pack no trae animaciones: recarga, inspección y sacar el arma son procedurales.
const WEAPON_LABEL = { ak:'AK-47', knife:'CUCHILLO', awp:'AWP', deagle:'DESERT EAGLE', m4:'M4A4' };
const ANIM_WEAPONS = {      // armas "generales" (M4): modelo del pack + animaciones procedurales
  m4: { label:'M4A4', node:'m4', size:1.02, mag:30, reserve:90, fireMs:90, price:3100, aim:true,
        basePos:[0.38,-0.35,-0.74], aimDelta:[-0.36,0.135,0.26] }
};
const animAmmo = { m4:{ ammo:30, reserve:90 } };
const animW = {};
let knifeAnim = null;

async function buildPackWeapons(){
  await loadWeaponPack();
  const mk=(id,len,pos)=>{ const g=makeViewWeapon(id,len); g.position.set(pos[0],pos[1],pos[2]); g.traverse(o=>{ if(o.isMesh) o.frustumCulled=false; }); return g; };
  // AK-47
  akModel=mk('ak',1.06,[0.40,-0.34,-0.74]);
  weaponBasePos=akModel.position.clone(); weaponBaseRot=akModel.rotation.clone();
  weaponAimPos=weaponBasePos.clone().add(new THREE.Vector3(aimOffset.x,aimOffset.y,aimOffset.z)); weaponAimRot=new THREE.Euler(0,0,0);
  akModel.visible=(currentWeapon==='ak'); vmAdd(akModel);
  // AWP (sniper)
  awpModel=mk('awp',1.12,[0.40,-0.28,-0.76]); awpModel.rotation.y=0.05;
  awpBasePos=awpModel.position.clone(); awpBaseRot=awpModel.rotation.clone();
  awpAimPos=awpBasePos.clone().add(new THREE.Vector3(-0.37,0.12,0.32)); awpAimRot=new THREE.Euler(0,0,0);
  awpModel.visible=(currentWeapon==='awp'); vmAdd(awpModel);
  // Desert Eagle (magnum)
  deagleModel=mk('deagle',0.8,[0.22,-0.30,-0.90]); deagleModel.rotation.y=0.3;     // girada hacia dentro para ver el costado del arma
  deagleBasePos=deagleModel.position.clone(); deagleBaseRot=deagleModel.rotation.clone();
  deagleAimPos=deagleBasePos.clone().add(new THREE.Vector3(-0.16,0.10,0.52)); deagleAimRot=new THREE.Euler(0,0,0);
  deagleModel.visible=(currentWeapon==='deagle'); vmAdd(deagleModel);
  // M4A4
  const def=ANIM_WEAPONS.m4;
  const holder=new THREE.Group(); const model=mk(def.node,def.size,[0,0,0]); holder.add(model);
  const basePos=new THREE.Vector3(...def.basePos);
  holder.position.copy(basePos); holder.visible=(currentWeapon==='m4'); vmAdd(holder);
  animW.m4={ holder, model, basePos, aimPos:basePos.clone().add(new THREE.Vector3(...def.aimDelta)), state:'idle', until:0, t0:0 };
  scene.add(camera);
  camera.updateMatrixWorld(true);

  console.log('Armas del pack cargadas: AK-47, M4A4, AWP, Desert Eagle');
  fafiApplyEquippedSkins();
  updateWeaponVisibility(); updateAmmoHUD();
}

function animWeaponDraw(key){
  const w=animW[key]; if(!w) return;
  w.state='draw'; w.t0=performance.now(); w.until=w.t0+520;
}
function animWeaponShoot(){ /* el retroceso lo da recoilKick */ }

function updateAnimWeapon(dt, wallPush){
  const key=currentWeapon, def=ANIM_WEAPONS[key], w=animW[key];
  if(!w) return;
  const k=(r)=>1-Math.pow(0.001, dt*r);
  const now=performance.now();
  // --- estados ---
  if(isReloading && w.state!=='reload'){ w.state='reload'; }
  else if(!isReloading && w.state==='reload'){ w.state='idle'; }
  if(isInspecting && w.state!=='inspect' && w.state!=='reload'){ w.state='inspect'; }
  else if(!isInspecting && w.state==='inspect'){ w.state='idle'; }
  if(w.state==='draw' && now>w.until) w.state='idle';
  if(w.state==='reload'){
    reloadProgress += dt/2.2;
    const rf=document.getElementById('reloadFill'); if(rf) rf.style.width=(Math.min(reloadProgress,1)*100)+'%';
    if(reloadProgress>=1) finishReload();
  }
  if(w.state==='inspect'){
    inspectProgress += dt/3.2;
    if(inspectProgress>=1){ isInspecting=false; inspectProgress=0; updateAmmoHUD(); }
  }
  // --- mira / FOV ---
  const aimOn = def.aim && isAiming;
  aimProgress = THREE.MathUtils.lerp(aimProgress, aimOn?1:0, k(aimOn?11:10));
  const fov = THREE.MathUtils.lerp(baseFov, def.aim?aimFov:baseFov, aimProgress);
  if(Math.abs(camera.fov-fov)>0.05){ camera.fov=fov; camera.updateProjectionMatrix(); }
  const vign=document.getElementById('aimVignette'), cross=document.getElementById('crosshair');
  if(vign) vign.classList.toggle('on', def.aim && aimProgress>0.45);
  if(cross){ cross.classList.toggle('aiming', def.aim && aimProgress>0.4); cross.style.opacity='1'; }
  // --- pose ---
  const tp=new THREE.Vector3().lerpVectors(w.basePos, w.aimPos, aimProgress);
  let rx=0, ry=0, rz=0;
  recoilKick=THREE.MathUtils.lerp(recoilKick, 0, 1-Math.pow(0.0005, dt));
  tp.z += recoilKick*0.16; tp.y += recoilKick*0.025; rx += recoilKick*0.16;
  if(w.state==='draw'){
    const kk=Math.min(1,(now-w.t0)/520), e=1-Math.pow(1-kk,3);
    tp.y -= 0.42*(1-e); rx += 0.55*(1-e); tp.x += 0.10*(1-e);
  } else if(w.state==='reload'){
    const t=Math.min(reloadProgress,1); let y=0,z=0,rr=0,rr2=0;
    if(t<0.22){ const q=t/0.22; y=-0.45*Math.sin(q*Math.PI/2); z=0.18*q; rr=0.22*q; }
    else if(t<0.55){ const q=(t-0.22)/0.33; y=-0.45+0.10*Math.sin(q*Math.PI); rr=0.22-0.10*q; rr2=-0.10*Math.sin(q*Math.PI); z=0.18; }
    else if(t<0.82){ const q=(t-0.55)/0.27; y=-0.45*(1-q)-0.06*Math.sin(q*Math.PI); z=0.18*(1-q*0.5); rr=0.12*(1-q); }
    else { const q=(t-0.82)/0.18; y=-0.06*(1-q); }
    tp.y+=y; tp.z+=z; rx+=rr; ry+=rr2;
  } else if(w.state==='inspect'){
    const t=Math.min(inspectProgress,1), s=Math.sin(t*Math.PI*2);
    tp.x -= 0.14*Math.sin(t*Math.PI); tp.y += 0.05*Math.sin(t*Math.PI); ry += 0.55*s; rz += 0.28*Math.sin(t*Math.PI*2+1); rx -= 0.10*Math.sin(t*Math.PI);
  } else {
    const moving=(keys['KeyW']||keys['KeyA']||keys['KeyS']||keys['KeyD']);
    const amp=(1-aimProgress*0.85)*(moving?1.35:1), t=now*0.001;
    tp.x += Math.sin(t*0.9)*0.007*amp + (moving?Math.sin(t*7.4)*0.004*amp:0);
    tp.y += Math.cos(t*1.1)*0.005*amp + (moving?Math.abs(Math.sin(t*7.4))*0.006*amp:0);
  }
  if(isCrouching) tp.y -= 0.03*crouchProgress;
  if(wallPush>0.01){ const lp=Math.max(0,wallPush-0.35); tp.z+=wallPush*0.85; tp.y-=wallPush*0.22+lp*0.9; tp.x+=wallPush*0.08; rx-=wallPush*0.32+lp*0.55; }
  const f=(w.state==='draw'||w.state==='reload'||w.state==='inspect') ? 0.35 : k(1.4);
  w.holder.position.lerp(tp, f);
  w.holder.rotation.x=THREE.MathUtils.lerp(w.holder.rotation.x, rx, f);
  w.holder.rotation.y=THREE.MathUtils.lerp(w.holder.rotation.y, ry, f);
  w.holder.rotation.z=THREE.MathUtils.lerp(w.holder.rotation.z, rz, f);
}

// --- cuchillo mariposa (fps_butterfly_knife.glb): brazos + navaja; su timeline de 33 s es un truco de balisong ---
const KNIFE_FILE = 'assets/Cuchillos/cuchillo_de_combate.glb';
const KNIFE_ANIM_ROT = [-0.05,0.16,Math.PI-0.08];   // punta algo hacia abajo y filo hacia abajo (antes la hoja apuntaba hacia arriba)
const KNIFE_LEN = 0.62;
const KNIFE_ANIM_POS = [0.22,-0.22,-0.58];
function loadKnifeAnim(){
  makeLoader().load(KNIFE_FILE, (gltf)=>{
    const model=gltf.scene;
    model.traverse(o=>{ if(o.isMesh){ o.frustumCulled=false; o.castShadow=false; o.receiveShadow=false; } });
    const inner=new THREE.Group(); inner.add(model);
    inner.rotation.x=-Math.PI/2;                 // el modelo trae la hoja hacia +Y: pasa a apuntar a -Z
    const holder=new THREE.Group(); holder.add(inner);
    holder.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(holder);
    const size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3());
    const s=KNIFE_LEN/Math.max(size.x,size.y,size.z);
    inner.scale.setScalar(s);
    inner.position.copy(center).multiplyScalar(-s);
    holder.position.set(...KNIFE_ANIM_POS);
    holder.rotation.set(...KNIFE_ANIM_ROT);
    if(knifeModel){ vmRoot.remove(knifeModel); }
    knifeModel=holder; knifeBasePos=holder.position.clone(); knifeBaseRot=holder.rotation.clone();
    knifeModel.visible=(currentWeapon==='knife');
    vmAdd(holder); scene.add(camera);
    knifeAnim=null;                              // modelo estático: el ataque es procedural
    updateWeaponVisibility();
  }, undefined, (err)=>{
    console.warn('No se pudo cargar '+KNIFE_FILE+' (cuchillo provisional)', err);
    const gk=new THREE.Group();
    gk.add(new THREE.Mesh(new THREE.BoxGeometry(0.032,0.012,0.22), new THREE.MeshStandardMaterial({color:0xcdd6e6, metalness:0.7, roughness:0.2})));
    gk.position.set(0.16,-0.28,-0.52);
    knifeModel=gk; knifeBasePos=gk.position.clone(); knifeBaseRot=gk.rotation.clone();
    knifeModel.visible=(currentWeapon==='knife'); vmAdd(gk); scene.add(camera); updateWeaponVisibility();
  });
}

// === DEFUSE: puente entre el motor y js/defuse.js ===
let playerFrozen=false, spectating=false, viewmodelHidden=false;
let flashT=0, flashMax=1;
function giveDefaultLoadout(full){
  // refill de munición cada ronda
  akStoredAmmo=30; akStoredReserve=90; awpAmmo=10; awpReserve=30; deagleAmmo=7; deagleReserve=35;
  for(const k in animAmmo){ animAmmo[k].ammo=ANIM_WEAPONS[k].mag; animAmmo[k].reserve=ANIM_WEAPONS[k].reserve; }
  if(full){
    owned={ knife:true, deagle:true, ak:false, awp:false, m4:false };
    for(const g in grenadeStock) grenadeStock[g]=0;
    defuse.setHasKit(false);
  }
  // arma en mano: la mejor primaria que tengas, si no la pistola
  const pref = ['awp','ak','m4','deagle','knife'].find(w=>owned[w]) || 'knife';
  currentWeapon = null;           // fuerza el cambio aunque sea la misma
  isReloading=false; isBoltCycling=false;
  switchWeaponForce(pref);
}
function switchWeaponForce(to){
  isInspecting=false; inspectProgress=0; isKnifeSwinging=false; knifeSwingProgress=0; isBoltCycling=false; boltProgress=0; isAiming=false; aimProgress=0;
  if(camera){ camera.fov=baseFov; camera.updateProjectionMatrix(); }
  document.getElementById('scopeOverlay')?.classList.remove('on');
  if(to==='ak'){ maxMag=30; ammoInMag=akStoredAmmo; reserveAmmo=akStoredReserve; }
  else if(to==='awp'){ maxMag=awpMaxMag; ammoInMag=awpAmmo; reserveAmmo=awpReserve; }
  else if(to==='deagle'){ maxMag=deagleMaxMag; ammoInMag=deagleAmmo; reserveAmmo=deagleReserve; }
  else if(ANIM_WEAPONS[to]){ maxMag=ANIM_WEAPONS[to].mag; ammoInMag=animAmmo[to].ammo; reserveAmmo=animAmmo[to].reserve; }
  else if(GRENADES[to]){ maxMag=1; ammoInMag=grenadeStock[to]; reserveAmmo=0; }
  currentWeapon=to;
  updateWeaponVisibility();
  if(ANIM_WEAPONS[to]) animWeaponDraw(to);
  updateAmmoHUD();
}
const defuse = createDefuse({
  get camera(){ return camera; }, get scene(){ return scene; }, get world(){ return dust2Group; },
  get colliders(){ return dust2Colliders; }, get bounds(){ return dust2Group.userData.bounds; },
  keys,
  mapKey:()=>currentMapKey, mapFile:()=>currentMapFile, mapDef:()=>MAPS[currentMapKey],
  eyeHeight:()=>eyeStandHeight,
  playerName:()=>(window.currentUserId||'Jugador'),
  playerMoving:()=>!!(keys['KeyW']||keys['KeyA']||keys['KeyS']||keys['KeyD']),
  playerGrounded:()=>playerGrounded,
  showFloating:(t)=>showFloating(t),
  setPlayerFrozen:(v)=>{ playerFrozen=v; },
  setSpectating:(v)=>{ spectating=v; if(v){ isHoldingShoot=false; isAiming=false; document.getElementById('scopeOverlay')?.classList.remove('on'); } },
  setViewmodelVisible:(v)=>{ viewmodelHidden=!v; updateWeaponVisibility(); },
  lookAtPlayer:(x,y,z)=>{ camera.up.set(0,1,0); camera.lookAt(x,y,z); },
  resetLoadout:(team, full)=>{ playerVelY=0; pVel.set(0,0,0); playerGrounded=false; dust2GroundY=null; viewRecoilX=0; viewRecoilY=0; giveDefaultLoadout(full); },
  setMoney:(v)=>{ money=v; updateMoneyHUD(); if(buyMenuOpen) updateBuyMenu(); },
  grenadesClear:()=>{ if(typeof clearGrenades==='function') clearGrenades(); },
  explosionFx:(pos,R)=>explosionEffect(pos,R), acquireLight:(c,i,d,p)=>acquireLight(c,i,d,p), releaseLight:(l)=>releaseLight(l),
  damageFlash:(f)=>{ const e=document.getElementById('dfDamage'); if(e){ e.style.opacity=Math.min(0.85,0.25+f*0.6); setTimeout(()=>{ e.style.opacity=0; }, 140); } },
  botShotFx:()=>{}, colScale:()=>colScale,
  botThrow:(k,o,d,u)=>{ try{ if(grenades.ready()) grenades.throw(k,o,d,u); }catch(e){} },
  hitFeedback:(pos,head,helmet,dir)=>{ SFX.play(helmet?'hit_helmet':head?'headshot':'hit',{vol:helmet?0.9:1}); hitMarker.classList.add('show'); setTimeout(()=>hitMarker.classList.remove('show'),120); if(helmet){ sparkFx(pos,dir); } else bloodFx(pos,dir,head); if(head) showFloating(helmet?'CASCO':'HEADSHOT'); },
  bloodFx:(pos,dir,head)=>bloodFx(pos,dir,head),
  flashScreen:(sec)=>flashScreenFx(sec)
});
function updateFlashOverlay(dt){
  if(flashT<=0) return;
  flashT-=dt;
  const e=document.getElementById('dfFlash'); if(!e) return;
  const k = flashT/flashMax;
  e.style.opacity = flashT<=0 ? 0 : Math.min(1, 0.25+k*1.4);
}
function explosionEffect(pos, R){
  const geo=new THREE.SphereGeometry(1,24,16);
  const mat=new THREE.MeshBasicMaterial({color:0xffa030, transparent:true, opacity:0.9, depthWrite:false});
  const m=new THREE.Mesh(geo,mat); m.position.copy(pos); m.position.y+=0.5; dust2Group.add(m);
  const light=acquireLight(0xffa040, 80, R*2, m.position);
  let t=0;
  const tick=()=>{ t+=0.016; const k=t/0.9; m.scale.setScalar(0.4+k*R*0.55); mat.opacity=Math.max(0,0.9*(1-k)); if(light) light.intensity=80*(1-k); if(k>=1){ dust2Group.remove(m); releaseLight(light); geo.dispose(); mat.dispose(); } else requestAnimationFrame(tick); };
  tick();
  for(let i=0;i<5;i++) spawnParticles(new THREE.Vector3(pos.x+(Math.random()-0.5)*3,pos.y+0.5+Math.random()*2,pos.z+(Math.random()-0.5)*3), i%2?0xff7a1a:0x444444);
}
// grenades: por ahora sin stock (ver módulo de granadas)
const grenadeStock = { flash:0, smoke:0, he:0, molo:0 };

// === GRANADAS: integración con armas, HUD y tienda ===
Object.assign(WEAPON_LABEL, { flash:'FLASHBANG', smoke:'HUMO', he:'GRANADA HE', molo:'MOLOTOV' });
Object.assign(WEAPON_PRICES, { flash:GRENADES.flash.price, smoke:GRENADES.smoke.price, he:GRENADES.he.price, molo:GRENADES.molo.price, kit:400 });
const gHolders = {};
const GRENADE_POS = new THREE.Vector3(0.20,-0.26,-0.78), GRENADE_SCALE = 1.9;   // en la mano derecha (puño cerrado debajo)
const gThrow = { active:false, t:0, released:false, type:null };
function flashScreenFx(sec){ flashT=sec; flashMax=sec; const e=document.getElementById('dfFlash'); if(e){ e.style.transition='none'; e.style.opacity=1; } }
function flashPlayerOnly(pos){
  const e=camera.position; const d=e.distanceTo(pos); if(d>22) return;
  const fwd=new THREE.Vector3(); camera.getWorldDirection(fwd); const to=pos.clone().sub(e).normalize(); const facing=fwd.dot(to);
  flashScreenFx(Math.max(0.6, 4.2*(1-d/22)) * (facing>0 ? (0.5+facing*0.5) : 0.35));
}
const grenades = createGrenades({
  get world(){ return dust2Group; }, get colliders(){ return dust2Colliders; },
  flashArea:(pos,owner)=>{ if(defuse.active) defuse.flashArea(pos, owner); else flashPlayerOnly(pos); },
  areaDamage:(pos,r,dmg,owner,w)=>defuse.areaDamage(pos,r,dmg,owner,w),
  explosion:(pos,R)=>explosionEffect(pos,R), acquireLight:(c,i,d,p)=>acquireLight(c,i,d,p), releaseLight:(l)=>releaseLight(l),
  registerSmoke:(p,r,ms,o)=>defuse.registerSmoke(p,r,ms,o)
});
function clearGrenades(){ grenades.clear(); gThrow.active=false; }
function setStock(k, n){
  grenadeStock[k]=Math.max(0,n); owned[k]=grenadeStock[k]>0;
  if(currentWeapon===k){ ammoInMag=grenadeStock[k]; }
  updateAmmoHUD(); renderGrenadeBar();
}
function renderGrenadeBar(){
  const el=document.getElementById('gBar'); if(!el) return;
  el.innerHTML=Object.keys(GRENADES).filter(k=>grenadeStock[k]>0).map((k,i)=>'<span class="'+(currentWeapon===k?'sel':'')+'">'+GRENADES[k].icon+(grenadeStock[k]>1?'<sup>'+grenadeStock[k]+'</sup>':'')+'</span>').join('');
}
function buildGrenadeHolders(){
  for(const k in GRENADES){
    if(gHolders[k]) continue;
    const h=new THREE.Group(); h.add(grenades.held(k)); h.position.copy(GRENADE_POS); h.scale.setScalar(GRENADE_SCALE); h.visible=false; h.traverse(o=>{ o.frustumCulled=false; });
    vmAdd(h); gHolders[k]=h;
  }
  scene.add(camera);
}
function startThrow(){
  if(gThrow.active) return;
  const k=currentWeapon; if(!GRENADES[k] || grenadeStock[k]<=0) return;
  gThrow.active=true; gThrow.t=0; gThrow.released=false; gThrow.type=k;
  SFX.play('grenade_pin');
}
function releaseGrenade(){
  const k=gThrow.type;
  const fwd=new THREE.Vector3(); camera.getWorldDirection(fwd);
  const origin=camera.position.clone().addScaledVector(fwd,0.55); origin.y-=0.12;
  grenades.throw(k, origin, fwd.clone().add(new THREE.Vector3(0,0.18,0)).normalize(), defuse.active?defuse.player:null);
  SFX.play('grenade_throw');
  setStock(k, grenadeStock[k]-1);
  showFloating(GRENADES[k].label+' lanzada');
}
function updateGrenadeView(dt){
  const h=gHolders[currentWeapon]; if(!h) return;
  const t=performance.now()*0.001;
  const p=new THREE.Vector3(GRENADE_POS.x+Math.sin(t*0.9)*0.004,GRENADE_POS.y+Math.sin(t*1.4)*0.004,GRENADE_POS.z);
  let rx=0;
  if(gThrow.active){
    gThrow.t+=dt; const k=gThrow.t/0.36;
    if(!gThrow.released && gThrow.t>0.2){ gThrow.released=true; releaseGrenade(); }
    if(k<0.55){ const e=Math.sin(k/0.55*Math.PI/2); p.z+=0.12*e; p.y+=0.06*e; p.x+=0.04*e; rx=0.5*e; }
    else { const e=(k-0.55)/0.45; p.z-=0.22*Math.sin(Math.min(1,e)*Math.PI); p.y-=0.10*e; rx=-0.4*Math.sin(Math.min(1,e)*Math.PI); }
    if(k>=1){
      gThrow.active=false;
      if(grenadeStock[gThrow.type]<=0){ const nx=['awp','ak','m4','deagle','knife'].find(w=>owned[w])||'knife'; switchWeapon(nx); }
    }
    if(gThrow.released && grenadeStock[gThrow.type]<=0) h.visible = gThrow.t<0.26;   // la granada ya salió de la mano
  }
  h.position.lerp(p,0.45); h.rotation.x=THREE.MathUtils.lerp(h.rotation.x,rx,0.35);
}

// === MANOS EN PRIMERA PERSONA (las del cuchillo) para el resto de armas y granadas ===
// (las manos de las armas se quitaron: solo el cuchillo muestra brazos, que vienen en su propio modelo)

// === ATMÓSFERA: Dust II de noche estrellada (luz de luna azulada con niebla para que se vea lo justo) ===
const ATMOS = {
  day:   { bg: 0x87ceeb, fogCol: 0x87ceeb, fog: [30, 80], hemi: [0xcde6ff, 0x1a1a22, 1.2], sun: [0xfff2dd, 1.9] },
  night: { bg: 0x060a1a, fogCol: 0x0b1433, fog: [24, 90], hemi: [0x7a98e0, 0x232c4a, 1.55], sun: [0xa9c0ff, 1.35] }
};
let skyDome = null;
function makeSkyDome(){
  const W = 2048, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#02040d'); gr.addColorStop(0.55, '#07102a'); gr.addColorStop(0.8, '#101e45'); gr.addColorStop(1, '#1a2b58');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // vía láctea: banda difusa en diagonal
  g.save(); g.translate(W * 0.5, H * 0.32); g.rotate(-0.35); const mw = g.createLinearGradient(0, -110, 0, 110); mw.addColorStop(0, 'rgba(120,150,230,0)'); mw.addColorStop(0.5, 'rgba(150,175,240,0.20)'); mw.addColorStop(1, 'rgba(120,150,230,0)'); g.fillStyle = mw; g.fillRect(-W, -110, W * 2, 220); g.restore();
  // estrellas (más densas cerca de la banda y hacia arriba)
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 1900; i++) {
    const x = rnd() * W, y = Math.pow(rnd(), 1.25) * H * 0.86, b = 0.35 + rnd() * 0.65, r = rnd() < 0.04 ? 1.9 : (rnd() < 0.25 ? 1.2 : 0.7);
    const tint = rnd(); g.fillStyle = tint < 0.2 ? `rgba(190,210,255,${b})` : tint < 0.3 ? `rgba(255,235,200,${b})` : `rgba(255,255,255,${b})`;
    g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
  }
  for (let i = 0; i < 40; i++) { const x = rnd() * W, y = rnd() * H * 0.6; const gl = g.createRadialGradient(x, y, 0, x, y, 7); gl.addColorStop(0, 'rgba(255,255,255,.9)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(x - 7, y - 7, 14, 14); }
  // luna con halo
  const mx = W * 0.64, my = H * 0.27;
  const halo = g.createRadialGradient(mx, my, 10, mx, my, 190); halo.addColorStop(0, 'rgba(210,225,255,.55)'); halo.addColorStop(0.35, 'rgba(150,175,235,.16)'); halo.addColorStop(1, 'rgba(120,150,220,0)'); g.fillStyle = halo; g.fillRect(mx - 200, my - 200, 400, 400);
  g.fillStyle = '#eef3ff'; g.beginPath(); g.arc(mx, my, 34, 0, 6.283); g.fill();
  g.fillStyle = 'rgba(160,175,205,.55)'; for (const [dx, dy, r] of [[-10, -8, 8], [9, 6, 6], [-4, 13, 5], [12, -12, 4]]) { g.beginPath(); g.arc(mx + dx, my + dy, r, 0, 6.283); g.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.SphereGeometry(80, 40, 20), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -10; m.frustumCulled = false; m.visible = false; scene.add(m);
  return m;
}
function setLights(a){
  if(!hemiLight || !sunLight) return;
  hemiLight.color.setHex(a.hemi[0]); hemiLight.groundColor.setHex(a.hemi[1]); hemiLight.intensity = a.hemi[2];
  sunLight.color.setHex(a.sun[0]); sunLight.intensity = a.sun[1];
}
function applyAtmosphere(){
  if(!scene || !hemiLight || !sunLight) return;
  const night = gameMode==='dust2' && currentMapKey==='dust2';
  const a = night ? ATMOS.night : ATMOS.day;
  setLights(a);
  if(night && !skyDome) skyDome = makeSkyDome();
  if(skyDome) skyDome.visible = night;
  if(gameMode==='dust2'){
    scene.background = new THREE.Color(a.bg);
    scene.fog = new THREE.Fog(a.fogCol, a.fog[0], a.fog[1]); scene.userData.fogBase = [a.fog[0], a.fog[1]]; applyFog();
  }
}

function setMapVisibility(mode){
  // Dust2 limpio estilo CS: HUD AIM oculto + minimapa visible (CSS .mode-dust2)
  try{ document.getElementById('game')?.classList.toggle('mode-dust2', mode==='dust2'); }catch(e){}
  if(!aimMapGroup || !dust2Group) return;
  if(mode==='dust2'){
    aimMapGroup.visible = false;
    dust2Group.visible = true;
    applyAtmosphere();
  } else {
    aimMapGroup.visible = true;
    dust2Group.visible = false;
    scene.background = new THREE.Color(0x0d1424);
    scene.fog = new THREE.Fog(0x0d1424, 18, 55); scene.userData.fogBase=[18,55]; applyFog();
  }
  if(mode!=='dust2') applyAtmosphere();
}


function spawnTarget(){
  const group = new THREE.Group();
  // target: cylinder disc + rings
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.08,32), new THREE.MeshStandardMaterial({color:0xffffff}));
  disc.rotation.x=Math.PI/2;
  disc.castShadow=true;
  group.add(disc);
  const ringColors=[0xff3b3b,0xffffff,0xff3b3b,0xffffff];
  ringColors.forEach((c,i)=>{
    const r = 0.45 - i*0.09;
    const ring = new THREE.Mesh(new THREE.RingGeometry(r-0.04, r, 32), new THREE.MeshBasicMaterial({color:c, side:THREE.DoubleSide}));
    ring.position.z=0.045;
    group.add(ring);
  });
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.08,12,12), new THREE.MeshStandardMaterial({color:0x1a1a1a}));
  center.position.z=0.07;
  group.add(center);

  // random position on wall area
  const x = (Math.random()-0.5)*16;
  const y = 1.2 + Math.random()*4.5;
  const z = -11.6;
  group.position.set(x,y,z);
  // slight random tilt for variety
  group.rotation.y = (Math.random()-0.5)*0.15;
  group.userData = { life: 2.2 + Math.random()*1.0, vel: new THREE.Vector3((Math.random()-0.5)*0.8*(window.fafiAimSpeedMult||1), (Math.random()-0.5)*0.6*(window.fafiAimSpeedMult||1), 0), born: performance.now() };
  scene.add(group);
  targets.push(group);
}

function clearTargets(){
  targets.forEach(t=>scene.remove(t));
  targets=[];
}
function clearBullets(){
  bullets.forEach(b=>{ scene.remove(b.mesh); scene.remove(b.trail); b.trailGeo.dispose(); });
  bullets=[];
}

// === TIENDA CS:GO Dust2 ===
function updateMoneyHUD(){
  const m=document.getElementById('moneyEl');
  if(m) m.textContent=infiniteMoney()?'$ ∞':'$'+money;
  const bm=document.getElementById('buyMoneyEl');
  if(bm) bm.textContent=infiniteMoney()?'$ ∞':'$'+money;
  const box=document.getElementById('moneyBox');
  if(box) box.style.display = (gameMode==='dust2' && gameActive) ? 'block' : 'none';
}
function nextOwnedWeapon(){
  // Para Q/rueda: cicla solo entre las que posees en Dust2
  const order=['ak','m4','knife','awp','deagle'];
  if(gameMode!=='dust2') return order;
  return order.filter(w=>owned[w]);
}
// === TIENDA estilo CS:GO (tecla B) ===
// Columnas: Pistolas · Rifles · Equipo (chaleco, casco, kit) · Granadas. Pulsa 1-4 para abrir una columna y luego el número del objeto.
// En el modo exploración (sin Defuse) el dinero es infinito.
function infiniteMoney(){ return gameMode==='dust2' && !defuse.active; }
let expArmor=0, expHelmet=false, buyCol=null;
function getArmor(){ return defuse.active ? { a:defuse.armor||0, h:!!defuse.helmet } : { a:expArmor, h:expHelmet }; }
function setArmorState(a,h){ if(defuse.active) defuse.setArmor(a,h); else { expArmor=a; expHelmet=h; } }
function spend(price){
  if(infiniteMoney()) return true;
  if(money<price){ showFloating('Sin dinero suficiente ($'+price+')'); return false; }
  money-=price; if(defuse.active && defuse.player) defuse.player.money=money;
  return true;
}
const BUY_COLS = [
  { name:'PISTOLAS', items:[ { id:'deagle', kind:'gun', label:'Desert Eagle', sub:'7 balas · gran daño' } ] },
  { name:'RIFLES', items:[
    { id:'ak', kind:'gun', label:'AK-47', sub:'Automático · 30/90' },
    { id:'m4', kind:'gun', label:'M4A4', sub:'Automático · 30/90' },
    { id:'awp', kind:'gun', label:'AWP', sub:'Francotirador · 10/30' } ] },
  { name:'EQUIPO', items:[
    { id:'vest', kind:'armor', label:'Chaleco', sub:'Reduce el daño al cuerpo' },
    { id:'helm', kind:'armor', label:'Chaleco + casco', sub:'Protege también la cabeza' },
    { id:'kit', kind:'util', label:'Kit de defusa', sub:'Desactivas en 5 s (solo CT)' } ] },
  { name:'GRANADAS', items:[
    { id:'flash', kind:'util', label:'Flashbang', sub:'Ciega · máx. 2' },
    { id:'smoke', kind:'util', label:'Humo', sub:'Bloquea la visión' },
    { id:'he', kind:'util', label:'Granada HE', sub:'Explosiva' },
    { id:'molo', kind:'util', label:'Molotov', sub:'Fuego 7 s' } ] }
];
function buyVisible(it){
  if(it.kind==='gun') return defuse.teamAllows(it.id);
  if(it.id==='kit') return defuse.active && defuse.team==='ct';
  return true;
}
function buyPrice(it){
  if(it.id==='helm'){ const {a,h}=getArmor(); return (a>0 && !h) ? 350 : 1000; }
  if(it.id==='vest') return 650;
  return WEAPON_PRICES[it.id];
}
function buyState(it){
  const price=buyPrice(it), free=infiniteMoney();
  if(it.kind==='gun'){
    if(owned[it.id]) return { txt: currentWeapon===it.id ? 'EQUIPADA' : 'EQUIPAR', cls: currentWeapon===it.id ? 'eq' : 'own' };
  } else if(it.kind==='armor'){
    const {a,h}=getArmor();
    if(it.id==='vest' && a>0) return { txt:'COMPRADO', cls:'eq' };
    if(it.id==='helm' && a>0 && h) return { txt:'COMPRADO', cls:'eq' };
  } else if(it.id==='kit'){
    if(defuse.hasKit) return { txt:'COMPRADO', cls:'eq' };
  } else if(grenadeStock[it.id]>=GRENADES[it.id].max){
    return { txt:'COMPLETO '+grenadeStock[it.id]+'/'+GRENADES[it.id].max, cls:'eq' };
  }
  if(!free && money<price) return { txt:'$'+price, cls:'cant' };
  return { txt:'$'+price, cls:'' };
}
function updateBuyMenu(){
  updateMoneyHUD();
  const bme=document.getElementById('buyModeEl'); if(bme) bme.textContent='— '+(defuse.active?'DEFUSE':'EXPLORACIÓN · DINERO INFINITO');
  const root=document.getElementById('buyCols'); if(!root) return;
  const cols=BUY_COLS.map(c=>({ name:c.name, items:c.items.filter(buyVisible) })).filter(c=>c.items.length);
  if(buyCol!==null && buyCol>=cols.length) buyCol=null;
  root.innerHTML = cols.map((c,ci)=>{
    const rows=c.items.map((it,ii)=>{
      const st=buyState(it);
      const label = it.id==='helm' ? ((()=>{ const {a,h}=getArmor(); return a>0&&!h ? 'Casco' : it.label; })()) : it.label;
      return '<button class="bz-row '+st.cls+'" data-id="'+it.id+'"><span class="k">'+(ii+1)+'</span><span class="n">'+label+'<small>'+it.sub+'</small></span><span class="p">'+st.txt+'</span></button>';
    }).join('');
    return '<div class="bz-col'+(buyCol===ci?' sel':'')+'" data-ci="'+ci+'"><h4><i>'+(ci+1)+'</i>'+c.name+'</h4>'+rows+'</div>';
  }).join('');
  const inv=document.getElementById('buyInvEl');
  if(inv){
    const {a,h}=getArmor();
    const prim = owned.awp ? 'AWP' : owned.ak ? 'AK-47' : owned.m4 ? 'M4A4' : '—';
    const gr = Object.keys(grenadeStock).filter(k=>grenadeStock[k]>0).map(k=>GRENADES[k].icon+(grenadeStock[k]>1?'×'+grenadeStock[k]:'')).join(' ') || '—';
    inv.innerHTML = '<span>PRIMARIA <b>'+prim+'</b></span><span>PISTOLA <b>'+(owned.deagle?'Desert Eagle':'—')+'</b></span>'
      + '<span>CHALECO <b>'+(a>0?(h?'Kevlar + casco':'Kevlar'):'—')+'</b></span><span>GRANADAS <b>'+gr+'</b></span>';
  }
}
function buyItem(it){
  if(!gameActive || gameMode!=='dust2') return;
  if(defuse.active && !defuse.canBuy()){ showFloating(defuse.buyReason()); return; }
  if(it.kind==='gun') tryBuy(it.id);
  else if(it.kind==='armor') buyArmor(it.id);
  else buyUtil(it.id);
  buyCol=null; updateBuyMenu();
}
function buyArmor(id){
  const {a,h}=getArmor(); let price, nh;
  if(id==='vest'){ if(a>0){ showFloating('Ya tienes chaleco'); return; } price=650; nh=false; }
  else { if(a>0 && h){ showFloating('Ya tienes chaleco y casco'); return; } price = a>0 ? 350 : 1000; nh=true; }
  if(!spend(price)) return;
  setArmorState(100, nh); SFX.play('armor');
  showFloating((id==='vest'?'Chaleco':'Chaleco + casco')+' comprado'+(infiniteMoney()?'':' -$'+price));
  updateMoneyHUD();
}
function tryBuy(w){
  if(defuse.active && !defuse.canBuy()){ showFloating(defuse.buyReason()); return; }
  if(gameMode!=='dust2'||!gameActive) return;
  if(owned[w]){ switchWeapon(w); updateBuyMenu(); return; }
  const price=WEAPON_PRICES[w];
  if(!spend(price)) return;
  SFX.play('buy');
  // Primaria excluyente: una sola entre AK, M4 y AWP
  if(PRIMARIES.includes(w)){
    for(const p of PRIMARIES){ if(p!==w && owned[p]){ owned[p]=false; showFloating(WEAPON_LABEL[p]+' reemplazada por '+WEAPON_LABEL[w]); } }
  }
  owned[w]=true;
  // munición completa al comprar
  if(w==='ak'){ akStoredAmmo=30; akStoredReserve=90; }
  if(w==='awp'){ awpAmmo=10; awpReserve=30; }
  if(w==='deagle'){ deagleAmmo=7; deagleReserve=35; }
  if(ANIM_WEAPONS[w]){ animAmmo[w].ammo=ANIM_WEAPONS[w].mag; animAmmo[w].reserve=ANIM_WEAPONS[w].reserve; }
  switchWeapon(w);
  // si switchWeapon fue bloqueado por recarga, forzar equip
  if(currentWeapon!==w && !isReloading && !isBoltCycling){
    currentWeapon=w;
    if(w==='ak'){ maxMag=30; ammoInMag=akStoredAmmo; reserveAmmo=akStoredReserve; }
    if(w==='awp'){ maxMag=awpMaxMag; ammoInMag=awpAmmo; reserveAmmo=awpReserve; }
    if(w==='deagle'){ maxMag=deagleMaxMag; ammoInMag=deagleAmmo; reserveAmmo=deagleReserve; }
    if(ANIM_WEAPONS[w]){ maxMag=ANIM_WEAPONS[w].mag; ammoInMag=animAmmo[w].ammo; reserveAmmo=animAmmo[w].reserve; animWeaponDraw(w); }
    updateWeaponVisibility();
  }
  showFloating(WEAPON_LABEL[w]+' comprada'+(infiniteMoney()?'':' -$'+price));
  updateMoneyHUD(); updateHUD();
}
function buyUtil(k){
  if(defuse.active && !defuse.canBuy()){ showFloating(defuse.buyReason()); return; }
  if(gameMode!=='dust2'||!gameActive) return;
  const price=WEAPON_PRICES[k];
  if(k==='kit'){
    if(defuse.team!=='ct' || defuse.hasKit) return;
    if(!spend(price)) return;
    SFX.play('buy'); defuse.setHasKit(true); showFloating('Kit de defusa comprado');
  } else {
    if(grenadeStock[k]>=GRENADES[k].max){ showFloating('Máximo '+GRENADES[k].max+' '+GRENADES[k].label); return; }
    if(!spend(price)) return;
    SFX.play('buy'); setStock(k, grenadeStock[k]+1); showFloating(GRENADES[k].label+' comprada'+(infiniteMoney()?'':' -$'+price));
  }
  updateMoneyHUD(); updateBuyMenu();
}
function updateUtilCards(){}
// teclado dentro de la tienda: 1-4 columna, luego número del objeto; B/Esc cierran
function buyKey(e){
  if(e.code==='Escape' || e.code==='KeyB'){ e.preventDefault(); setBuyMenu(false); return true; }
  const m=/^(?:Digit|Numpad)(\d)$/.exec(e.code); if(!m) return false;
  e.preventDefault();
  const n=+m[1];
  const cols=BUY_COLS.map(c=>c.items.filter(buyVisible)).filter(c=>c.length);
  if(buyCol===null){ if(n>=1 && n<=cols.length){ buyCol=n-1; updateBuyMenu(); } return true; }
  if(n>=1 && n<=cols[buyCol].length) buyItem(cols[buyCol][n-1]); else { buyCol=null; updateBuyMenu(); }
  return true;
}
function setBuyMenu(open){
  if(open && defuse.active && !defuse.canBuy()){ showFloating(defuse.buyReason()); return; }
  if(gameMode!=='dust2'||!gameActive) open=false;
  buyMenuOpen=open; buyCol=null;
  const el=document.getElementById('buyMenu');
  if(el) el.classList.toggle('show', open);
  if(open){
    updateBuyMenu();
    try{ controls.unlock(); }catch(e){}
    // Evitar que el unlock dispare la pausa mientras compras
    pauseOverlay.classList.remove('show');
    isHoldingShoot=false;
  } else {
    if(gameActive && !resultOverlay.classList.contains('show')){ try{ controls.lock(); }catch(e){} }
  }
}
function toggleBuyMenu(){ setBuyMenu(!buyMenuOpen); }
document.getElementById('buyCols')?.addEventListener('click', (e)=>{
  const row=e.target.closest('.bz-row'); if(!row) return;
  for(const c of BUY_COLS){ const it=c.items.find(i=>i.id===row.dataset.id); if(it){ buyItem(it); return; } }
});





function onTargetHit(target, point){
  hits++; score += 100;
  // bonus for center? distance to center
  const dist = target.position.distanceTo(camera.position);
  // extra if quickly
  // hit marker
  hitMarker.classList.add('show');
  setTimeout(()=>hitMarker.classList.remove('show'), 120);
  SFX.play('hit');

  // particles
  spawnParticles(point || target.position.clone(), 0xff3b3b);

  scene.remove(target);
  targets = targets.filter(t=>t!==target);
  // spawn new one quickly
  if(gameActive) setTimeout(spawnTarget, 120);

  updateHUD();
  // floating +100 text (2D)
  showFloating('+100');
}


function showFloating(txt){
  const el=document.createElement('div');
  el.textContent=txt;
  el.style.cssText='position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);color:#3aff7a;font-weight:900;font-size:28px;text-shadow:0 2px 10px #000;pointer-events:none;z-index:6;';
  gameEl.appendChild(el);
  el.animate([{transform:'translate(-50%,-50%)',opacity:1},{transform:'translate(-50%,-70%)',opacity:0}],{duration:520,easing:'ease-out'}).onfinish=()=>el.remove();
}

function updateHUD(){
  const eyeHEl = document.getElementById('eyeH');
  if(eyeHEl && typeof camera!=='undefined' && camera){
    let hgt = camera.position.y;
    if(gameMode==='dust2' && typeof dust2GroundY!=='undefined' && dust2GroundY!==null) hgt = camera.position.y - dust2GroundY;
    eyeHEl.textContent = hgt.toFixed(2)+'m';
  }
  scoreEl.textContent=score;
  hitsEl.textContent = hits + ' / ' + shots;
  const acc = shots? Math.round(hits/shots*100):0;
  accEl.textContent = acc + '%';
  if(gameMode==='dust2'){
    timeEl.textContent = '∞';
    const isT = (playerTeam==='t');
    timeEl.style.color = isT ? '#ff8c2a' : '#3aa0ff';
    // mostrar bando en label tiempo
    const label = timeEl.parentElement.querySelector('.hud-label');
    if(label) label.textContent = isT ? 'TERRORISTA' : 'ANTITERRORISTA';
  } else {
    timeEl.textContent = isFinite(timeLeft) ? timeLeft.toFixed(1) : '∞';
    if(isFinite(timeLeft) && timeLeft<10) timeEl.style.color='#ff3b3b'; else timeEl.style.color='#fff';
    const label = timeEl.parentElement.querySelector('.hud-label');
    if(label) label.textContent = 'TIEMPO';
  }
  if(typeof updateMoneyHUD==='function') updateMoneyHUD();
  if(typeof updateDebugPanel==='function') updateDebugPanel();
  updateAmmoHUD();
}

// El audio del navegador necesita un gesto del usuario: el primer clic o tecla crea el contexto y precarga las muestras.
(function unlockAudio(){
  const go=()=>{ SFX.init(); removeEventListener('pointerdown',go,true); removeEventListener('keydown',go,true); };
  addEventListener('pointerdown',go,true); addEventListener('keydown',go,true);
  addEventListener('click',e=>{ if(e.target.closest && e.target.closest('button,.btn,[role=button]')) SFX.play('ui'); },true);
})();
// pasos y aterrizaje del jugador
const footState={ acc:0, x:0, z:0, wasGround:true, fall:0 };
function updateFootsteps(dt){
  if(!camera || !gameActive || gameMode!=='dust2' || spectating || playerFrozen){ footState.x=camera?camera.position.x:0; footState.z=camera?camera.position.z:0; return; }
  const dx=camera.position.x-footState.x, dz=camera.position.z-footState.z;
  footState.x=camera.position.x; footState.z=camera.position.z;
  if(playerGrounded){
    if(!footState.wasGround && footState.fall<-4.5) SFX.play('land', { vol:Math.min(1,-footState.fall/10) });
    if(!isCrouching){
      footState.acc+=Math.min(Math.hypot(dx,dz),1);
      if(footState.acc>2.1){ footState.acc=0; SFX.play(SFX.surface,{ vol:0.8 }); }
    }
  } else footState.fall=playerVelY;
  footState.wasGround=playerGrounded;
}


// --- BANDOS estilo CS: tu marca (< / Z) > predeterminados horneados > auto por bounds ---
function getTeamSpawn(team){
  const b = (typeof dust2Group!=='undefined' && dust2Group && dust2Group.userData.bounds) ? dust2Group.userData.bounds : null;
  let cx=0, minZ=-28, maxZ=28;
  if(b){ cx=(b.min.x+b.max.x)/2; minZ=b.min.z; maxZ=b.max.z; }
  const t = tSpawnOverride ? { x: tSpawnOverride.x, z: tSpawnOverride.z } : (DEFAULT_T_SPAWN || { x: cx, z: maxZ - 4 });
  const ct = ctSpawnOverride ? { x: ctSpawnOverride.x, z: ctSpawnOverride.z } : (DEFAULT_CT_SPAWN || { x: cx, z: minZ + 4 });
  return team==='t' ? { pos: t, foe: ct } : { pos: ct, foe: t };
}
// busca suelo caminable en la columna (x,z): el piso más profundo con normal
// hacia arriba (ignora techos). Prueba la celda y 4 vecinas por si cae en muro.
// prefY (opcional): si se conoce la altura del spawn, elige el piso más cercano a ella.
function findSpawnGround(x, z, prefY){
  if(!dust2Colliders.length) return null;
  const cands = [[x,z],[x+2,z],[x-2,z],[x,z+2],[x,z-2]];
  const bb = dust2Group.userData.bounds;
  const topY = Math.max(9, bb ? bb.max.y + 0.5 : 9);
  const rayLen = bb ? (topY - bb.min.y) + 1 : 16;
  for(const c of cands){
    const origin = new THREE.Vector3(c[0], topY, c[1]);
    const ray = new THREE.Raycaster(origin, new THREE.Vector3(0,-1,0), 0, rayLen);
    const hits = ray.intersectObjects(dust2Colliders, false);
    let best = null;
    for(const h of hits){
      if(!h.face) continue;
      const n = h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize();
      if(n.y > 0.5){
        if(best===null) best = h.point.y;
        else if(prefY!==undefined) { if(Math.abs(h.point.y-prefY) < Math.abs(best-prefY)) best = h.point.y; }
        else if(h.point.y < best) best = h.point.y;
      }
    }
    if(best !== null) return { x: c[0], z: c[1], y: best };
  }
  return null;
}
// Anillo visual del spawn (radio SPAWN_ZONE_RADIUS) + poste guía. Vive en
// dust2Group así se oculta solo en modo AIM y nunca entra en colisionables.
function updateSpawnRing(team){
  if(typeof dust2Group==='undefined' || !dust2Group) return;
  let ring = team==='t' ? tSpawnRing : ctSpawnRing;
  if(ring){
    dust2Group.remove(ring);
    ring.traverse(o=>{ if(o.geometry) o.geometry.dispose(); const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[]; ms.forEach(m=>m.dispose()); });
    ring = null;
  }
  const ov = team==='t' ? (tSpawnOverride || DEFAULT_T_SPAWN) : (ctSpawnOverride || DEFAULT_CT_SPAWN);
  if(!ov){ if(team==='t') tSpawnRing=null; else ctSpawnRing=null; return; }
  const g = (typeof findSpawnGround==='function') ? findSpawnGround(ov.x, ov.z, ov.y) : null;
  const px = g ? g.x : ov.x, pz = g ? g.z : ov.z, gy = g ? g.y : 0;
  const color = team==='t' ? 0xff8c2a : 0x3aa0ff;
  ring = new THREE.Group();
  const flat = new THREE.Mesh(
    new THREE.RingGeometry(SPAWN_ZONE_RADIUS-0.18, SPAWN_ZONE_RADIUS, 48),
    new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.85, side:THREE.DoubleSide, depthWrite:false})
  );
  flat.rotation.x = -Math.PI/2;
  flat.position.set(px, gy+0.06, pz);
  ring.add(flat);
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 24),
    new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.9, side:THREE.DoubleSide, depthWrite:false})
  );
  dot.rotation.x = -Math.PI/2;
  dot.position.set(px, gy+0.07, pz);
  ring.add(dot);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09,0.09,4,10),
    new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.45, depthWrite:false})
  );
  pole.position.set(px, gy+2, pz);
  ring.add(pole);
  dust2Group.add(ring);
  if(team==='t') tSpawnRing=ring; else ctSpawnRing=ring;
}
function refreshSpawnRings(){ updateSpawnRing('t'); updateSpawnRing('ct'); }
// Marca el spawn del bando bajo tus pies (X/Z) con radio SPAWN_ZONE_RADIUS y lo guarda
function markSpawn(team){
  if(gameMode!=='dust2' || !gameActive){ showFloating('Marca spawns solo en DUST II'); return; }
  const p = { x: camera.position.x, z: camera.position.z };
  try{
    const sfx = '_'+currentMapKey+'_v4';
    if(team==='t'){ tSpawnOverride=p; localStorage.setItem('fafi_spawn_t'+sfx, JSON.stringify(p)); }
    else { ctSpawnOverride=p; localStorage.setItem('fafi_spawn_ct'+sfx, JSON.stringify(p)); }
  }catch(err){ console.warn(err); }
  updateSpawnRing(team);
  const nm = team==='t' ? 'TERROR' : 'CT';
  showFloating(`Spawn ${nm} marcado r=${SPAWN_ZONE_RADIUS}m (guardado)`);
  console.log(`Spawn ${team} marcado en`, p);
}
// Espectador noclip: vuela y atraviesa todo (| para entrar/salir)
function showTeamSelect(from){
  teamReturn = from || 'menu';
  pauseOverlay.classList.remove('show');
  try{ if(typeof fafiHideShell==='function') fafiHideShell(); }catch(e){}
  if(teamReturn==='menu') menu.style.display='none';
  refreshMapPicker();
  const th=document.querySelector('#teamOverlay h1'); if(th) th.textContent = window.fafiDefuse ? 'DEFUSE 5v5' : 'ELIGE TU BANDO';
  const ts=document.querySelector('#teamOverlay .subtitle'); if(ts) ts.textContent = window.fafiDefuse ? 'ELIGE MAPA Y BANDO — PLANTA O DESACTIVA LA BOMBA' : 'ELIGE MAPA Y BANDO — EXPLORACIÓN';
  document.getElementById('teamOverlay').classList.add('show');
}
function hideTeamSelect(){
  document.getElementById('teamOverlay').classList.remove('show');
}
function startGame(mode='aim', team=null){
  try{ if(typeof fafiHideShell==='function') fafiHideShell(); }catch(e){}
  try{ if(typeof fafiUnlock==='function'){ fafiUnlock('first_blood'); if(mode==='dust2') fafiUnlock('dust_explorer'); } }catch(e){}
  try{ if(window.campaignActiveLevel && mode!=='aim'){ window.campaignActiveLevel=0; window.fafiAimSpeedMult=1; } }catch(e){}
  gameMode = mode;
  for(const k in animAmmo){ animAmmo[k].ammo=ANIM_WEAPONS[k].mag; animAmmo[k].reserve=ANIM_WEAPONS[k].reserve; }
  const isDust2 = (mode==='dust2');
  score=0; hits=0; shots=0; timeLeft= isDust2 ? Infinity : 30;
  ammoInMag=30; reserveAmmo=90; isReloading=false; reloadProgress=0; isAiming=false; aimProgress=0; recoilKick=0;
  // === Reset economía/inventario ===
  if(isDust2){
    money=3000;
    owned={ knife:true, deagle:false, ak:false, awp:false, m4:false };
    akStoredAmmo=30; akStoredReserve=90; awpAmmo=10; awpReserve=30; deagleAmmo=7; deagleReserve=35;
    currentWeapon='knife';
    buyMenuOpen=false;
    document.getElementById('buyMenu')?.classList.remove('show');
  } else {
    // En AIM practice todo desbloqueado como antes
    owned={ knife:true, deagle:true, ak:true, awp:true, m4:true };
    currentWeapon='ak';
    buyMenuOpen=false;
    document.getElementById('buyMenu')?.classList.remove('show');
  }
  if(isDust2){
    // respetar el inset del loader (+1.0) para no spawnear dentro del muro exterior
    if(dust2Group && dust2Group.userData.bounds){
      const b = dust2Group.userData.bounds;
      wallLimit.xmin = b.min.x + 1.0; wallLimit.xmax = b.max.x - 1.0;
      wallLimit.zmin = b.min.z + 1.0; wallLimit.zmax = b.max.z - 1.0;
    } else {
      wallLimit.xmin=-28; wallLimit.xmax=28; wallLimit.zmin=-28; wallLimit.zmax=28;
    }
  } else {
    wallLimit.xmin=-10.2; wallLimit.xmax=10.2; wallLimit.zmin=-11; wallLimit.zmax=16;
  }
  viewRecoilX=0; viewRecoilY=0; spreadAccum=0; recoilPatternStep=0; lastShotTime=0; isHoldingShoot=false; spamHeat=0; consecutiveSpam=0; isInspecting=false; inspectProgress=0; isCrouching=false; crouchProgress=0; freeCam=false;
  playerVelY=0; playerGrounded=false; dust2GroundY=null;
  walkTime=0; viewBobY=0; lastViewBobY=0; landShake=0; jumpBob=0; prevGrounded=false;
  jumpFatigueMult=1; consecutiveJumps=0; lastJumpTime=0; fatigueTimer=0;
  if(camera){ camera.fov=baseFov; camera.updateProjectionMatrix(); camera.position.y=standHeight; camera.rotation.z=0; }
  document.getElementById('reloadBar')?.classList.remove('show');
  document.getElementById('reloadText')?.classList.remove('show');
  document.getElementById('reloadFill').style.width='0%';
  document.getElementById('aimVignette')?.classList.remove('on');
  document.getElementById('crosshair')?.classList.remove('aiming');
  document.getElementById('scopeOverlay')?.classList.remove('on');
  clearTargets(); clearBullets();
  if(!isDust2){
    for(let i=0;i<4;i++) spawnTarget();
  }
  // cambiar visibilidad de mapas
  setMapVisibility(isDust2 ? 'dust2' : 'aim');
  gameActive=true;
  resultOverlay.classList.remove('show');
  pauseOverlay.classList.remove('show');
  document.getElementById('teamOverlay')?.classList.remove('show');
  menu.style.display='none';
  gameEl.classList.add('active');
  if(!scene) initThree();
  // posicion inicial segun modo
  if(isDust2){
    // Spawn según bando, con suelo detectado por raycast y mirando al enemigo
    playerTeam = team || playerTeam || 'ct';
    const sp = getTeamSpawn(playerTeam);
    const g = findSpawnGround(sp.pos.x, sp.pos.z, sp.pos.y);
    const sx = g ? g.x : sp.pos.x, sz = g ? g.z : sp.pos.z;
    const eyeY = (g ? g.y : (sp.pos.y!==undefined ? sp.pos.y : 2.5)) + eyeStandHeight + 0.25;
    camera.position.set(sx, eyeY, sz);
    controls.getObject().position.copy(camera.position);
    camera.lookAt(sp.foe.x, eyeY - 0.1, sp.foe.z);
    if(!window.fafiDefuse) ensureCharacters(playerTeam);
    const teamName = playerTeam==='t' ? 'TERRORISTAS' : 'ANTITERRORISTAS';
    document.getElementById('weapon-info').querySelector('b').textContent = teamName;
    // arrancas solo con cuchillo + $3000, como en CS:GO
    maxMag=30; ammoInMag=akStoredAmmo; reserveAmmo=akStoredReserve;
    updateWeaponVisibility();
    updateMoneyHUD();
    if(window.fafiDefuse){ playerFrozen=true; spectating=false; viewmodelHidden=false; [tSpawnRing,ctSpawnRing].forEach(r=>{ if(r) r.visible=false; }); defuse.startMatch(playerTeam); }
    else { playerFrozen=false; spectating=false; viewmodelHidden=false; showFloating('¡' + teamName + '! Pulsa B para comprar ($3000)'); }
  } else {
    camera.position.set(0,1.6,4);
    controls.getObject().position.copy(camera.position);
    camera.lookAt(0, 1.6, -12); playerFrozen=false; spectating=false; viewmodelHidden=false;
    document.getElementById('weapon-info').querySelector('b').textContent = 'AK-47';
  }
  controls.lock();
  if(clock) clock.start(); else clock = new THREE.Clock();
  try{ if(typeof fafiApplySensitivity==='function') fafiApplySensitivity(); }catch(e){}
  try{ if(typeof fafiApplyEquippedSkins==='function') setTimeout(()=>fafiApplyEquippedSkins(), 800); }catch(e){}
  updateHUD();
}
function startAimMode(){ startGame('aim'); }
function startDust2Mode(){
  const btn = document.getElementById('dust2Btn');
  const shellBtn = document.getElementById('fafiPlayDust2');
  const shellOrig = shellBtn ? (shellBtn.dataset.orig || shellBtn.textContent) : null;
  if(shellBtn && !shellBtn.dataset.orig) shellBtn.dataset.orig = shellBtn.textContent;
  if(!scene) initThree();
  if(mapReady()){
    if(btn) btn.disabled = false;
    if(shellBtn){ shellBtn.disabled=false; shellBtn.textContent=shellBtn.dataset.orig||'🗺️ DUST II — EXPLORACIÓN POR BANDOS'; }
    try{ if(typeof fafiHideShell==='function') fafiHideShell(); }catch(e){}
    showTeamSelect('menu');
    return;
  }
  if(dust2Loading){
    try{ if(typeof showFloating==='function') showFloating('Cargando Dust2... espera'); }catch(e){}
    return;
  }
  if(btn) btn.disabled = true;
  if(shellBtn){ shellBtn.disabled=true; shellBtn.textContent='⏳ CARGANDO DUST2... 0%'; }
  const mirror = setInterval(()=>{
    try{
      const le=document.getElementById('dust2Loading');
      if(shellBtn && le && le.textContent) shellBtn.textContent='⏳ '+le.textContent;
      if(mapReady()){ clearInterval(mirror); if(shellBtn){ shellBtn.disabled=false; shellBtn.textContent=shellBtn.dataset.orig||'🗺️ DUST II — EXPLORACIÓN POR BANDOS'; } }
    }catch(e){}
  }, 200);
  loadDust2Map(()=>{
    clearInterval(mirror);
    if(btn) btn.disabled = false;
    if(shellBtn){ shellBtn.disabled=false; shellBtn.textContent=shellBtn.dataset.orig||'🗺️ DUST II — EXPLORACIÓN POR BANDOS'; }
    try{ if(typeof fafiHideShell==='function') fafiHideShell(); }catch(e){}
    showTeamSelect('menu');
  });
}

function endGame(){
  // en Dust2 no hay fin por tiempo, solo por ESC -> goMenu
  if(gameMode==='dust2'){
    goMenu();
    return;
  }
  gameActive=false;
  isAiming=false; isReloading=false; isHoldingShoot=false; viewRecoilX=0; viewRecoilY=0; isInspecting=false; inspectProgress=0; isCrouching=false; crouchProgress=0; freeCam=false;
  if(camera){ camera.fov=baseFov; camera.updateProjectionMatrix(); camera.position.y=standHeight; }
  document.getElementById('aimVignette')?.classList.remove('on');
  document.getElementById('crosshair')?.classList.remove('aiming');
  document.getElementById('scopeOverlay')?.classList.remove('on');
  try{ controls.unlock(); }catch(e){}
  clearTargets(); clearBullets();
  const acc = shots? Math.round(hits/shots*100):0;
  rScore.textContent=score;
  rHits.textContent=hits + ' / ' + shots;
  rAcc.textContent=acc+'%';
  let rank='PRINCIPIANTE';
  if(score>=2000) rank='¡LEYENDA FAFI!';
  else if(score>=1500) rank='ELITE';
  else if(score>=1000) rank='PRO';
  else if(score>=600) rank='BUEN AIM';
  else if(score>=300) rank='EN PROGRESO';
  rRank.textContent=rank;
  resultOverlay.classList.add('show');
  try{
    const earned=Math.floor(score/10);
    if(earned>0 && window.currentUserId){ window.fafiCoins+=earned; fafiSaveGameData(); fafiUpdateCoinsDisplay(); }
    if(score>=1000) fafiUnlock('aim_pro');
    if(window.campaignActiveLevel && score>=600){
      const passedLvl=window.campaignActiveLevel;
      if(window.campaignLevel<=passedLvl){ window.campaignLevel=Math.min(5, passedLvl+1); }
      fafiUnlock('campaign_hero'); fafiSaveGameData();
      fafiDbCompleteCampaign(passedLvl);
      rRank.textContent+=' • NIVEL '+passedLvl+' SUPERADO (+'+earned+' coins)';
    } else if(window.campaignActiveLevel){
      rRank.textContent+=' • NIVEL '+window.campaignActiveLevel+' NO SUPERADO (necesitas 600)';
    } else if(earned>0){ rRank.textContent+=' (+'+earned+' coins)'; }
    if(earned>0) fafiDbAwardCoins(earned);
  }catch(e){}
}

function goMenu(){
  if(defuse.active) defuse.endMatch();
  [tSpawnRing,ctSpawnRing].forEach(r=>{ if(r) r.visible=true; });
  playerFrozen=false; spectating=false; viewmodelHidden=false; document.body.classList.remove('df-on');
  gameActive=false;
  gameMode='aim';
  buyMenuOpen=false;
  document.getElementById('buyMenu')?.classList.remove('show');
  isAiming=false; isReloading=false; reloadProgress=0; isHoldingShoot=false; viewRecoilX=0; viewRecoilY=0; spreadAccum=0; recoilPatternStep=0; isInspecting=false; inspectProgress=0; isCrouching=false; crouchProgress=0; freeCam=false;
  playerVelY=0; playerGrounded=false; dust2GroundY=null;
  walkTime=0; viewBobY=0; lastViewBobY=0; landShake=0; jumpBob=0;
  jumpFatigueMult=1; consecutiveJumps=0; lastJumpTime=0;
  wallLimit.xmin=-10.2; wallLimit.xmax=10.2; wallLimit.zmin=-11; wallLimit.zmax=16;
  if(camera){ camera.fov=baseFov; camera.updateProjectionMatrix(); camera.position.y=standHeight; camera.rotation.z=0; }
  document.getElementById('reloadBar')?.classList.remove('show');
  document.getElementById('reloadText')?.classList.remove('show');
  document.getElementById('aimVignette')?.classList.remove('on');
  document.getElementById('crosshair')?.classList.remove('aiming');
  document.getElementById('scopeOverlay')?.classList.remove('on');
  try{ controls.unlock(); }catch(e){}
  clearTargets(); clearBullets(); spamHeat=0; consecutiveSpam=0;
  // volver a AIM visualmente
  setMapVisibility('aim');
  document.getElementById('weapon-info').querySelector('b').textContent = 'AK-47';
  resultOverlay.classList.remove('show');
  pauseOverlay.classList.remove('show');
  document.getElementById('teamOverlay')?.classList.remove('show');
  gameEl.classList.remove('active');
  try{
    if(window.currentUserId && typeof fafiShowShell==='function'){ menu.style.display='none'; fafiShowShell(); }
    else { menu.style.display='flex'; }
  }catch(e){ menu.style.display='flex'; }
  // reset HUD modo
  timeLeft = 30;
  updateHUD();
}

// events - modos
playBtn.addEventListener('click', startAimMode);
document.getElementById('dust2Btn').addEventListener('click', startDust2Mode);
document.getElementById('teamT').addEventListener('click', ()=>{ if(!mapReady()) return; hideTeamSelect(); startGame('dust2','t'); });
document.getElementById('teamCT').addEventListener('click', ()=>{ if(!mapReady()) return; hideTeamSelect(); startGame('dust2','ct'); });
document.getElementById('teamBack').addEventListener('click', ()=>{
  hideTeamSelect();
  if(teamReturn==='pause' && gameActive) pauseOverlay.classList.add('show');
  else if(window.currentUserId && typeof fafiShowShell==='function') fafiShowShell();
  else menu.style.display='flex';
});
document.getElementById('teamSwitchBtn').addEventListener('click', ()=> showTeamSelect('pause'));
document.getElementById('againBtn').addEventListener('click', ()=> startGame(gameMode));
document.getElementById('menuBtn2').addEventListener('click', goMenu);
document.getElementById('menuBtnPause').addEventListener('click', goMenu);
document.getElementById('resumeBtn').addEventListener('click', ()=>{ if(buyMenuOpen) setBuyMenu(false); pauseOverlay.classList.remove('show'); controls.lock(); });
document.getElementById('buyCloseBtn')?.addEventListener('click', ()=> setBuyMenu(false));
document.querySelectorAll('[data-util]').forEach(b=>b.addEventListener('click',()=>buyUtil(b.dataset.util)));




let lastTime=performance.now();
// === FPS chiquito arriba-derecha + MINIMAPA circular Dust2 (sup-izq) ===
let lastCapT=0;
function animate(){
  rafId=requestAnimationFrame(animate);
  { const fc=QUALITY[qualityLevel].fpsCap; if(fc){ const n0=performance.now(); if(n0-lastCapT < 1000/fc-2) return; lastCapT=n0; } }   // tope de FPS en calidad mínima: menos CPU/GPU
  const now=performance.now();
  const dt = Math.min((now-lastTime)/1000, 0.05); lastTime=now;
  try{ updateFPS(now); }catch(e){}
  try{ if(gameMode==='dust2' && gameActive) drawMinimap(); }catch(e){}

  if(mixer) mixer.update(dt);
  updateWeaponAnim(dt);
  updateViewRecoil(dt);
  handleMovement(dt);
  updateFootsteps(dt);
  SFX.listener(camera);
  updateBullets(dt);
  updateDebris(dt);
  if(!defuse.active) updateCharacters();
  if(!pauseOverlay.classList.contains('show')) defuse.update(dt);
  updateFlashOverlay(dt);
  grenades.update(dt);
  if(sunLight) updateSun(sunLight, camera.position, qualityLevel, SUN_DIR);
  if(skyDome && skyDome.visible) skyDome.position.copy(camera.position);
  // cadencia automática si mantienes pulsado (AK) / repetición cuchillo
  if(isHoldingShoot && gameActive && controls.isLocked && !isReloading && !pauseOverlay.classList.contains('show') && !resultOverlay.classList.contains('show')){
    if(currentWeapon==='ak' || currentWeapon==='m4') shoot();
    else if(currentWeapon==='knife' && !isKnifeSwinging && !isInspecting) knifeAttack();
  }
  // reset patrón de recoil tras pausa de disparo larga
  if(performance.now() - lastShotTime > 650) { recoilPatternStep = 0; }

  if(gameActive && !pauseOverlay.classList.contains('show') && !resultOverlay.classList.contains('show')){
    if(isFinite(timeLeft)){
      timeLeft -= dt;
      if(timeLeft<=0){ timeLeft=0; updateHUD(); endGame(); }
      else updateHUD();
    } else { updateHUD(); }

    // keep at least 3 targets solo en AIM
    if(gameMode==='aim'){
      if(targets.length<3 && Math.random()<0.04) spawnTarget();
      // subtle target drift
      targets.forEach(t=>{
        t.position.add(t.userData.vel.clone().multiplyScalar(dt));
        // bounce inside wall bounds
        if(t.position.x < -8 || t.position.x > 8) t.userData.vel.x*=-1;
        if(t.position.y < 1 || t.position.y > 5.8) t.userData.vel.y*=-1;
        t.position.x = Math.max(-8, Math.min(8, t.position.x));
        t.position.y = Math.max(1, Math.min(5.8, t.position.y));
        t.rotation.z += dt*0.6;
      });
    }
  }

  if(renderer && scene && camera) renderFrame();
}



/* ===== (antes player.js) ===== */
const WEAPON_MOVE_MULT = { knife:1.22, deagle:0.97, ak:0.84, m4:0.88, awp:0.73 }; // cuchillo más rápido pero reducido un poco (pedido)
function getWeaponMoveMult(){ return WEAPON_MOVE_MULT[currentWeapon]||1; }
function applyPlayerScale(){
  playerRadius=basePlayerRadius*playerScale*playerRadiusScale;
  standHeight=baseStandHeight*playerScale;
  crouchHeight=baseCrouchHeight*playerScale;
  if(playerDummy) playerDummy.scale.setScalar(playerScale);
}
// escala del HUD según la ventana (1.0 a ~1500x820); se aplica con zoom CSS a los paneles de partida
function applyHudScale(){ const s=Math.max(0.7, Math.min(1.15, Math.min(innerWidth/1500, innerHeight/820))); document.documentElement.style.setProperty('--hs', s.toFixed(3)); }
applyHudScale(); window.addEventListener('resize', applyHudScale);
const WBAR_SLOTS=[['ak','1','AK-47'],['awp','3','AWP'],['m4','5','M4A4'],['deagle','4','DEAGLE'],['knife','2','CUCHILLO']];
function renderWeaponBar(){
  const el=document.getElementById('wBar'); if(!el) return;
  const list=WBAR_SLOTS.filter(([k])=> gameMode!=='dust2' || owned[k]);
  const html=list.map(([k,key,name])=>'<span class="'+(currentWeapon===k?'sel':'')+'"><i>'+key+'</i>'+name+'</span>').join('');
  if(el.dataset.h!==html){ el.dataset.h=html; el.innerHTML=html; }
}
function updateAmmoHUD(){
  try{ renderWeaponBar(); }catch(e){}
  const el=document.getElementById('ammoEl');
  const mode=document.getElementById('weaponMode');
  const icon=document.querySelector('#weapon-info .icon');
  if(icon) icon.textContent = GRENADES[currentWeapon] ? GRENADES[currentWeapon].icon : currentWeapon==='knife' ? '🔪' : currentWeapon==='awp' ? '🎯' : currentWeapon==='deagle' ? '🔫' : '🔫';
  if(GRENADES[currentWeapon]){ if(el){ el.textContent='×'+grenadeStock[currentWeapon]; el.style.color='#ffcb5c'; } if(mode) mode.textContent=WEAPON_LABEL[currentWeapon]+' • Click para lanzar'; renderGrenadeBar(); return; }
  renderGrenadeBar();
  if(!el) return;
  if(currentWeapon==='knife'){
    el.textContent='—'; el.style.color='#cdd6e6';
    if(mode) mode.textContent = isInspecting ? 'Inspeccionando cuchillo...' : isKnifeSwinging ? '¡Corte!' : 'Cuchillo • Click para apuñalar';
    return;
  }
  if(isReloading){ el.textContent='RECARGANDO'; el.style.color='#ffcc66'; }
  else if(ammoInMag===0){ el.textContent='0 / '+reserveAmmo; el.style.color='#ff3b3b'; }
  else if(ammoInMag<=3 && currentWeapon==='deagle'){ el.textContent=ammoInMag+' / '+reserveAmmo; el.style.color='#ff6b3b'; }
  else if(ammoInMag<=6){ el.textContent=ammoInMag+' / '+reserveAmmo; el.style.color='#ff6b3b'; }
  else { el.textContent=ammoInMag+' / '+reserveAmmo; el.style.color='#3aa0ff'; }
  if(mode){
    if(currentWeapon==='deagle') mode.textContent = isInspecting ? 'Inspeccionando Deagle...' : isAiming ? (isCrouching?'Apuntado Agachado • Precisión ++':'Apuntando Deagle • Precisión +') : isCrouching ? 'Agachado • Cadera' : (isReloading?'Recargando...':'Cadera • Click disparar');
    else mode.textContent = isInspecting ? 'Inspeccionando...' : isAiming ? (isCrouching ? 'Apuntado Agachado • Precisión ++' : 'Apuntando • Precisión +') : isCrouching ? 'Agachado • Cadera' : (isReloading ? 'Recargando...' : 'Cadera • Click disparar');
  }
}
function updateWeaponVisibility(){
  if(viewmodelHidden){ [akModel,knifeModel,awpModel,deagleModel].forEach(m=>{ if(m) m.visible=false; }); for(const k in animW) animW[k].holder.visible=false; for(const k in gHolders) gHolders[k].visible=false; updateAmmoHUD(); return; }
  for(const k in gHolders) gHolders[k].visible = (!freeCam && currentWeapon===k);
  if(freeCam){
    if(akModel) akModel.visible=false;
    if(knifeModel) knifeModel.visible=false;
    if(awpModel) awpModel.visible=false;
    if(deagleModel) deagleModel.visible=false;
    for(const k in animW) animW[k].holder.visible=false;
    if(dummyAK) dummyAK.visible=(currentWeapon==='ak');
    if(dummyKnife) dummyKnife.visible=(currentWeapon==='knife');
    if(dummyAWP) dummyAWP.visible=(currentWeapon==='awp');
    if(dummyDeagle) dummyDeagle.visible=(currentWeapon==='deagle');
  } else {
    if(akModel) akModel.visible = (currentWeapon==='ak');
    if(knifeModel) knifeModel.visible = (currentWeapon==='knife');
    if(awpModel) awpModel.visible = (currentWeapon==='awp');
    if(deagleModel) deagleModel.visible = (currentWeapon==='deagle');
    for(const k in animW) animW[k].holder.visible = (currentWeapon===k);
  }
  const cross=document.getElementById('crosshair');
  if(cross) cross.style.display='block';
  const scope=document.getElementById('scopeOverlay');
  if(currentWeapon!=='awp' && scope) scope.classList.remove('on');
  if(currentWeapon==='knife' && isAiming){ isAiming=false; aimProgress=0; if(camera){ camera.fov=baseFov; camera.updateProjectionMatrix(); } }
  if(currentWeapon!=='awp' && scope) scope.classList.remove('on');
  updateAmmoHUD();
}
function switchWeapon(to){
  if(!WEAPON_LABEL[to]) return;
  if(GRENADES[to] && grenadeStock[to]<=0){ showFloating('Sin '+WEAPON_LABEL[to]); return; }
  if(currentWeapon===to) return;
  if(isReloading || isBoltCycling) return;
  // En Dust2 solo puedes sacar lo que tienes en el inventario (CS:GO)
  if(gameMode==='dust2' && !owned[to]){
    showFloating('No tienes '+WEAPON_LABEL[to]+' • Pulsa B para comprar');
    return;
  }
  if(currentWeapon==='ak'){ akStoredAmmo=ammoInMag; akStoredReserve=reserveAmmo; }
  else if(currentWeapon==='awp'){ awpAmmo=ammoInMag; awpReserve=reserveAmmo; }
  else if(currentWeapon==='deagle'){ deagleAmmo=ammoInMag; deagleReserve=reserveAmmo; }
  else if(animAmmo[currentWeapon]){ animAmmo[currentWeapon].ammo=ammoInMag; animAmmo[currentWeapon].reserve=reserveAmmo; }
  // cancelar estados
  isInspecting=false; inspectProgress=0;
  isKnifeSwinging=false; knifeSwingProgress=0;
  isBoltCycling=false; boltProgress=0;
  isAiming=false; aimProgress=0;
  if(camera){ camera.fov=baseFov; camera.updateProjectionMatrix(); }
  const scope=document.getElementById('scopeOverlay');
  if(scope) scope.classList.remove('on');
  if(to==='ak'){ maxMag=30; ammoInMag=akStoredAmmo; reserveAmmo=akStoredReserve; }
  else if(to==='awp'){ maxMag=awpMaxMag; ammoInMag=awpAmmo; reserveAmmo=awpReserve; }
  else if(to==='deagle'){ maxMag=deagleMaxMag; ammoInMag=deagleAmmo; reserveAmmo=deagleReserve; }
  else if(ANIM_WEAPONS[to]){ maxMag=ANIM_WEAPONS[to].mag; ammoInMag=animAmmo[to].ammo; reserveAmmo=animAmmo[to].reserve; }
  else if(GRENADES[to]){ maxMag=1; ammoInMag=grenadeStock[to]; reserveAmmo=0; }
  else if(to==='knife'){ /* sin munición */ }
  SFX.play(to==='knife'?'draw_knife':'draw');
  currentWeapon=to;
  updateWeaponVisibility();
  if(ANIM_WEAPONS[to]) animWeaponDraw(to);
  showFloating(WEAPON_LABEL[to]);
  if(buyMenuOpen) updateBuyMenu();
}
function tryReload(){
  if(GRENADES[currentWeapon]) return;
  if(spectating) return;
  if(!gameActive || isReloading) return;
  if(typeof buyMenuOpen!=='undefined' && buyMenuOpen) return;
  if(isInspecting){ isInspecting=false; inspectProgress=0; }
  if(ammoInMag===maxMag) return;
  if(reserveAmmo<=0 && reserveAmmo!==Infinity) return;
  isReloading=true;
  reloadProgress=0;
  isAiming=false;
  document.getElementById('reloadBar').classList.add('show');
  document.getElementById('reloadText').classList.add('show');
  updateAmmoHUD();
  SFX.play('reload_out');
  setTimeout(()=>{ if(isReloading) SFX.play('reload_in'); }, 780);
}

function finishReload(){
  const needed = maxMag - ammoInMag;
  const take = Math.min(needed, reserveAmmo);
  ammoInMag += take;
  reserveAmmo -= take;
  isReloading=false;
  reloadProgress=0;
  document.getElementById('reloadBar').classList.remove('show');
  document.getElementById('reloadText').classList.remove('show');
  document.getElementById('reloadFill').style.width='0%';
  updateAmmoHUD();
  SFX.play('bolt', { vol:0.8 });
}

function setAiming(v){
  if(currentWeapon==='deagle') v=false;
  if(isReloading || isInspecting) v=false;
  isAiming=v;
  updateAmmoHUD();
}
function tryInspect(){
  if(GRENADES[currentWeapon]) return;
  if(spectating) return;
  if(!gameActive || isReloading || isInspecting || isBoltCycling) return;
  if(!controls.isLocked) return;
  if(currentWeapon==='ak' && (!akModel || !weaponBasePos)) return;
  if(currentWeapon==='knife') return;   // el cuchillo no se inspecciona (solo animación de ataque)
  if(currentWeapon==='awp' && (!awpModel || !awpBasePos)) return;
  if(currentWeapon==='deagle' && (!deagleModel || !deagleBasePos)) return;
  if(ANIM_WEAPONS[currentWeapon] && !animW[currentWeapon]) return;
  SFX.play('inspect');
  isInspecting=true;
  inspectProgress=0;
  isAiming=false;
  updateAmmoHUD();
}
function knifeAttack(){
  if(spectating || playerFrozen) return;
  if(!gameActive || !controls.isLocked || isReloading || isKnifeSwinging) return;
  if(typeof buyMenuOpen!=='undefined' && buyMenuOpen) return;
  if(currentWeapon!=='knife') return;
  // si estabas inspeccionando, al atacar se cancela (pedido: al disparar se cancela animación)
  if(isInspecting){ isInspecting=false; inspectProgress=0; updateAmmoHUD(); }
  isKnifeSwinging=true; knifeSwingProgress=0; knifeSwingDir *= -1;
  SFX.play('knife');
  updateAmmoHUD();
  // hit se evalúa a los 0.12s (en el swing)
  setTimeout(()=>{
    if(!gameActive) return;
    // raycast corto 1.9m al centro
    raycaster.setFromCamera({x:0,y:0}, camera);
    const hitObjs=[]; targets.forEach(g=> g.traverse(o=>{ if(o.isMesh) hitObjs.push(o); }));
    raycaster.far=1.9;
    const hitsArr = raycaster.intersectObjects(hitObjs, false);
    raycaster.far=100;
    if(defuse.active){ const dd=new THREE.Vector3(); camera.getWorldDirection(dd); defuse.meleeHit(camera.position, dd, 1.9); }
    let hit=null, pt=null;
    if(hitsArr.length && hitsArr[0].distance < 1.9){
      let obj=hitsArr[0].object; while(obj && !targets.includes(obj)) obj=obj.parent;
      if(obj){ hit=obj; pt=hitsArr[0].point; }
    }
    if(hit){
      spawnParticles(pt, 0xff3b3b);
      hitMarker.classList.add('show'); setTimeout(()=>hitMarker.classList.remove('show'),120);
      hits++; score+=150; showFloating('+150 🔪'); updateHUD();
      scene.remove(hit); targets = targets.filter(x=>x!==hit); if(gameActive) setTimeout(spawnTarget, 180);
    } else {
      // aire
      // pequeño efecto de corte en aire
    }
  }, 115);
}
function updateWeaponAnim(dt){
  if(viewmodelHidden) return;
  // anti-clip arma (paredes + suelo + techo): test del segmento cámara→punta
  // del arma contra el mapa. Si la punta quedaría dentro de geometría, el arma
  // se repliega (atrás + abajo + inclinada, estilo CS). Cubre mirar al suelo
  // con personaje pequeño (el arma no escala con el jugador).
  let wallPush = 0;
  if(gameMode==='dust2' && dust2Colliders.length && camera){
    // punta aproximada del arma en espacio de cámara (modelos sobredimensionados)
    const tipLocal = currentWeapon==='awp' ? new THREE.Vector3(0.34,-0.25,-1.25)
      : currentWeapon==='deagle' ? new THREE.Vector3(0.28,-0.24,-0.85)
      : currentWeapon==='knife' ? new THREE.Vector3(0.16,-0.26,-0.72)
      : new THREE.Vector3(0.35,-0.26,-1.15);
    // inspeccionando/recargando el arma se centra: acortar el test
    if(isInspecting || isReloading) tipLocal.multiplyScalar(0.7);
    // con mira AWP el arma está oculta: no hace falta empujar
    const scopeHidden = (currentWeapon==='awp' && isAiming && aimProgress>0.55);
    if(!scopeHidden){
      const camP = camera.getWorldPosition(new THREE.Vector3());
      const tipW = camera.localToWorld(tipLocal.clone());
      const seg = new THREE.Vector3().subVectors(tipW, camP);
      const segLen = seg.length();
      if(segLen > 0.05){
        seg.normalize();
        const ray = new THREE.Raycaster(camP, seg, 0, segLen);
        const hits = ray.intersectObjects(dust2Colliders, false);
        if(hits.length && hits[0].distance < segLen - 0.04){
          wallPush = Math.min(segLen*0.9, (segLen - hits[0].distance) + 0.08);
        }
      }
    }
    if(updateWeaponAnim._push===undefined) updateWeaponAnim._push=0;
    updateWeaponAnim._push = THREE.MathUtils.lerp(updateWeaponAnim._push, wallPush, 1 - Math.pow(0.001, dt*14));
    wallPush = updateWeaponAnim._push;
  } else {
    if(updateWeaponAnim._push) {
      updateWeaponAnim._push = THREE.MathUtils.lerp(updateWeaponAnim._push, 0, 1 - Math.pow(0.001, dt*14));
      wallPush = updateWeaponAnim._push;
    }
  }
  // M4A4 (procedural)
  if(GRENADES[currentWeapon]){ updateGrenadeView(dt); return; }
  if(ANIM_WEAPONS[currentWeapon]){ updateAnimWeapon(dt, wallPush); return; }
  // cuchillo tiene su propia animación
  if(currentWeapon==='knife'){
    if(!knifeModel || !knifeBasePos) return;
    const cross=document.getElementById('crosshair');
    if(cross) cross.classList.remove('aiming');
    const vign=document.getElementById('aimVignette');
    if(vign) vign.classList.remove('on');
    // inspección cuchillo - centrada en FOV, sin salirse (Valorant/CS:GO sutil)
    if(isInspecting){
      inspectProgress += dt / 2.9;
      const t=Math.min(inspectProgress,1);
      const kfsK = [
        {t:0.00, pos:new THREE.Vector3(0,0,0), rot:new THREE.Euler(0,0,0)},
        {t:0.20, pos:new THREE.Vector3(-0.07,0.05,0.03), rot:new THREE.Euler(-0.06,0.28,-0.05)},
        {t:0.38, pos:new THREE.Vector3(-0.09,0.06,0.04), rot:new THREE.Euler(0.07,0.52,0.14)},
        {t:0.58, pos:new THREE.Vector3(-0.07,0.04,0.03), rot:new THREE.Euler(-0.07,-0.32,-0.10)},
        {t:0.78, pos:new THREE.Vector3(-0.08,0.05,0.03), rot:new THREE.Euler(-0.03,0.18,0.04)},
        {t:1.00, pos:new THREE.Vector3(0,0,0), rot:new THREE.Euler(0,0,0)}
      ];
      let a=kfsK[0], b=kfsK[1];
      for(let i=0;i<kfsK.length-1;i++){ if(t>=kfsK[i].t && t<=kfsK[i+1].t){ a=kfsK[i]; b=kfsK[i+1]; break; } }
      const segT=(t-a.t)/Math.max(0.0001,b.t-a.t);
      const e= segT<0.5?4*segT*segT*segT:1-Math.pow(-2*segT+2,3)/2;
      const ip = knifeBasePos.clone().add(new THREE.Vector3().lerpVectors(a.pos,b.pos,e));
      const ir = new THREE.Euler(
        THREE.MathUtils.lerp(a.rot.x,b.rot.x,e),
        THREE.MathUtils.lerp(a.rot.y,b.rot.y,e),
        THREE.MathUtils.lerp(a.rot.z,b.rot.z,e)
      );
      // suavizado Valorant
      if(wallPush>0.01){ ip.z+=wallPush*0.7; ip.y-=wallPush*0.2; }
      knifeModel.position.lerp(ip, 0.38);
      knifeModel.rotation.x = THREE.MathUtils.lerp(knifeModel.rotation.x, knifeBaseRot.x + ir.x, 0.38);
      knifeModel.rotation.y = THREE.MathUtils.lerp(knifeModel.rotation.y, knifeBaseRot.y + ir.y, 0.38);
      knifeModel.rotation.z = THREE.MathUtils.lerp(knifeModel.rotation.z, knifeBaseRot.z + ir.z, 0.38);
      if(t>=1){ isInspecting=false; inspectProgress=0; updateAmmoHUD(); }
      return;
    }
    // ataque cuchillo - cortada HORIZONTAL hacia los costados (alterna izq/der)
    if(isKnifeSwinging){
      knifeSwingProgress += dt / 0.36;
      const t=Math.min(knifeSwingProgress,1);
      const dir = knifeSwingDir; // 1 = der->izq, -1 = izq->der
      let ip, ir;
      if(t < 0.18){
        const k=t/0.18; const e=1-Math.pow(1-k,3);
        // windup hacia el costado contrario
        ip = knifeBasePos.clone().add(new THREE.Vector3(dir*0.14*e, 0.05*e, 0.05*e));
        ir = new THREE.Euler(knifeBaseRot.x + 0.14*e, knifeBaseRot.y - dir*0.52*e, knifeBaseRot.z - dir*0.28*e);
      } else if(t < 0.54){
        const k=(t-0.18)/0.36; const e = k<0.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
        // slash horizontal de lado a lado
        const side = dir*(0.14 - 0.38*e);
        const fwd = Math.sin(e*Math.PI)*0.12;
        ip = knifeBasePos.clone().add(new THREE.Vector3(side, -0.03 + Math.sin(e*Math.PI)*-0.06, -0.06 - fwd*0.7));
        ir = new THREE.Euler(knifeBaseRot.x -0.08* Math.sin(e*Math.PI), knifeBaseRot.y + dir*0.92*Math.sin(e*Math.PI), knifeBaseRot.z + dir*0.88*Math.sin(e*Math.PI));
        // estela horizontal blanca
        if(!knifeModel.userData.trail && e>0.20 && e<0.78){
          const trailGeo = new THREE.BufferGeometry().setFromPoints([knifeBasePos.clone().add(new THREE.Vector3(dir*0.14,0.04,0)), ip.clone()]);
          const trailMat = new THREE.LineBasicMaterial({color:0xffffff, transparent:true, opacity:0.62});
          const trail = new THREE.Line(trailGeo, trailMat);
          scene.add(trail);
          knifeModel.userData.trail = trail;
          setTimeout(()=>{ scene.remove(trail); trailGeo.dispose(); knifeModel.userData.trail=null; }, 85);
        }
      } else {
        const k=(t-0.54)/0.46; const e=1-Math.pow(1-k,2);
        const slashEndPos = knifeBasePos.clone().add(new THREE.Vector3(dir*-0.24, -0.06, -0.12));
        const slashEndRot = new THREE.Euler(knifeBaseRot.x -0.08, knifeBaseRot.y + dir*0.38, knifeBaseRot.z + dir*0.32);
        ip = slashEndPos.clone().lerp(knifeBasePos, e);
        ir = new THREE.Euler(
          THREE.MathUtils.lerp(slashEndRot.x, knifeBaseRot.x, e),
          THREE.MathUtils.lerp(slashEndRot.y, knifeBaseRot.y, e),
          THREE.MathUtils.lerp(slashEndRot.z, knifeBaseRot.z, e)
        );
      }
      knifeModel.position.lerp(ip, 0.58);
      knifeModel.rotation.x = THREE.MathUtils.lerp(knifeModel.rotation.x, ir.x, 0.58);
      knifeModel.rotation.y = THREE.MathUtils.lerp(knifeModel.rotation.y, ir.y, 0.58);
      knifeModel.rotation.z = THREE.MathUtils.lerp(knifeModel.rotation.z, ir.z, 0.58);
      if(t>=1){ isKnifeSwinging=false; knifeSwingProgress=0; if(knifeModel.userData.trail){ scene.remove(knifeModel.userData.trail); knifeModel.userData.trail=null; } updateAmmoHUD(); }
      return;
    }
    // idle bob cuchillo (más ágil)
    const isMoving = (keys['KeyW']||keys['KeyA']||keys['KeyS']||keys['KeyD']);
    const time=performance.now()*0.001;
    const bobY = Math.sin(time*7.4)*0.006 + (isMoving? Math.sin(time*10)*0.007:0);
    const bobX = Math.cos(time*5.2)*0.004 + (isMoving? Math.cos(time*9)*0.005:0);
    const targetK = knifeBasePos.clone().add(new THREE.Vector3(bobX, bobY, 0));
    // agachado baja cuchillo un poco
    if(isCrouching) targetK.y -= 0.04 * crouchProgress;
    // empuje por pared (evita clipar)
    if(wallPush>0.01){ const lpk=Math.max(0,wallPush-0.35); targetK.z += wallPush*0.85; targetK.y -= wallPush*0.18+lpk*0.9; targetK.x += wallPush*0.08; }
    knifeModel.position.lerp(targetK, 1 - Math.pow(0.001, dt*1.2));
    knifeModel.rotation.x = THREE.MathUtils.lerp(knifeModel.rotation.x, knifeBaseRot.x - wallPush*0.28 - Math.max(0,wallPush-0.35)*0.55, 1 - Math.pow(0.001, dt*1.2));
    knifeModel.rotation.y = THREE.MathUtils.lerp(knifeModel.rotation.y, knifeBaseRot.y, 1 - Math.pow(0.001, dt*1.2));
    knifeModel.rotation.z = THREE.MathUtils.lerp(knifeModel.rotation.z, knifeBaseRot.z, 1 - Math.pow(0.001, dt*1.2));
    return;
  }
  // AWP - misma altura que AK, mira telescópica, cerrojo
  if(currentWeapon==='awp'){
    if(!awpModel || !awpBasePos) return;
    const targetAim = isAiming ? 1 : 0;
    aimProgress = THREE.MathUtils.lerp(aimProgress, targetAim, 1 - Math.pow(0.001, dt*(isAiming?11:10)));
    const smoothAim = 1 - Math.pow(1 - aimProgress, 3);
    const fov = THREE.MathUtils.lerp(baseFov, awpAimFov, smoothAim);
    if(Math.abs(camera.fov - fov) > 0.05){ camera.fov=fov; camera.updateProjectionMatrix(); }
    const scopeEl=document.getElementById('scopeOverlay');
    const vign=document.getElementById('aimVignette');
    const cross=document.getElementById('crosshair');
    if(scopeEl) scopeEl.classList.toggle('on', isAiming && aimProgress>0.55);
    if(vign) vign.classList.toggle('on', false);
    if(cross) cross.style.opacity = isAiming ? '0' : '1';
    awpModel.visible = !(isAiming && aimProgress>0.70);
    let targetPos = new THREE.Vector3().lerpVectors(awpBasePos, awpAimPos, smoothAim);
    let targetRot = new THREE.Euler(
      THREE.MathUtils.lerp(awpBaseRot.x, awpAimRot.x, smoothAim),
      THREE.MathUtils.lerp(awpBaseRot.y, awpAimRot.y, smoothAim),
      THREE.MathUtils.lerp(awpBaseRot.z, awpAimRot.z, smoothAim)
    );
    recoilKick = THREE.MathUtils.lerp(recoilKick, 0, 1 - Math.pow(0.0005, dt));
    targetPos.z += recoilKick * 0.34;
    targetPos.y += recoilKick * 0.06;
    targetRot.x += recoilKick * 0.32;
    targetRot.z += recoilKick * 0.08;
    if(isInspecting){
      inspectProgress += dt / 3.2;
      const t=Math.min(inspectProgress,1);
      const kfsA = [
        {t:0.00, pos:new THREE.Vector3(0,0,0), rot:new THREE.Euler(0,0,0)},
        {t:0.18, pos:new THREE.Vector3(-0.20,0.08,0.06), rot:new THREE.Euler(-0.09,0.28,-0.05)},
        {t:0.36, pos:new THREE.Vector3(-0.23,0.09,0.08), rot:new THREE.Euler(-0.05,0.58,0.12)},
        {t:0.56, pos:new THREE.Vector3(-0.19,0.06,0.07), rot:new THREE.Euler(-0.13,-0.36,-0.09)},
        {t:0.78, pos:new THREE.Vector3(-0.20,0.07,0.06), rot:new THREE.Euler(-0.07,0.24,0.04)},
        {t:1.00, pos:new THREE.Vector3(0,0,0), rot:new THREE.Euler(0,0,0)}
      ];
      let a=kfsA[0], b=kfsA[1];
      for(let i=0;i<kfsA.length-1;i++){ if(t>=kfsA[i].t && t<=kfsA[i+1].t){ a=kfsA[i]; b=kfsA[i+1]; break; } }
      const segT=(t-a.t)/Math.max(0.0001,b.t-a.t);
      const e= segT<0.5?4*segT*segT*segT:1-Math.pow(-2*segT+2,3)/2;
      const ip = awpBasePos.clone().add(new THREE.Vector3().lerpVectors(a.pos,b.pos,e));
      // interpolar desde base actual si venías apuntando
      const baseNowPos = new THREE.Vector3().lerpVectors(awpBasePos, awpAimPos, aimProgress);
      const baseNowRot = new THREE.Euler(
        THREE.MathUtils.lerp(awpBaseRot.x, awpAimRot.x, aimProgress),
        THREE.MathUtils.lerp(awpBaseRot.y, awpAimRot.y, aimProgress),
        THREE.MathUtils.lerp(awpBaseRot.z, awpAimRot.z, aimProgress)
      );
      const finalPos = ip.clone().add(baseNowPos).sub(awpBasePos);
      const finalRot = new THREE.Euler(baseNowRot.x + (b.rot.x-a.rot.x)*e + a.rot.x, baseNowRot.y + (b.rot.y-a.rot.y)*e + a.rot.y, baseNowRot.z + (b.rot.z-a.rot.z)*e + a.rot.z);
      // simplificado: ip ya es offset, usar baseNow + offset lerp
      const smoothIp = new THREE.Vector3().lerpVectors(baseNowPos, awpBasePos.clone().add(new THREE.Vector3().lerpVectors(a.pos,b.pos,e)), e);
      // para no complicar, usar ip directo con base
      awpModel.position.lerp(finalPos, 0.34);
      awpModel.rotation.x = THREE.MathUtils.lerp(awpModel.rotation.x, finalRot.x, 0.34);
      awpModel.rotation.y = THREE.MathUtils.lerp(awpModel.rotation.y, finalRot.y, 0.34);
      awpModel.rotation.z = THREE.MathUtils.lerp(awpModel.rotation.z, finalRot.z, 0.34);
      if(t>=1){ isInspecting=false; inspectProgress=0; updateAmmoHUD(); }
      return;
    } else if(isReloading){
      reloadProgress += dt / 2.4;
      const t=Math.min(reloadProgress,1);
      document.getElementById('reloadFill').style.width=(t*100)+'%';
      let y=0,z=0,rx=0;
      if(t<0.28){ const k=t/0.28; y=-0.42*Math.sin(k*Math.PI/2); z=0.16*k; rx=0.20*k; }
      else if(t<0.62){ const k=(t-0.28)/0.34; y=-0.42+0.09*Math.sin(k*Math.PI); rx=0.20-0.08*k; z=0.16; }
      else if(t<0.88){ const k=(t-0.62)/0.26; y=-0.42*(1-k)-0.04*Math.sin(k*Math.PI); z=0.16*(1-k*0.4); rx=0.12*(1-k); }
      else { const k=(t-0.88)/0.12; y=-0.04*(1-k); }
      targetPos.y+=y; targetPos.z+=z; targetRot.x+=rx;
      if(wallPush>0.01){ targetPos.z+=wallPush*0.7; targetPos.y-=wallPush*0.2; }
      awpModel.position.lerp(targetPos, 0.32);
      awpModel.rotation.x=THREE.MathUtils.lerp(awpModel.rotation.x,targetRot.x,0.32);
      awpModel.rotation.y=THREE.MathUtils.lerp(awpModel.rotation.y,targetRot.y,0.32);
      awpModel.rotation.z=THREE.MathUtils.lerp(awpModel.rotation.z,targetRot.z,0.32);
      if(t>=1) finishReload();
      return;
    } else if(isBoltCycling){
      boltProgress += dt / 0.62;
      const t=Math.min(boltProgress,1);
      let y=0,z=0,ry=0,rx=0;
      if(t<0.32){ const k=t/0.32; y=-0.08*k; z=-0.18*k; ry=-0.22*Math.sin(k*Math.PI); rx=0.12*k; }
      else if(t<0.68){ const k=(t-0.32)/0.36; y=-0.08+0.05*Math.sin(k*Math.PI); z=-0.18+0.22*k; ry=-0.22*Math.sin((1-k)*Math.PI)*0.5; }
      else { const k=(t-0.68)/0.32; y=-0.03*(1-k); z=0.04*(1-k); }
      targetPos.y+=y; targetPos.z+=z; targetRot.y+=ry; targetRot.x+=rx;
      awpModel.position.lerp(targetPos, 0.45);
      awpModel.rotation.x=THREE.MathUtils.lerp(awpModel.rotation.x,targetRot.x,0.45);
      awpModel.rotation.y=THREE.MathUtils.lerp(awpModel.rotation.y,targetRot.y,0.45);
      awpModel.rotation.z=THREE.MathUtils.lerp(awpModel.rotation.z,targetRot.z,0.45);
      if(t>=1){ isBoltCycling=false; boltProgress=0; }
      // mantener mira si estabas apuntando
      return;
    } else {
      const isMoving=(keys['KeyW']||keys['KeyA']||keys['KeyS']||keys['KeyD']);
      const moveBob=isMoving?1.12:1;
      const swayAmp=(1-aimProgress*0.97)*moveBob*(isAiming?0.13:1);
      const time=performance.now()*0.001;
      const swayX=Math.sin(time*0.85)*0.004*swayAmp + (isMoving?Math.sin(time*7.1)*0.002*swayAmp:0);
      const swayY=Math.cos(time*1.05)*0.003*swayAmp;
      const bob=Math.sin(time*(isMoving?7.8:1.6))*0.0015*swayAmp + (isMoving?Math.abs(Math.sin(time*7.8))*0.002*swayAmp:0);
      targetPos.x+=swayX; targetPos.y+=swayY+bob;
      if(isCrouching) targetPos.y-=0.03*crouchProgress;
      if(wallPush>0.01){ const lp=Math.max(0,wallPush-0.35); targetPos.z+=wallPush*0.85; targetPos.y-=wallPush*0.22+lp*0.9; targetPos.x+=wallPush*0.08; targetRot.x-=wallPush*0.32+lp*0.55; }
      awpModel.position.lerp(targetPos, 1 - Math.pow(0.001, dt*1.1));
      awpModel.rotation.x=THREE.MathUtils.lerp(awpModel.rotation.x,targetRot.x,1 - Math.pow(0.001, dt*1.1));
      awpModel.rotation.y=THREE.MathUtils.lerp(awpModel.rotation.y,targetRot.y,1 - Math.pow(0.001, dt*1.1));
      awpModel.rotation.z=THREE.MathUtils.lerp(awpModel.rotation.z,targetRot.z,1 - Math.pow(0.001, dt*1.1));
      return;
    }
  }
  // Deagle CSGO - pistola precisa quieta, imprecisa en movimiento
  if(currentWeapon==='deagle'){
    if(!deagleModel || !deagleBasePos) return;
    const targetAim = isAiming ? 1 : 0;
    aimProgress = THREE.MathUtils.lerp(aimProgress, targetAim, 1 - Math.pow(0.001, dt*14));
    const smoothAim = 1 - Math.pow(1 - aimProgress, 3);
    const fov = THREE.MathUtils.lerp(baseFov, 58, smoothAim);
    if(Math.abs(camera.fov - fov) > 0.05){ camera.fov=fov; camera.updateProjectionMatrix(); }
    const vign=document.getElementById('aimVignette');
    const cross=document.getElementById('crosshair');
    if(vign) vign.classList.toggle('on', isAiming && smoothAim>0.3);
    if(cross) cross.classList.toggle('aiming', isAiming);
    deagleModel.visible=true;
    let targetPos = new THREE.Vector3().lerpVectors(deagleBasePos, deagleAimPos, smoothAim);
    let targetRot = new THREE.Euler(
      THREE.MathUtils.lerp(deagleBaseRot.x, deagleAimRot.x, smoothAim),
      THREE.MathUtils.lerp(deagleBaseRot.y, deagleAimRot.y, smoothAim),
      THREE.MathUtils.lerp(deagleBaseRot.z, deagleAimRot.z, smoothAim)
    );
    recoilKick = THREE.MathUtils.lerp(recoilKick, 0, 1 - Math.pow(0.0005, dt));
    targetPos.z += recoilKick * 0.22;
    targetPos.y += recoilKick * 0.04;
    targetRot.x += recoilKick * 0.24;
    targetRot.y += recoilKick * 0.06;
    if(isInspecting){
      inspectProgress += dt / 2.4;
      const t=Math.min(inspectProgress,1);
      const kfsD = [
        {t:0.00, pos:new THREE.Vector3(0,0,0), rot:new THREE.Euler(0,0,0)},
        {t:0.22, pos:new THREE.Vector3(-0.10,0.05,0.04), rot:new THREE.Euler(-0.06,0.32,-0.08)},
        {t:0.45, pos:new THREE.Vector3(-0.13,0.07,0.05), rot:new THREE.Euler(0.08,0.62,0.18)},
        {t:0.68, pos:new THREE.Vector3(-0.09,0.04,0.04), rot:new THREE.Euler(-0.04,-0.28,-0.10)},
        {t:0.86, pos:new THREE.Vector3(-0.10,0.05,0.04), rot:new THREE.Euler(-0.02,0.18,0.04)},
        {t:1.00, pos:new THREE.Vector3(0,0,0), rot:new THREE.Euler(0,0,0)}
      ];
      let a=kfsD[0], b=kfsD[1];
      for(let i=0;i<kfsD.length-1;i++){ if(t>=kfsD[i].t && t<=kfsD[i+1].t){ a=kfsD[i]; b=kfsD[i+1]; break; } }
      const segT=(t-a.t)/Math.max(0.0001,b.t-a.t);
      const e= segT<0.5?4*segT*segT*segT:1-Math.pow(-2*segT+2,3)/2;
      const baseNowPos = new THREE.Vector3().lerpVectors(deagleBasePos, deagleAimPos, smoothAim);
      const baseNowRot = new THREE.Euler(
        THREE.MathUtils.lerp(deagleBaseRot.x, deagleAimRot.x, smoothAim),
        THREE.MathUtils.lerp(deagleBaseRot.y, deagleAimRot.y, smoothAim),
        THREE.MathUtils.lerp(deagleBaseRot.z, deagleAimRot.z, smoothAim)
      );
      const ip = baseNowPos.clone().add(new THREE.Vector3().lerpVectors(a.pos,b.pos,e));
      const ir = new THREE.Euler(baseNowRot.x + THREE.MathUtils.lerp(a.rot.x,b.rot.x,e), baseNowRot.y + THREE.MathUtils.lerp(a.rot.y,b.rot.y,e), baseNowRot.z + THREE.MathUtils.lerp(a.rot.z,b.rot.z,e));
      deagleModel.position.lerp(ip, 0.38);
      deagleModel.rotation.x = THREE.MathUtils.lerp(deagleModel.rotation.x, ir.x, 0.38);
      deagleModel.rotation.y = THREE.MathUtils.lerp(deagleModel.rotation.y, ir.y, 0.38);
      deagleModel.rotation.z = THREE.MathUtils.lerp(deagleModel.rotation.z, ir.z, 0.38);
      if(t>=1){ isInspecting=false; inspectProgress=0; updateAmmoHUD(); }
      return;
    } else if(isReloading){
      reloadProgress += dt / 1.9;
      const t=Math.min(reloadProgress,1);
      document.getElementById('reloadFill').style.width=(t*100)+'%';
      let y=0,z=0,rx=0;
      if(t<0.30){ const k=t/0.30; y=-0.32*Math.sin(k*Math.PI/2); z=0.12*k; rx=0.16*k; }
      else if(t<0.62){ const k=(t-0.30)/0.32; y=-0.32+0.06*Math.sin(k*Math.PI); }
      else { const k=(t-0.62)/0.38; y=-0.32*(1-k); z=0.12*(1-k); rx=0.16*(1-k); }
      targetPos.y+=y; targetPos.z+=z; targetRot.x+=rx;
      if(wallPush>0.01){ targetPos.z+=wallPush*0.7; targetPos.y-=wallPush*0.2; }
      deagleModel.position.lerp(targetPos, 0.34);
      deagleModel.rotation.x=THREE.MathUtils.lerp(deagleModel.rotation.x,targetRot.x,0.34);
      deagleModel.rotation.y=THREE.MathUtils.lerp(deagleModel.rotation.y,targetRot.y,0.34);
      deagleModel.rotation.z=THREE.MathUtils.lerp(deagleModel.rotation.z,targetRot.z,0.34);
      if(t>=1) finishReload();
      return;
    } else {
      const isMoving=(keys['KeyW']||keys['KeyA']||keys['KeyS']||keys['KeyD']);
      const moveBob=isMoving?1.18:1;
      const swayAmp=(1-smoothAim*0.88)*moveBob*(isAiming?0.22:1);
      const time=performance.now()*0.001;
      const swayX=Math.sin(time*0.95)*0.007*swayAmp + (isMoving?Math.sin(time*8.2)*0.004*swayAmp:0);
      const swayY=Math.cos(time*1.12)*0.005*swayAmp;
      targetPos.x+=swayX; targetPos.y+=swayY;
      if(isCrouching) targetPos.y-=0.02*crouchProgress;
      if(wallPush>0.01){ const lp=Math.max(0,wallPush-0.35); targetPos.z+=wallPush*0.85; targetPos.y-=wallPush*0.22+lp*0.9; targetPos.x+=wallPush*0.08; targetRot.x-=wallPush*0.32+lp*0.55; }
      deagleModel.position.lerp(targetPos, 1 - Math.pow(0.001, dt*1.25));
      deagleModel.rotation.x=THREE.MathUtils.lerp(deagleModel.rotation.x,targetRot.x,1 - Math.pow(0.001, dt*1.25));
      deagleModel.rotation.y=THREE.MathUtils.lerp(deagleModel.rotation.y,targetRot.y,1 - Math.pow(0.001, dt*1.25));
      deagleModel.rotation.z=THREE.MathUtils.lerp(deagleModel.rotation.z,targetRot.z,1 - Math.pow(0.001, dt*1.25));
      return;
    }
  }
  if(!akModel || !weaponBasePos) return;
  // lerp aim
  const targetAim = isAiming ? 1 : 0;
  aimProgress = THREE.MathUtils.lerp(aimProgress, targetAim, 1 - Math.pow(0.001, dt)); // smooth ~12/s
  // FOV
  const fov = THREE.MathUtils.lerp(baseFov, aimFov, aimProgress);
  if(Math.abs(camera.fov - fov) > 0.05){ camera.fov=fov; camera.updateProjectionMatrix(); }
  // vignette / crosshair
  const vign=document.getElementById('aimVignette');
  const cross=document.getElementById('crosshair');
  if(vign) vign.classList.toggle('on', aimProgress>0.45);
  if(cross) cross.classList.toggle('aiming', aimProgress>0.4);

  // base lerp
  let targetPos = new THREE.Vector3().lerpVectors(weaponBasePos, weaponAimPos, aimProgress);
  let targetRot = new THREE.Euler(
    THREE.MathUtils.lerp(weaponBaseRot.x, weaponAimRot.x, aimProgress),
    THREE.MathUtils.lerp(weaponBaseRot.y, weaponAimRot.y, aimProgress),
    THREE.MathUtils.lerp(weaponBaseRot.z, weaponAimRot.z, aimProgress)
  );

  // recoil spring
  recoilKick = THREE.MathUtils.lerp(recoilKick, 0, 1 - Math.pow(0.0005, dt));
  targetPos.z += recoilKick * 0.18;
  targetRot.x += recoilKick * 0.18;

  // inspección CS:GO / Valorant - fluida, sin giro 360 brusco, como en juego real
  if(isInspecting){
    inspectProgress += dt / inspectDuration;
    const t = Math.min(inspectProgress, 1);
    // keyframes al estilo CS:GO AK / Valorant Vandal (pos offset desde weaponBasePos, rot offset)
    const kfs = [
      {t:0.00, pos: new THREE.Vector3(0,0,0), rot: new THREE.Euler(0,0,0)},
      {t:0.16, pos: new THREE.Vector3(-0.18,0.07,0.05), rot: new THREE.Euler(-0.08, 0.22, -0.04)},
      {t:0.33, pos: new THREE.Vector3(-0.19,0.06,0.06), rot: new THREE.Euler(-0.04, 0.42, 0.08)},
      {t:0.53, pos: new THREE.Vector3(-0.17,0.05,0.07), rot: new THREE.Euler(-0.11, -0.32, -0.07)},
      {t:0.71, pos: new THREE.Vector3(-0.18,0.07,0.05), rot: new THREE.Euler(-0.06, 0.15, 0.04)},
      {t:0.87, pos: new THREE.Vector3(-0.18,0.07,0.05), rot: new THREE.Euler(-0.07, 0.18, -0.02)},
      {t:1.00, pos: new THREE.Vector3(0,0,0), rot: new THREE.Euler(0,0,0)}
    ];
    // encontrar segmento
    let a=kfs[0], b=kfs[1];
    for(let i=0;i<kfs.length-1;i++){ if(t >= kfs[i].t && t <= kfs[i+1].t){ a=kfs[i]; b=kfs[i+1]; break; } }
    const segT = (t - a.t) / Math.max(0.0001, b.t - a.t);
    // smoothstep CS:GO easing (cúbica)
    const e = segT<0.5 ? 4*segT*segT*segT : 1 - Math.pow(-2*segT+2,3)/2;
    const smoothP = new THREE.Vector3().lerpVectors(a.pos, b.pos, e);
    const smoothR = new THREE.Euler(
      THREE.MathUtils.lerp(a.rot.x, b.rot.x, e),
      THREE.MathUtils.lerp(a.rot.y, b.rot.y, e),
      THREE.MathUtils.lerp(a.rot.z, b.rot.z, e)
    );
    // al inicio y final, interpolar desde/hacia la pose actual (cadera/mira) para que no haya snap si estabas apuntando
    let basePosNow = new THREE.Vector3().lerpVectors(weaponBasePos, weaponAimPos, aimProgress);
    let baseRotNow = new THREE.Euler(
      THREE.MathUtils.lerp(weaponBaseRot.x, weaponAimRot.x, aimProgress),
      THREE.MathUtils.lerp(weaponBaseRot.y, weaponAimRot.y, aimProgress),
      THREE.MathUtils.lerp(weaponBaseRot.z, weaponAimRot.z, aimProgress)
    );
    // en t=0 y t=1 el offset es 0, así que ip = basePosNow, ir = baseRotNow -> transición perfecta
    const ip = basePosNow.clone().add(smoothP);
    const ir = new THREE.Euler(baseRotNow.x + smoothR.x, baseRotNow.y + smoothR.y, baseRotNow.z + smoothR.z);
    // micro-bob sutil Valorant durante la inspección
    if(t>0.16 && t<0.87){
      const bob = Math.sin((t-0.16)/0.71 * Math.PI * 2) * 0.004;
      ip.y += bob;
    }
    if(wallPush>0.01){ ip.z+=wallPush*0.7; ip.y-=wallPush*0.2; }
    // aplicar más lento para inspección pausada
    akModel.position.lerp(ip, 0.30);
    akModel.rotation.x = THREE.MathUtils.lerp(akModel.rotation.x, ir.x, 0.30);
    akModel.rotation.y = THREE.MathUtils.lerp(akModel.rotation.y, ir.y, 0.30);
    akModel.rotation.z = THREE.MathUtils.lerp(akModel.rotation.z, ir.z, 0.30);
    if(t >= 1){ isInspecting=false; inspectProgress=0; updateAmmoHUD(); }
  } else if(isReloading){
    reloadProgress += dt / 1.65; // duración
    const t = Math.min(reloadProgress,1);
    document.getElementById('reloadFill').style.width = (t*100)+'%';
    // curva: baja, inclina, vuelve
    let ry=0, y=0, z=0, rx=0;
    if(t < 0.22){
      const k=t/0.22; // baja
      y = -0.45 * Math.sin(k*Math.PI/2);
      z = 0.18 * k;
      rx = 0.22 * k;
    } else if(t < 0.55){
      const k=(t-0.22)/0.33;
      y = -0.45 + 0.10*Math.sin(k*Math.PI);
      rx = 0.22 - 0.10*k;
      ry = -0.10*Math.sin(k*Math.PI);
      z = 0.18;
    } else if(t < 0.82){
      const k=(t-0.55)/0.27;
      y = -0.45 * (1-k) + -0.06*Math.sin(k*Math.PI);
      z = 0.18*(1-k*0.5);
      rx = 0.12*(1-k);
    } else {
      const k=(t-0.82)/0.18;
      y = -0.06*(1-k);
      rx = 0;
    }
    targetPos.y += y;
    targetPos.z += z;
    targetRot.x += rx;
    targetRot.y += ry;
    if(wallPush>0.01){ targetPos.z+=wallPush*0.7; targetPos.y-=wallPush*0.2; }
    // ligera transición suave hacia ese target
    akModel.position.lerp(targetPos, 0.35);
    akModel.rotation.x = THREE.MathUtils.lerp(akModel.rotation.x, targetRot.x, 0.35);
    akModel.rotation.y = THREE.MathUtils.lerp(akModel.rotation.y, targetRot.y, 0.35);
    akModel.rotation.z = THREE.MathUtils.lerp(akModel.rotation.z, targetRot.z, 0.35);
    if(t>=1) finishReload();
  } else {
    // sway idle + bob (menos cuando se apunta) + extra bob al caminar
    const isMoving = (keys['KeyW']||keys['KeyS']||keys['KeyA']||keys['KeyD']||keys['ArrowUp']||keys['ArrowDown']);
    const moveBob = isMoving ? (keys['ShiftLeft']||keys['ShiftRight'] ? 1.9 : 1.35) : 1;
    const swayAmp = (1-aimProgress*0.85) * moveBob;
    const time = performance.now()*0.001;
    const walkFreq = isMoving ? (keys['ShiftLeft']? 9.5 : 7.2) : 0.9;
    const swayX = Math.sin(time*0.9)*0.012 * swayAmp + (isMoving? Math.sin(time*walkFreq)*0.006*swayAmp : 0);
    const swayY = Math.cos(time*1.1)*0.009 * swayAmp;
    const bob = Math.sin(time*(isMoving? walkFreq*1.15 : 1.8))*0.004 * swayAmp + (isMoving? Math.abs(Math.sin(time*walkFreq))*0.008*swayAmp : 0);
    targetPos.x += swayX;
    targetPos.y += swayY + bob;
    if(wallPush>0.01){ targetPos.z += wallPush*0.85; targetPos.y -= wallPush*0.22; targetPos.x += wallPush*0.08; targetRot.x -= wallPush*0.32; }
    // lerp suave del modelo hacia target (evita snaps)
    akModel.position.lerp(targetPos, 1 - Math.pow(0.001, dt));
    akModel.rotation.x = THREE.MathUtils.lerp(akModel.rotation.x, targetRot.x, 1 - Math.pow(0.001, dt));
    akModel.rotation.y = THREE.MathUtils.lerp(akModel.rotation.y, targetRot.y, 1 - Math.pow(0.001, dt));
    akModel.rotation.z = THREE.MathUtils.lerp(akModel.rotation.z, targetRot.z, 1 - Math.pow(0.001, dt));
  }
}
function spawnBullet(origin, dir, weapon='ak'){
  const isAWP=weapon==='awp', isDeagle=weapon==='deagle';
  const geo = new THREE.SphereGeometry(isAWP?0.010:isDeagle?0.012:0.011, 5, 5);
  const mat = new THREE.MeshBasicMaterial({color: isAWP?0xfff2c8:isDeagle?0xffd8a8:0xffe8a8, transparent:true, opacity:isAWP?0.18:isDeagle?0.24:0.22});
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(origin);
  const trailGeo = new THREE.BufferGeometry();
  const trailLen = isAWP?2:3;
  const positions = new Float32Array(trailLen*3);
  for(let i=0;i<trailLen;i++){ positions[i*3]=origin.x; positions[i*3+1]=origin.y; positions[i*3+2]=origin.z; }
  trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const trailMat = new THREE.LineBasicMaterial({color: isAWP?0xffeebb:isDeagle?0xffc88a:0xffd27a, transparent:true, opacity:isAWP?0.14:isDeagle?0.20:0.18});
  const trail = new THREE.Line(trailGeo, trailMat);
  scene.add(trail);
  scene.add(mesh);
  const speed = isAWP ? 138 : isDeagle ? 122 : (isAiming ? 115 : 110);
  const vel = dir.clone().multiplyScalar(speed);
  bullets.push({mesh, trail, trailGeo, vel, life: isAWP?1.9:isDeagle?1.7:1.6, prev: origin.clone(), trailLen, isAWP, isDeagle, weapon});
}

function updateBullets(dt){
  for(let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    b.prev.copy(b.mesh.position);
    // sin caída, vuelo recto
    // b.vel.y -= 9.8 * 0 * dt; // eliminado
    b.vel.multiplyScalar(0.9998); // drag mínimo
    b.mesh.position.add(b.vel.clone().multiplyScalar(dt));
    b.life -= dt;
    // actualizar estela
    const pos = b.trailGeo.attributes.position;
    for(let k=b.trailLen-1;k>0;k--){
      pos.array[k*3]=pos.array[(k-1)*3];
      pos.array[k*3+1]=pos.array[(k-1)*3+1];
      pos.array[k*3+2]=pos.array[(k-1)*3+2];
    }
    pos.array[0]=b.mesh.position.x; pos.array[1]=b.mesh.position.y; pos.array[2]=b.mesh.position.z;
    pos.needsUpdate=true;
    b.trail.material.opacity = Math.max(0, b.life/1.5 * 0.85);

    // colisión con blancos: segmento prev->pos vs esfera 0.62
    let hit=null, hitPoint=null;
    for(const t of targets){
      // test segmento-esfera
      const c = t.position;
      const r=0.62;
      const p1=b.prev, p2=b.mesh.position;
      const d = new THREE.Vector3().subVectors(p2,p1);
      const f = new THREE.Vector3().subVectors(p1,c);
      const a = d.dot(d);
      const bb = 2*f.dot(d);
      const cc = f.dot(f)-r*r;
      const disc = bb*bb -4*a*cc;
      if(disc>=0){
        const s = (-bb - Math.sqrt(disc))/(2*a);
        if(s>=0 && s<=1){
          hit=t;
          hitPoint = new THREE.Vector3().addVectors(p1, d.clone().multiplyScalar(s));
          break;
        }
      }
      // fallback distancia simple
      if(b.mesh.position.distanceTo(c) < 0.62){ hit=t; hitPoint=b.mesh.position.clone(); break; }
    }
    if(hit){
      spawnParticles(hitPoint, 0xff3b3b);
      hitMarker.classList.add('show'); setTimeout(()=>hitMarker.classList.remove('show'),120);
      SFX.play('hit');
      const pts=b.isAWP?250:b.isDeagle?140:100; hits++; score+=pts; showFloating('+'+pts+(b.isAWP?' AWP!':b.isDeagle?' DEAGLE!':'')); updateHUD();
      scene.remove(hit); targets = targets.filter(x=>x!==hit); if(gameActive) setTimeout(spawnTarget,120);
      // remover bala
      scene.remove(b.mesh); scene.remove(b.trail); b.trailGeo.dispose(); bullets.splice(i,1);
      continue;
    }
    // Defuse: impacto contra bots
    if(defuse.active && defuse.bulletHit(b.prev, b.mesh.position, b)){
      scene.remove(b.mesh); scene.remove(b.trail); b.trailGeo.dispose(); bullets.splice(i,1);
      continue;
    }
    // colisión suelo/pared + vida - adaptada por modo
    let outOfBounds = false;
    if(gameMode==='dust2'){
      // Dust2: límites amplios + chequeo suelo
      if(b.mesh.position.y < 0.02 || b.life<=0 || b.mesh.position.length() > 70) outOfBounds = true;
      // colisión con geometría Dust2 via raycast corto prev->pos
      if(!outOfBounds && dust2Group && dust2Group.visible){
        const dustMeshes = dust2Colliders;
        if(dustMeshes.length){
          const segDir = new THREE.Vector3().subVectors(b.mesh.position, b.prev);
          const segLen = segDir.length();
          if(segLen > 0.001){
            segDir.normalize();
            const r = new THREE.Raycaster(b.prev, segDir, 0, segLen);
            const hits = r.intersectObjects(dustMeshes, false);
            if(hits.length){
              impactFx(hits[0], segDir);
              // pequeña chispa en pared Dust2
              outOfBounds = true;
            }
          }
        }
      }
    } else {
      // AIM: límites clásicos
      if(b.mesh.position.y < 0.04 || b.mesh.position.length() > 45 || b.life<=0 || b.mesh.position.z < -13 || b.mesh.position.z > 18 || Math.abs(b.mesh.position.x)>13) outOfBounds = true;
      if(outOfBounds && b.mesh.position.z < -11.5 && Math.abs(b.mesh.position.x)<11){
        spawnParticles(b.mesh.position.clone(), 0x8aa0b8);
      }
    }
    if(outOfBounds){
      scene.remove(b.mesh); scene.remove(b.trail); b.trailGeo.dispose(); bullets.splice(i,1);
    }
  }
}
function updateViewRecoil(dt){
  // recuperación suave del retroceso de cámara + decaimiento de dispersión en ráfaga
  if(Math.abs(viewRecoilX) > 0.00001 || Math.abs(viewRecoilY) > 0.00001){
    const recSpeed = isAiming ? 7.5 : 5.2;
    const recX = viewRecoilX * recSpeed * dt;
    const recY = viewRecoilY * recSpeed * dt;
    // aplicar recuperación (rotar de vuelta)
    // pitch: viewRecoilX positivo = retroceso hacia arriba, recuperar es rotar abajo (positivo)
    camera.rotateX(recX);
    camera.rotateY(recY);
    viewRecoilX -= recX;
    viewRecoilY -= recY;
    if(Math.abs(viewRecoilX)<0.00005) viewRecoilX=0;
    if(Math.abs(viewRecoilY)<0.00005) viewRecoilY=0;
  }
  // spread y heat por ráfaga decaen cuando no disparas (más lento si spameaste mucho)
  const spreadDecay = isAiming ? 6.5 : 3.2;
  spreadAccum = THREE.MathUtils.lerp(spreadAccum, 0, 1 - Math.pow(0.001, dt*spreadDecay));
  // heat de spam decae exponencial, tarda ~1.2s en volver a 0 si dejaste de disparar
  const heatDecay = 2.4;
  spamHeat = THREE.MathUtils.lerp(spamHeat, 0, 1 - Math.pow(0.001, dt*heatDecay));
  if(spamHeat < 0.01) spamHeat=0;
}

function shoot(){
  if(spectating || playerFrozen) return;
  if(!gameActive || !controls.isLocked) return;
  if(typeof buyMenuOpen!=='undefined' && buyMenuOpen) return;
  if(GRENADES[currentWeapon]){ startThrow(); return; }
  if(isReloading) return;
  if(isInspecting){ isInspecting=false; inspectProgress=0; updateAmmoHUD(); }
  const now = performance.now();
  const curFireRate = currentWeapon==='awp' ? 1150 : currentWeapon==='deagle' ? 225 : ANIM_WEAPONS[currentWeapon] ? ANIM_WEAPONS[currentWeapon].fireMs : fireRate;
  if(now - lastShotTime < curFireRate) return;
  if(currentWeapon==='awp' && isBoltCycling) return;
  if(ammoInMag<=0){
    SFX.play('dry');
    tryReload();
    updateHUD();
    return;
  }
  const prevShot = lastShotTime;
  const isMovingNowPre = (keys['KeyW']||keys['KeyA']||keys['KeyS']||keys['KeyD']);
  const gap = now - prevShot;
  if(gap > 420) { spamHeat = Math.max(0, spamHeat*0.28); consecutiveSpam=0; }
  if(gap > 900) { spamHeat = 0; consecutiveSpam=0; spreadAccum*=0.5; }
  lastShotTime = now;
  ammoInMag--;
  shots++;
  if(currentWeapon==='awp'){
    // AWP: mucho más preciso y estable con mira
    const walkMultAwp = isMovingNowPre ? (isCrouching?1.05:1.18) : 1.0;
    const verticalKick = (isAiming ? 0.011 : 0.042) * walkMultAwp;
    const horizKick = ((Math.random()-0.5)*0.003 + (isMovingNowPre?(Math.random()-0.5)*0.003:0)) * walkMultAwp * (isAiming?0.18:1.0);
    viewRecoilX += verticalKick;
    viewRecoilY += horizKick;
    camera.rotateX(-verticalKick);
    camera.rotateY(-horizKick);
    const addSpreadAwp = isAiming ? 0.00018 : (isMovingNowPre?0.014:0.008);
    spreadAccum = Math.min(spreadAccum + addSpreadAwp, isAiming?0.0032:0.032);
    recoilKick = isAiming ? 0.68 : 1.92;
    isBoltCycling=true; boltProgress=0;
  } else if(currentWeapon==='deagle'){
    // Deagle CSGO: primer tiro láser, spameo muy castigado, mucho más preciso quieto y agachado
    spamHeat = Math.min(spamHeat + (isMovingNowPre?0.48:0.36), 3.9);
    consecutiveSpam++;
    const walkMultDeagle = isMovingNowPre ? (isCrouching?1.28:1.82) : 1.0;
    const aimMultDeagle = isAiming ? 0.38 : 1.0;
    const firstShotBonus = (consecutiveSpam===1 && spreadAccum<0.006) ? 0.68 : 1.0;
    const verticalKick = (isAiming ? 0.018 : 0.028) * walkMultDeagle * aimMultDeagle * firstShotBonus;
    const horizKick = ((Math.random()-0.5)*0.016 + Math.sin(consecutiveSpam*1.7)*0.005) * walkMultDeagle * aimMultDeagle * firstShotBonus;
    viewRecoilX += verticalKick;
    viewRecoilY += horizKick;
    camera.rotateX(-verticalKick);
    camera.rotateY(-horizKick);
    const addSpreadDeagle = (isAiming?0.0014:0.0038) * (1 + spamHeat*0.92) * walkMultDeagle;
    const maxSpreadDeagle = isAiming ? (isMovingNowPre?0.022:0.010) : (isMovingNowPre?0.088:0.032);
    spreadAccum = Math.min(spreadAccum + addSpreadDeagle, maxSpreadDeagle);
    recoilKick = (isAiming?0.88:1.38) * (1 + spamHeat*0.16);
  } else {
    // AK: recoil progresivo con spam + agachado reduce
    spamHeat = Math.min(spamHeat + (isMovingNowPre?0.33:0.23), 3.4);
    consecutiveSpam++;
    const spamMult = 1 + spamHeat * 0.42 + Math.pow(consecutiveSpam*0.06, 1.35);
    const walkMult = isMovingNowPre ? (isCrouching?1.18:1.48) : 1.0;
    const aimMult = isAiming ? 0.48 : 1.0;
    const combinedSpamWalk = spamMult * walkMult;
    recoilPatternStep = (recoilPatternStep + 1) % 12;
    const baseVert = (0.011 + Math.min(recoilPatternStep,8)*0.0016);
    const verticalKick = baseVert * aimMult * walkMult * (1 + spamHeat*0.38);
    const horizKick = ((Math.random()-0.5)*0.014 + Math.sin(recoilPatternStep*1.7)*0.0035 + spamHeat*0.0012*(Math.random()-0.5)) * aimMult * walkMult * (1 + spamHeat*0.18);
    viewRecoilX += verticalKick;
    viewRecoilY += horizKick;
    camera.rotateX(-verticalKick);
    camera.rotateY(-horizKick);
    const addSpread = (isAiming?0.0028:0.0062) * (1 + spamHeat*0.55) * walkMult;
    const maxSpread = isMovingNowPre ? 0.034 : 0.020;
    spreadAccum = Math.min(spreadAccum + addSpread, maxSpread);
    recoilKick = (isAiming?0.85:1.35) * (1 + spamHeat*0.22);
  }
  // muzzle flash - AK vs AWP
  const flashPos = currentWeapon==='awp'
    ? (isAiming ? new THREE.Vector3(0.02, -0.10, -0.92) : new THREE.Vector3(0.40, -0.26, -1.34))
    : currentWeapon==='deagle' ? new THREE.Vector3(0.14, -0.27, -1.30)
    : (isAiming ? new THREE.Vector3(0.02, -0.12, -0.78) : new THREE.Vector3(0.40, -0.28, -1.26));
  // light + sprite
  muzzleLight.position.copy(flashPos); muzzleLight.intensity=22;
  setTimeout(()=>{ muzzleLight.intensity=0; }, 45);
  // pequeño sprite de destello
  const flashMesh = new THREE.Mesh(new THREE.ConeGeometry(0.06,0.14,6), new THREE.MeshBasicMaterial({color:0xffd27a, transparent:true, opacity:0.95}));
  flashMesh.position.copy(flashPos);
  flashMesh.position.z -= 0.18;
  flashMesh.rotation.x=Math.PI;
  vmAdd(flashMesh);
  setTimeout(()=>vmRoot.remove(flashMesh), 40);
  // casing eject (pequeño cilindro dorado)
  const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.03,8), new THREE.MeshStandardMaterial({color:0xd8a44a, metalness:0.7, roughness:0.3}));
  casing.position.set(0.18, -0.18, -0.55);
  vmAdd(casing);
  const vel = new THREE.Vector3(0.9+Math.random()*0.6, 0.7+Math.random()*0.4, -0.6);
  let life=0.55;
  const tick=()=>{
    life-=0.016;
    casing.position.add(vel.clone().multiplyScalar(0.016));
    vel.y -= 9.8*0.016;
    casing.rotation.x+=0.3; casing.rotation.z+=0.2;
    if(life<=0) vmRoot.remove(casing); else requestAnimationFrame(tick);
  }; tick();

  SFX.play(['ak','awp','deagle','m4'].includes(currentWeapon)?currentWeapon:'rifle');
  if(defuse.active) defuse.noise(camera.position, currentWeapon==='awp'?60:38);
  if(currentWeapon==='awp') setTimeout(()=>SFX.play('bolt',{vol:0.9}), 520);

  // dirección con dispersión: AWP muy precisa con mira, AK progresivo
  raycaster.setFromCamera({x:0,y:0}, camera);
  const isMovingNow = (keys['KeyW']||keys['KeyA']||keys['KeyS']||keys['KeyD']);
  let baseSpread;
  if(currentWeapon==='awp'){
    baseSpread = isAiming ? 0.00012 : 0.012;
    if(isMovingNow) baseSpread += isAiming ? 0.0009 : 0.010;
    if(isCrouching && isAiming) baseSpread *= 0.38;
  } else if(currentWeapon==='deagle'){
    baseSpread = isAiming ? 0.00042 : 0.0018;
    if(isMovingNow) baseSpread += isAiming ? 0.0018 : 0.013;
    if(isCrouching) baseSpread *= isAiming?0.58:0.78;
    if(consecutiveSpam===1 && !isMovingNow) baseSpread *= 0.48;
  } else {
    baseSpread = 0.0009;
    if(isMovingNow) baseSpread += 0.0032;
  }
  const totalSpread = baseSpread + spreadAccum + (Math.abs(viewRecoilX)+Math.abs(viewRecoilY))*0.11;
  if(totalSpread > 0.0009){
    raycaster.ray.direction.x += (Math.random()-0.5)*totalSpread;
    raycaster.ray.direction.y += (Math.random()-0.5)*totalSpread;
    raycaster.ray.direction.normalize();
  }
  // origen de bala alineada con retícula - AWP sale igual pero con más velocidad
  const camPos = camera.getWorldPosition(new THREE.Vector3());
  const origin = camPos.clone().add(raycaster.ray.direction.clone().multiplyScalar(0.45));
  spawnBullet(origin, raycaster.ray.direction.clone(), currentWeapon);
  if(ANIM_WEAPONS[currentWeapon]) animWeaponShoot(currentWeapon);
  updateHUD();
}
// ===== impactos: polvo y esquirlas con gravedad y rebote + agujero de bala persistente =====
const DEB_MAX = 360;
const deb = (() => {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(DEB_MAX * 3), col = new Float32Array(DEB_MAX * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.055, vertexColors: true, sizeAttenuation: true, depthWrite: false, transparent: true, opacity: 0.95 }));
  pts.frustumCulled = false; pts.visible = false;
  return { geo, pos, col, pts, vel: new Float32Array(DEB_MAX * 3), life: new Float32Array(DEB_MAX), floor: new Float32Array(DEB_MAX), n: 0, head: 0, added: false };
})();
const _dc = new THREE.Color();
function emitDebris(p, nrm, hex, count, speed, floorY){
  if(!deb.added && scene){ scene.add(deb.pts); deb.added=true; }
  _dc.set(hex);
  for(let k=0;k<count;k++){
    const i = deb.head; deb.head = (deb.head+1)%DEB_MAX; deb.n = Math.min(DEB_MAX, deb.n+1);
    deb.pos[i*3]=p.x; deb.pos[i*3+1]=p.y; deb.pos[i*3+2]=p.z;
    const s = speed*(0.4+Math.random()*0.9);
    deb.vel[i*3]   = nrm.x*s + (Math.random()-0.5)*s*0.9;
    deb.vel[i*3+1] = nrm.y*s + Math.random()*s*0.6;
    deb.vel[i*3+2] = nrm.z*s + (Math.random()-0.5)*s*0.9;
    deb.life[i] = 0.5 + Math.random()*0.7; deb.floor[i] = floorY;
    const sh = 0.75 + Math.random()*0.35;
    deb.col[i*3]=_dc.r*sh; deb.col[i*3+1]=_dc.g*sh; deb.col[i*3+2]=_dc.b*sh;
  }
  deb.pts.visible = true; deb.geo.attributes.color.needsUpdate = true;
}
function updateDebris(dt){
  if(!deb.pts.visible) return;
  let alive = 0;
  for(let i=0;i<DEB_MAX;i++){
    if(deb.life[i] <= 0){ deb.pos[i*3+1] = -9999; continue; }
    deb.life[i] -= dt; alive++;
    deb.vel[i*3+1] -= 9.8*dt;
    const drag = Math.exp(-1.4*dt); deb.vel[i*3]*=drag; deb.vel[i*3+2]*=drag;
    deb.pos[i*3] += deb.vel[i*3]*dt; deb.pos[i*3+1] += deb.vel[i*3+1]*dt; deb.pos[i*3+2] += deb.vel[i*3+2]*dt;
    if(deb.pos[i*3+1] < deb.floor[i]){ deb.pos[i*3+1] = deb.floor[i]; deb.vel[i*3+1] *= -0.35; deb.vel[i*3]*=0.6; deb.vel[i*3+2]*=0.6; }
  }
  deb.geo.attributes.position.needsUpdate = true;
  if(!alive) deb.pts.visible = false;
}
const holes = []; let holeTex = null;
function bulletHole(p, nrm){
  if(!holeTex){
    const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');
    const gr=g.createRadialGradient(32,32,2,32,32,30); gr.addColorStop(0,'rgba(10,8,6,0.95)'); gr.addColorStop(0.35,'rgba(30,24,18,0.75)'); gr.addColorStop(1,'rgba(30,24,18,0)');
    g.fillStyle=gr; g.fillRect(0,0,64,64); holeTex=new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16,0.16), new THREE.MeshBasicMaterial({ map:holeTex, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-4, polygonOffsetUnits:-4 }));
  m.position.copy(p).addScaledVector(nrm, 0.012); m.lookAt(p.clone().add(nrm)); m.rotation.z = Math.random()*6.28; m.userData.t = 0;
  m.scale.setScalar(0.7+Math.random()*0.7);
  scene.add(m); holes.push(m);
  if(holes.length > 70){ const o=holes.shift(); scene.remove(o); o.geometry.dispose(); o.material.dispose(); }
}
const _hn = new THREE.Vector3();
function impactFx(hit, dir, hex=0xd8c2a0){
  const n = hit.face ? _hn.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).clone() : new THREE.Vector3(0,1,0);
  if(n.dot(dir) > 0) n.negate();
  const floorY = n.y > 0.7 ? hit.point.y : Math.min(dust2GroundY!==null ? dust2GroundY : 0, hit.point.y - 0.05);
  emitDebris(hit.point, n, hex, 14, 3.2, floorY);
  emitDebris(hit.point, n, 0xffc060, 4, 5.5, floorY);           // chispas
  bulletHole(hit.point, n);
  SFX.at('bulletwall', hit.point, { vol: 0.9, ref: 4 });
}

// === SANGRE: chorro de gotas con gravedad + neblina roja + manchas en suelo/pared (feedback de impacto) ===
const _bGeo=new THREE.SphereGeometry(0.03,5,4);
const _bMatA=new THREE.MeshBasicMaterial({color:0xb30d0d}), _bMatB=new THREE.MeshBasicMaterial({color:0x6e0606});
const _bTex=(()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,2,32,32,30); gr.addColorStop(0,'rgba(190,12,12,.9)'); gr.addColorStop(.55,'rgba(130,6,6,.5)'); gr.addColorStop(1,'rgba(90,0,0,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); })();
const _bDecalGeo=new THREE.CircleGeometry(0.13,10), _bDecalMat=new THREE.MeshBasicMaterial({color:0x6a0707, transparent:true, opacity:0.82, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2});
const bloodDecals=[], _bRay=new THREE.Raycaster(), _bDown=new THREE.Vector3(0,-1,0), _bn=new THREE.Vector3();
_bRay.firstHitOnly=true;
function bloodDecal(point, nrm, size){
  const m=new THREE.Mesh(_bDecalGeo,_bDecalMat);
  m.position.copy(point).addScaledVector(nrm,0.012); m.lookAt(point.clone().add(nrm)); m.rotation.z=Math.random()*6.28; m.scale.setScalar(size);
  scene.add(m); bloodDecals.push(m);
  if(bloodDecals.length>40) scene.remove(bloodDecals.shift());
}
function bloodFx(pos, dir, head){
  if(!pos) return;
  const low=!!QUALITY[qualityLevel].fpsCap;
  const p0=new THREE.Vector3(pos.x,pos.y,pos.z);
  const fwd=dir ? new THREE.Vector3(dir.x,dir.y,dir.z).normalize() : new THREE.Vector3(0,0,0);
  // neblina de sangre
  for(let i=0;i<(low?1:2);i++){
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:_bTex, transparent:true, depthWrite:false, fog:false}));
    sp.position.copy(p0).addScaledVector(fwd,0.08*i); sp.scale.setScalar(0.18); scene.add(sp);
    const t0=performance.now();
    const tick=()=>{ const k=(performance.now()-t0)/330; if(k>=1){ scene.remove(sp); sp.material.dispose(); return; } sp.scale.setScalar(0.18+k*(head?0.75:0.55)); sp.material.opacity=0.9*(1-k); sp.position.addScaledVector(fwd,0.012); requestAnimationFrame(tick); };
    tick();
  }
  // gotas: salen en el sentido de la bala, con dispersión y caída
  const n=low?5:(head?16:10), parts=[];
  for(let i=0;i<n;i++){
    const m=new THREE.Mesh(_bGeo, i%3?_bMatA:_bMatB); m.position.copy(p0); m.scale.setScalar(0.6+Math.random()*1.1);
    const v=new THREE.Vector3((Math.random()-0.5)*2.6,(Math.random()-0.2)*2.4,(Math.random()-0.5)*2.6).addScaledVector(fwd,1.5+Math.random()*3);
    scene.add(m); parts.push({m,v});
  }
  let last=performance.now(), life=0.7;
  const tick=()=>{
    const now=performance.now(), dt=Math.min(0.05,(now-last)/1000); last=now; life-=dt;
    for(const p of parts){ p.v.y-=9.8*dt; p.m.position.addScaledVector(p.v,dt); }
    if(life<=0){ for(const p of parts) scene.remove(p.m); return; }
    requestAnimationFrame(tick);
  };
  tick();
  // manchas: en el suelo bajo el impacto y en la pared que haya detrás
  if(dust2Colliders && dust2Colliders.length){
    _bRay.set(p0,_bDown); _bRay.far=5;
    const g=_bRay.intersectObjects(dust2Colliders,false)[0];
    if(g && g.face){ _bn.copy(g.face.normal).transformDirection(g.object.matrixWorld); if(_bn.y>0.5) setTimeout(()=>bloodDecal(g.point,_bn.clone(),0.7+Math.random()*0.8),180); }
    if(dir && !low){
      _bRay.set(p0,fwd); _bRay.far=3.2;
      const w=_bRay.intersectObjects(dust2Colliders,false)[0];
      if(w && w.face){ _bn.copy(w.face.normal).transformDirection(w.object.matrixWorld); if(_bn.dot(fwd)>0) _bn.negate(); bloodDecal(w.point,_bn.clone(),0.9+Math.random()*0.9); }
    }
  }
}
// impacto en casco: chispas metálicas en vez de sangre
function sparkFx(pos, dir){
  const p=new THREE.Vector3(pos.x,pos.y,pos.z);
  spawnParticles(p, 0xffe9a0);
  const back=dir ? new THREE.Vector3(-dir.x,-dir.y,-dir.z).normalize() : new THREE.Vector3(0,1,0);
  spawnParticles(p.clone().addScaledVector(back,0.05), 0xffffff);
}

const _pGeo=new THREE.SphereGeometry(0.04,4,4);
function spawnParticles(pos, color){
  const count=QUALITY[qualityLevel].fpsCap?4:10;
  for(let i=0;i<count;i++){
    const p = new THREE.Mesh(_pGeo, new THREE.MeshBasicMaterial({color}));
    p.position.copy(pos);
    const vel = new THREE.Vector3((Math.random()-0.5)*6, (Math.random()-0.5)*6, (Math.random()-0.5)*6);
    scene.add(p);
    let life=0.4;
    const tick = ()=>{
      life-=0.016;
      p.position.add(vel.clone().multiplyScalar(0.016));
      vel.y -= 9.8*0.016;
      p.material.opacity = life/0.4;
      p.material.transparent=true;
      if(life<=0) scene.remove(p);
      else requestAnimationFrame(tick);
    };
    tick();
  }
}


/* ===== (antes controls.js) ===== */

function updateDebugPanel(){}

function enterFreeCam(){
  if(!playerDummy) return;
  // dejar personaje quieto donde estabas
  const pos=camera.position.clone();
  playerDummy.position.set(pos.x, 0.02, pos.z);
  playerDummy.rotation.y = controls.getObject().rotation.y || 0;
  // limpiar clones previos
  if(dummyAK){ playerDummy.remove(dummyAK); dummyAK=null; }
  if(dummyKnife){ playerDummy.remove(dummyKnife); dummyKnife=null; }
  if(dummyAWP){ playerDummy.remove(dummyAWP); dummyAWP=null; }
  if(dummyDeagle){ playerDummy.remove(dummyDeagle); dummyDeagle=null; }
  // clonar armas actuales para verlas en el dummy
  if(akModel && weaponBasePos){
    dummyAK=akModel.clone(true);
    dummyAK.position.copy(weaponBasePos);
    dummyAK.rotation.copy(weaponBaseRot||new THREE.Euler());
    dummyAK.scale.copy(akModel.scale);
    dummyAK.position.add(new THREE.Vector3(0.18,0.95, -0.12));
    dummyAK.visible=(currentWeapon==='ak');
    playerDummy.add(dummyAK);
  }
  if(knifeModel && knifeBasePos){
    dummyKnife=knifeModel.clone(true);
    dummyKnife.position.copy(knifeBasePos);
    dummyKnife.rotation.copy(knifeBaseRot||new THREE.Euler());
    dummyKnife.scale.copy(knifeModel.scale);
    dummyKnife.position.add(new THREE.Vector3(0.12,0.92, -0.08));
    dummyKnife.visible=(currentWeapon==='knife');
    playerDummy.add(dummyKnife);
  }
  if(awpModel && awpBasePos){
    dummyAWP=awpModel.clone(true);
    dummyAWP.position.copy(awpBasePos);
    dummyAWP.rotation.copy(awpBaseRot||new THREE.Euler());
    dummyAWP.scale.copy(awpModel.scale);
    dummyAWP.position.add(new THREE.Vector3(0.22,0.92, -0.15));
    dummyAWP.visible=(currentWeapon==='awp');
    playerDummy.add(dummyAWP);
  }
  if(deagleModel && deagleBasePos){
    dummyDeagle=deagleModel.clone(true);
    dummyDeagle.position.copy(deagleBasePos);
    dummyDeagle.rotation.copy(deagleBaseRot||new THREE.Euler());
    dummyDeagle.scale.copy(deagleModel.scale);
    dummyDeagle.position.add(new THREE.Vector3(0.14,0.92, -0.10));
    dummyDeagle.visible=(currentWeapon==='deagle');
    playerDummy.add(dummyDeagle);
  }
  playerDummy.visible=true;
  if(akModel) akModel.visible=false;
  if(knifeModel) knifeModel.visible=false;
  if(awpModel) awpModel.visible=false;
  if(deagleModel) deagleModel.visible=false;
  const scope=document.getElementById('scopeOverlay');
  if(scope) scope.classList.remove('on');
}
function exitFreeCam(){
  if(playerDummy) playerDummy.visible=false;
  if(dummyAK){ playerDummy.remove(dummyAK); dummyAK=null; }
  if(dummyKnife){ playerDummy.remove(dummyKnife); dummyKnife=null; }
  if(dummyAWP){ playerDummy.remove(dummyAWP); dummyAWP=null; }
  if(dummyDeagle){ playerDummy.remove(dummyDeagle); dummyDeagle=null; }
  updateWeaponVisibility();
}
function toggleSpectator(){
  if(gameMode!=='dust2' || !gameActive){ showFloating('Espectador solo en DUST II'); return; }
  freeCam = !freeCam;
  const wb = document.getElementById('weapon-info')?.querySelector('b');
  const teamName = playerTeam==='t' ? 'TERRORISTAS' : 'ANTITERRORISTAS';
  if(freeCam){
    enterFreeCam();
    if(wb) wb.textContent = teamName + ' • ESPECTADOR';
    showFloating('ESPECTADOR — atraviesas todo (WASD + Espacio/Ctrl, SHIFT rápido, | para salir)');
  } else {
    exitFreeCam();
    playerVelY = 0; playerGrounded = false;
    if(wb) wb.textContent = teamName;
    showFloating('De vuelta al cuerpo');
  }
  updateWeaponVisibility();
}
window.addEventListener('keydown', (e)=>{
  // debug desactivado en producción (descomenta si necesitas calibrar teclado)
  // console.log('tecla:', e.code, 'key:', e.key, 'keyCode:', e.keyCode);
  keys[e.code]=true;
  if(buyMenuOpen){ if(buyKey(e)) return; }
  if(e.code==='KeyB' && !e.repeat && gameActive && gameMode==='dust2' && !resultOverlay.classList.contains('show')){ e.preventDefault(); toggleBuyMenu(); return; }
  // 1/2/3/4 y Q/Rueda para cambiar arma (en Dust2 solo si la posees)
  if(e.code==='Digit1' || e.code==='Numpad1'){ e.preventDefault(); switchWeapon('ak'); return; }
  if(e.code==='Digit2' || e.code==='Numpad2'){ e.preventDefault(); switchWeapon('knife'); return; }
  if(e.code==='Digit3' || e.code==='Numpad3'){ e.preventDefault(); switchWeapon('awp'); return; }
  if(e.code==='Digit4' || e.code==='Numpad4'){ e.preventDefault(); switchWeapon('deagle'); return; }
  if(e.code==='Digit5' || e.code==='Numpad5'){ e.preventDefault(); switchWeapon('m4'); return; }
  { const gk={Digit7:'flash',Digit8:'smoke',Digit9:'he',Digit0:'molo'}[e.code]; if(gk){ e.preventDefault(); switchWeapon(gk); return; } }
  if(e.code==='KeyQ' && !e.ctrlKey){
    e.preventDefault();
    if(gameMode==='dust2'){
      const order=nextOwnedWeapon();
      if(!order.length) return;
      let idx=order.indexOf(currentWeapon);
      switchWeapon(order[(idx+1)%order.length]);
    } else {
      const order=['ak','m4','knife','awp','deagle']; const idx=order.indexOf(currentWeapon); switchWeapon(order[(idx+1)%order.length]);
    }
    return;
  }
  // F = inspeccionar arma estilo CS:GO
  if(e.code==='KeyF'){
    e.preventDefault();
    tryInspect();
  }
});
window.addEventListener('keyup', (e)=>{ keys[e.code]=false; });
function getDust2GroundY(x, z, feetY){
  if(!dust2Colliders.length) return null;
  // Origen BAJO (pies+1.2m): así el techo de arcos/túneles queda POR ENCIMA
  // del origen y nunca se confunde con el suelo (era lo que bloqueaba las puertas)
  const origin = new THREE.Vector3(x, feetY + 1.2, z);
  const dir = new THREE.Vector3(0, -1, 0);
  const ray = new THREE.Raycaster(origin, dir, 0, 1.2 + 9);
  const hits = ray.intersectObjects(dust2Colliders, false);
  if(!hits.length) return null;
  for(let h of hits){
    // ignorar superficies por encima de los pies+tolerancia (techos, parte alta de arcos)
    if(h.point.y > feetY + stepMax + 0.02) continue;
    if(!h.face) return h.point.y;
    const nWorld = h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize();
    if(nWorld.y > 0.35) return h.point.y;
  }
  return null;
}
function getCeilingY(x, z, feetY){
  if(!dust2Colliders.length) return null;
  const origin = new THREE.Vector3(x, feetY + 0.25, z);
  const ray = new THREE.Raycaster(origin, new THREE.Vector3(0,1,0), 0, 4);
  const hits = ray.intersectObjects(dust2Colliders, false);
  for(let h of hits){
    if(!h.face) continue;
    const nWorld = h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize();
    if(nWorld.y < -0.4) return h.point.y;
  }
  return null;
}
function dust2WallCollides(origin, dir, dist, feetY, hLow, hTop){
  if(!dust2Colliders.length || dist < 0.001) return null;
  // Rayo bajo por ENCIMA de contrahuellas (0.45m): las escaleras no bloquean,
  // el chequeo de escalón del suelo se encarga de subirlas. El alto cubre ojos/cuerpo.
  const heights = [hLow, hTop];
  let closest = null;
  let minDist = Infinity;
  for(let h of heights){
    const o = new THREE.Vector3(origin.x, feetY + h, origin.z);
    const ray = new THREE.Raycaster(o, dir.clone().normalize(), 0, dist + (playerRadius+0.22)*colScale);
    const hits = ray.intersectObjects(dust2Colliders, false);
    if(hits.length && hits[0].distance < minDist){
      // verificar que sea pared vertical (normal horizontal)
      const nWorld = hits[0].face ? hits[0].face.normal.clone().transformDirection(hits[0].object.matrixWorld).normalize() : null;
      if(nWorld && Math.abs(nWorld.y) > 0.6) continue; // es suelo/techo, ignorar
      minDist = hits[0].distance;
      closest = hits[0];
    }
  }
  return closest;
}
// Desliza un vector de movimiento contra las paredes (3 iteraciones).
// Devuelve la nueva posición (misma Y de origen). No modifica la cámara.
function slideMovePos(fromPos, wishVec, feetY, hLow, hTop){
  let remaining = wishVec.clone(); remaining.y = 0;
  let newPos = fromPos.clone();
  for(let iter=0; iter<3; iter++){
    if(remaining.length() < 0.0005) break;
    const dir = remaining.clone().normalize();
    const dist = remaining.length();
    const hit = dust2WallCollides(newPos, dir, dist, feetY, hLow, hTop);
    if(hit && hit.distance < dist + (playerRadius+0.20)*colScale){
      const hitDist = Math.max(0, hit.distance - (playerRadius+0.20)*colScale);
      if(hitDist > 0.001){
        newPos.add(dir.clone().multiplyScalar(hitDist));
        remaining.sub(dir.clone().multiplyScalar(hitDist));
      }
      if(!hit.face){ remaining.multiplyScalar(0.5); continue; }
      const nWorld = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
      nWorld.y = 0;
      if(nWorld.lengthSq() < 0.0001){ remaining.multiplyScalar(0.5); continue; }
      nWorld.normalize();
      const dot = remaining.dot(nWorld);
      if(dot < 0) remaining.sub(nWorld.clone().multiplyScalar(dot));
      remaining.multiplyScalar(0.98);
    } else {
      newPos.add(remaining);
      remaining.set(0,0,0);
    }
  }
  newPos.y = fromPos.y;
  return newPos;
}

function handleMovement(dt){
  // quitar bob visual previo para no interferir con física / colisiones
  if(typeof camera!=='undefined' && camera && lastViewBobY!==0){
    camera.position.y -= lastViewBobY;
    lastViewBobY=0;
  }
  // fatiga anti bunny hop: recuperación lenta en suelo
  if(playerGrounded && performance.now() - lastJumpTime > 900){
    if(performance.now() - lastJumpTime > 1800) consecutiveJumps = 0;
    jumpFatigueMult = THREE.MathUtils.lerp(jumpFatigueMult, 1, 1 - Math.pow(0.001, dt*1.6));
    if(jumpFatigueMult > 0.992) jumpFatigueMult = 1;
    if(jumpFatigueMult < 1 && consecutiveJumps===0) jumpFatigueMult = THREE.MathUtils.lerp(jumpFatigueMult, 1, dt*0.9);
  }
  const targetCrouch = (keys['ShiftLeft']||keys['ShiftRight']) ? 1 : 0;
  crouchProgress = THREE.MathUtils.lerp(crouchProgress, targetCrouch, 1 - Math.pow(0.001, dt*9));
  isCrouching = crouchProgress > 0.02;
  const curHeight = THREE.MathUtils.lerp(standHeight, crouchHeight, crouchProgress);
  const curBody = curHeight; // cápsula de colisión (escalada con , . K L, puertas)
  const curEye = THREE.MathUtils.lerp(eyeStandHeight, eyeCrouchHeight, crouchProgress); // ojos (fijos)

  if(freeCam && gameActive){
    const fwd=(keys['KeyW']?1:0)-(keys['KeyS']?1:0);
    const rgh=(keys['KeyD']?1:0)-(keys['KeyA']?1:0);
    const up=(keys['Space']?1:0)-(keys['ControlLeft']||keys['ControlRight']?1:0);
    if(fwd!==0 || rgh!==0 || up!==0){
      const dirF=new THREE.Vector3(); camera.getWorldDirection(dirF);
      const dirR=new THREE.Vector3().crossVectors(dirF, new THREE.Vector3(0,1,0)).normalize();
      if(dirR.length()<0.01) dirR.set(1,0,0);
      const move=new THREE.Vector3();
      move.addScaledVector(dirF, fwd);
      move.addScaledVector(dirR, rgh);
      move.addScaledVector(new THREE.Vector3(0,1,0), up);
      if(move.length()>0) move.normalize();
      let speed=9.2; if(keys['ShiftLeft']||keys['ShiftRight']) speed=18;
      move.multiplyScalar(speed*dt);
      camera.position.add(move);
      controls.getObject().position.copy(camera.position);
    }
    return;
  }
  if(!gameActive || !controls || !controls.isLocked) return;
  if(playerFrozen || spectating) return;
  if(pauseOverlay.classList.contains('show') || resultOverlay.classList.contains('show')) return;

  // === DUST2 FÍSICAS COMPLETAS ===
  if(gameMode==='dust2' && dust2Colliders.length){
    const useArrows = !isAiming;
    const forward = (keys['KeyW']?1:0) - (keys['KeyS']?1:0) + (useArrows ? ((keys['ArrowUp']?1:0) - (keys['ArrowDown']?1:0)) : 0);
    const right = (keys['KeyD']?1:0) - (keys['KeyA']?1:0);
    // salto con Espacio + anti bunny hop (fatiga si spameas)
    if(keys['Space'] && playerGrounded && !isCrouching && playerVelY < 0.1){
      const nowJump = performance.now();
      const sinceLastJump = nowJump - lastJumpTime;
      if(sinceLastJump > 1800) consecutiveJumps = 0;
      consecutiveJumps++;
      lastJumpTime = nowJump;
      let jumpMult = 1;
      if(consecutiveJumps===2) jumpMult = 0.78;
      else if(consecutiveJumps===3) jumpMult = 0.58;
      else if(consecutiveJumps>=4) jumpMult = 0.42;
      // fatiga de velocidad: a más saltos seguidos, más lento te mueves un rato
      if(consecutiveJumps===2) jumpFatigueMult = Math.min(jumpFatigueMult, 0.78);
      else if(consecutiveJumps===3) jumpFatigueMult = Math.min(jumpFatigueMult, 0.62);
      else if(consecutiveJumps>=4) jumpFatigueMult = Math.min(jumpFatigueMult, 0.48);
      if(consecutiveJumps>=2){
        landShake = Math.min(0.18, landShake + 0.035*consecutiveJumps);
        if(consecutiveJumps>=3) showFloating('¡Cansado! -'+Math.round((1-jumpFatigueMult)*100)+'% vel');
      }
      playerVelY = playerJumpForce * jumpMult;
      playerGrounded = false;
    }
    // alturas de rayos: bajo por encima de contrahuellas (escaleras), alto cubre ojos/cuerpo
    const hTop = Math.max(curEye, curBody) * 0.7 * Math.min(1, colScale*1.5);
    const hLow = Math.min(0.45, hTop * 0.6);
    // detectar suelo actual (se pasa la altura de los PIES, no del ojo)
    let groundY = getDust2GroundY(camera.position.x, camera.position.z, camera.position.y - curEye);
    if(groundY !== null) dust2GroundY = groundY;
    else if(dust2GroundY===null) dust2GroundY = 0;
    // gravedad y vertical
    if(groundY !== null){
      const targetY = groundY + curEye;
      const distToGround = camera.position.y - targetY;
      if(playerGrounded){
        if(distToGround > 0.25){
          playerGrounded = false;
        } else {
          // snap suave al suelo + pequeña tolerancia para escalones
          camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.28);
          playerVelY = 0;
          if(Math.abs(distToGround) < 0.04) camera.position.y = targetY;
        }
      }
      if(!playerGrounded){
        playerVelY += playerGravity * dt;
        // techo - evitar atravesar techos bajos al saltar
        if(playerVelY > 0){
          const upOrigin = new THREE.Vector3(camera.position.x, camera.position.y + 0.15, camera.position.z);
          const upRay = new THREE.Raycaster(upOrigin, new THREE.Vector3(0,1,0), 0, 0.55);
          const upHits = upRay.intersectObjects(dust2Colliders, false);
          if(upHits.length && upHits[0].distance < 0.38){
            playerVelY = 0;
            // empujar levemente hacia abajo para no quedar pegado
            camera.position.y = upHits[0].point.y - 0.35;
          }
        }
        camera.position.y += playerVelY * dt;
        if(camera.position.y <= targetY){
          camera.position.y = targetY;
          playerVelY = 0;
          playerGrounded = true;
        }
      }
    } else {
      // sin suelo - cayendo al vacío
      playerVelY += playerGravity * dt;
      camera.position.y += playerVelY * dt;
      playerGrounded = false;
      if(camera.position.y < -15){
        camera.position.set(0, 1.65, 14);
        controls.getObject().position.copy(camera.position);
        playerVelY = 0;
        playerGrounded = false;
        showFloating('¡Caída! respawn');
      }
    }
    // techo: los ojos nunca entran en arcos/techos bajos (cámara alta + cuerpo chico)
    {
      const feetNow = camera.position.y - curEye;
      const ceil = getCeilingY(camera.position.x, camera.position.z, feetNow);
      if(ceil !== null && camera.position.y > ceil - 0.12){
        camera.position.y = ceil - 0.12;
        if(playerVelY > 0) playerVelY = 0;
      }
    }

    // movimiento horizontal solo si hay input
    if(forward!==0 || right!==0 || pVel.lengthSq()>0.0004){
      const dirF = new THREE.Vector3(); camera.getWorldDirection(dirF); dirF.y=0; dirF.normalize();
      const dirR = new THREE.Vector3(-dirF.z, 0, dirF.x);
      const wish = new THREE.Vector3();
      wish.addScaledVector(dirF, forward);
      wish.addScaledVector(dirR, right);
      if(wish.length()>0) wish.normalize();
      let wMult = getWeaponMoveMult(); // peso del arma: cuchillo más rápido
      // fatiga por bunny hop: saltos seguidos te relentizan
      let fatigueMult = (typeof jumpFatigueMult!=='undefined') ? jumpFatigueMult : 1;
      let speed = (isCrouching ? baseCrouchSpeed : baseMoveSpeed) * wMult * fatigueMult;
      // en Dust2 correr un poco más rápido si no apunta (pero sigue pesado por arma)
      if(!isAiming && !isCrouching) speed *= 1.08;
      if(isAiming) speed *= 0.52;
      if(isReloading) speed *= 0.65;
      // inspeccionar ya no baja velocidad (pedido)
      // sincronizar compat vars (sin contar fatiga para no afectar base)
      moveSpeed = baseMoveSpeed * wMult; crouchSpeed = baseCrouchSpeed * wMult;
      // inercia: acelera hacia la velocidad deseada, frena con fricción en suelo y casi no se controla en el aire
      { const rate = playerGrounded ? ((forward!==0||right!==0) ? 13 : 10) : 1.5, k = 1 - Math.exp(-rate*dt);
        pVel.x += (wish.x*speed - pVel.x)*k; pVel.z += (wish.z*speed - pVel.z)*k;
        if(pVel.lengthSq()<0.0009 && forward===0 && right===0) pVel.set(0,0,0); }
      wish.copy(pVel).multiplyScalar(dt);
      const preX = camera.position.x, preZ = camera.position.z;
      // colisiones con deslizamiento + asistencia para colarse por puertas
      if(wish.length() > 0.0001){
        const feetMove = camera.position.y - curEye;
        let newPos = slideMovePos(camera.position, wish, feetMove, hLow, hTop);
        // asistencia de puertas: si avanzamos <30% (choque frontal contra el
        // marco o una hoja abierta), probar direcciones cercanas ±18°/±35°
        const flatMoved = new THREE.Vector3(newPos.x-camera.position.x, 0, newPos.z-camera.position.z).length();
        if(flatMoved < wish.length()*0.30 && wish.length() > 0.004){
          const baseAng = Math.atan2(wish.x, wish.z);
          let bestPos = newPos, bestLen = flatMoved;
          for(const off of [0.31, -0.31, 0.61, -0.61]){
            const a = baseAng + off;
            const probe = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(wish.length());
            const cand = slideMovePos(camera.position, probe, feetMove, hLow, hTop);
            const cl = new THREE.Vector3(cand.x-camera.position.x, 0, cand.z-camera.position.z).length();
            if(cl > bestLen){ bestLen = cl; bestPos = cand; }
          }
          newPos = bestPos;
        }
        // comprobar escalón / altura del nuevo suelo antes de aplicar
        const newGroundY = getDust2GroundY(newPos.x, newPos.z, newPos.y - curEye);
        if(newGroundY !== null && groundY !== null){
          const step = newGroundY - groundY;
          if(step > stepMax){
            // escalón demasiado alto, bloquear X/Z pero mantener Y
            // no mover
          } else {
            // aplicar X/Z, Y se ajustará por gravedad/snap en próximo frame
            camera.position.x = newPos.x;
            camera.position.z = newPos.z;
            // si escalón pequeño, subir un poco ya (con tope: nunca deriva por encima del suelo+ojo)
            if(step > 0.08 && step < stepMax && playerGrounded){
              camera.position.y += step * 0.9;
              const capY = newGroundY + curEye + 0.05;
              if(camera.position.y > capY) camera.position.y = capY;
            }
          }
        } else {
          camera.position.x = newPos.x;
          camera.position.z = newPos.z;
        }
        // clamp límites exteriores como seguridad
        camera.position.x = Math.max(wallLimit.xmin, Math.min(wallLimit.xmax, camera.position.x));
        camera.position.z = Math.max(wallLimit.zmin, Math.min(wallLimit.zmax, camera.position.z));
        // al chocar contra una pared se pierde la velocidad que la atraviesa (desliza en vez de quedarse empujando)
        { const ax=(camera.position.x-preX)/Math.max(dt,0.001), az=(camera.position.z-preZ)/Math.max(dt,0.001); if(Math.hypot(ax,az) < Math.hypot(pVel.x,pVel.z)*0.8){ pVel.x=ax; pVel.z=az; } }
      }
    }
    // resolver penetración residual - 8 direcciones + vista, evita ver a través de costado (foto 2)
    for(let k=0;k<3;k++){
      let pushed=false;
      const dirs = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, -3*Math.PI/4, -Math.PI/2, -Math.PI/4];
      for(const ang of dirs){
        const dir = new THREE.Vector3(Math.sin(ang),0,Math.cos(ang));
        const hit = dust2WallCollides(camera.position, dir, (playerRadius+0.22)*colScale, camera.position.y - curEye, hLow, hTop);
        if(hit && hit.distance < (playerRadius+0.20)*colScale){
          const push = (playerRadius+0.24)*colScale - hit.distance;
          camera.position.add(dir.clone().negate().multiplyScalar(push + 0.02));
          pushed=true;
        }
      }
      // también empujar si la pared está justo delante de tu vista (aunque no te muevas de costado)
      {
        const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y=0; if(fwd.lengthSq()>0.0001){ fwd.normalize();
          const hitF = dust2WallCollides(camera.position, fwd, 0.65*colScale, camera.position.y - curEye, hLow, hTop);
          if(hitF && hitF.distance < (playerRadius+0.18)*colScale){
            const pushF = (playerRadius+0.22)*colScale - hitF.distance;
            camera.position.add(fwd.clone().negate().multiplyScalar(pushF + 0.02));
            pushed=true;
          }
        }
      }
      if(!pushed) break;
    }
    // === ANIMACIÓN Dust2: caminata / salto / agachado (peso por arma, más lento base) ===
    {
      let isMovingDust = (forward!==0 || right!==0);
      let justLanded = (!prevGrounded && playerGrounded);
      if(justLanded){ landShake = Math.min(0.14, Math.abs(playerVelY)*0.018 + 0.06); }
      if(!playerGrounded){
        jumpBob = THREE.MathUtils.lerp(jumpBob, playerVelY*0.011, 0.18);
      } else {
        jumpBob = THREE.MathUtils.lerp(jumpBob, 0, 0.22);
      }
      landShake = THREE.MathUtils.lerp(landShake, 0, 1 - Math.pow(0.001, dt*7));
      if(isMovingDust && playerGrounded && !isCrouching){
        let wM = getWeaponMoveMult();
        let freq = 6.15 + wM*1.25; // knife 7.80, deagle 7.36, ak 7.20, awp 7.06 (cuchillo pasos más rápidos)
        if(isAiming) freq *= 0.72;
        walkTime += dt * freq;
      } else if(isMovingDust && playerGrounded && isCrouching){
        walkTime += dt * 4.6;
      } else if(isMovingDust){
        walkTime += dt * 2.5;
      } else {
        // sin input: decay suave para que no haga snap
        walkTime += dt * 0.8;
      }
      let baseAmp = isCrouching ? 0.011 : 0.020;
      let aimDamp = isAiming ? 0.45 : 1.0;
      let wAmp = 0.75 + getWeaponMoveMult()*0.25; // knife 1.00, awp 0.935
      let walkBob = 0;
      if(isMovingDust && playerGrounded){
        walkBob = Math.sin(walkTime*2.0) * baseAmp * aimDamp * wAmp;
      }
      let crouchDip = -Math.sin(crouchProgress*Math.PI)*0.015;
      let totalBob = walkBob + jumpBob*0.5 + crouchDip*0.6 + (Math.sin(performance.now()*0.04)*landShake*0.35) - landShake*0.5;
      totalBob = Math.max(-0.06, Math.min(0.06, totalBob));
      viewBobY = totalBob;
      camera.position.y += viewBobY;
      lastViewBobY = viewBobY;
      prevGrounded = playerGrounded;
    }
    camera.position.x = Math.max(wallLimit.xmin, Math.min(wallLimit.xmax, camera.position.x));
    camera.position.z = Math.max(wallLimit.zmin, Math.min(wallLimit.zmax, camera.position.z));
    // sincronizar control object para dummy y demás
    controls.getObject().position.copy(camera.position);
    return;
  }

  // === MODO AIM (física simple clásica) ===
  if(gameActive && controls.isLocked && !pauseOverlay.classList.contains('show') && !resultOverlay.classList.contains('show') && gameMode!=='dust2'){
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, curEye, 1 - Math.pow(0.001, dt*12));
  } else if(!gameActive){
    crouchProgress=0; isCrouching=false;
  }
  const useArrowsForMove = !isAiming;
  const forward = (keys['KeyW']?1:0) - (keys['KeyS']?1:0) + (useArrowsForMove ? ((keys['ArrowUp']?1:0) - (keys['ArrowDown']?1:0)) : 0);
  const right = (keys['KeyD']?1:0) - (keys['KeyA']?1:0);
  if(forward===0 && right===0){
    // aún así mantener altura en AIM + animación agachado/aterrizaje incluso quieto
    if(gameMode==='aim' && gameActive && controls.isLocked){
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, curEye, 1 - Math.pow(0.001, dt*12));
    }
    // animación leve de agachado y landShake incluso sin caminar
    {
      landShake = THREE.MathUtils.lerp(landShake, 0, 1 - Math.pow(0.001, dt*7));
      let crouchDipAimQ = -Math.sin(crouchProgress*Math.PI)*0.012;
      let totalBobAimQ = crouchDipAimQ*0.5 - landShake*0.35;
      totalBobAimQ = Math.max(-0.05, Math.min(0.05, totalBobAimQ));
      viewBobY = totalBobAimQ;
      if(camera) camera.position.y += viewBobY;
      lastViewBobY = viewBobY;
      prevGrounded = true;
      walkTime += dt * 0.8;
    }
    return;
  }
  const dirF = new THREE.Vector3(); camera.getWorldDirection(dirF); dirF.y=0; dirF.normalize();
  const dirR = new THREE.Vector3(-dirF.z, 0, dirF.x);
  const move = new THREE.Vector3();
  move.addScaledVector(dirF, forward);
  move.addScaledVector(dirR, right);
  if(move.length()>0) move.normalize();
  let wMult2 = getWeaponMoveMult();
  let fatigueMult2 = (typeof jumpFatigueMult!=='undefined') ? jumpFatigueMult : 1;
  let speed = (isCrouching ? baseCrouchSpeed : baseMoveSpeed) * wMult2 * fatigueMult2;
  if(isAiming) speed *= 0.52;
  if(isReloading) speed *= 0.65;
  // inspeccionar no baja velocidad (pedido)
  if(isCrouching && isAiming) speed *= 0.88;
  moveSpeed = baseMoveSpeed * wMult2; crouchSpeed = baseCrouchSpeed * wMult2;
  move.multiplyScalar(speed * dt);
  const next = camera.position.clone().add(move);
  next.x = Math.max(wallLimit.xmin, Math.min(wallLimit.xmax, next.x));
  next.z = Math.max(wallLimit.zmin, Math.min(wallLimit.zmax, next.z));
  next.y = curEye;
  // === ANIMACIÓN AIM caminata / agachado (más lenta base, peso por arma) ===
  {
    let wM = getWeaponMoveMult();
    let freq = isCrouching ? 4.8 : (6.0 + wM*1.15); // knife 7.51, awp 6.83 (cuchillo pasos más rápidos)
    if(isAiming) freq *= 0.70;
    walkTime += dt * freq;
    let baseAmp = isCrouching ? 0.010 : 0.018;
    let aimDamp = isAiming ? 0.42 : 1.0;
    let wAmp = 0.78 + wM*0.22;
    let walkBobAim = Math.sin(walkTime*2.0) * baseAmp * aimDamp * wAmp;
    let crouchDipAim = -Math.sin(crouchProgress*Math.PI)*0.012;
    let totalBobAim = walkBobAim + crouchDipAim*0.5;
    totalBobAim = Math.max(-0.05, Math.min(0.05, totalBobAim));
    next.y += totalBobAim;
    viewBobY = totalBobAim;
    lastViewBobY = viewBobY;
    prevGrounded = true;
  }
  camera.position.copy(next);
  controls.getObject().position.copy(camera.position);
}
let fpsFrames=0, fpsLastT=performance.now(), fpsVal=60;
function updateFPS(now){
  fpsFrames++;
  const el=now-fpsLastT;
  if(el>=500){
    fpsVal=Math.round(fpsFrames*1000/el);
    fpsFrames=0; fpsLastT=now;
    const c=document.getElementById('fpsCounter');
    if(c) c.textContent=fpsVal+' FPS';
  }
}
// === MINIMAPA: vista cenital de TODO el mapa cargado (se renderiza una vez por mapa y se guarda) ===
const mmCache={};
function buildMinimapImage(key){
  const b=dust2Group && dust2Group.userData.bounds; if(!b || !renderer || !scene) return null;
  const mw=b.max.x-b.min.x, mh=b.max.z-b.min.z;
  const S=Math.min(14, 720/Math.max(mw,mh)), W=Math.max(8,Math.ceil(mw*S)), H=Math.max(8,Math.ceil(mh*S));
  const cut=b.min.y+(b.max.y-b.min.y)*0.9;                       // corta los techos para ver los pasillos
  const cam=new THREE.OrthographicCamera(b.min.x,b.max.x,-b.min.z,-b.max.z,0.1,400);
  cam.position.set(0,b.max.y+40,0); cam.up.set(0,0,-1); cam.lookAt(0,0,0);
  const rt=new THREE.WebGLRenderTarget(W,H); rt.texture.colorSpace=THREE.SRGBColorSpace;
  // estado a restaurar
  const oldRT=renderer.getRenderTarget(), oldClip=renderer.clippingPlanes, oldAlpha=renderer.getClearAlpha(), oldCol=renderer.getClearColor(new THREE.Color());
  const oldBg=scene.background, oldFog=scene.fog, hid=[];
  scene.children.forEach(o=>{ if(o!==dust2Group && !o.isLight && o.visible){ o.visible=false; hid.push(o); } });
  const chars=[]; dust2Group.traverse(o=>{ if((o.userData&&o.userData.isChar)||o.isSprite){ if(o.visible){ o.visible=false; chars.push(o); } } });
  scene.background=null; scene.fog=null; setLights(ATMOS.day);
  renderer.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0), cut)];
  renderer.setClearColor(0x000000,0);
  let px=null;
  try{
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene,cam);
    px=new Uint8Array(W*H*4); renderer.readRenderTargetPixels(rt,0,0,W,H,px);
  }catch(e){ console.warn('minimapa', e); }
  renderer.setRenderTarget(oldRT); renderer.clippingPlanes=oldClip; renderer.setClearColor(oldCol,oldAlpha);
  setLights(currentMapKey==='dust2' && gameMode==='dust2' ? ATMOS.night : ATMOS.day);
  scene.background=oldBg; scene.fog=oldFog; hid.forEach(o=>{ o.visible=true; }); chars.forEach(o=>{ o.visible=true; }); rt.dispose();
  if(!px) return null;
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d'); const id=g.createImageData(W,H);
  const gain=1.55;
  for(let y=0;y<H;y++){
    const src=(H-1-y)*W*4, dst=y*W*4;
    for(let x=0;x<W*4;x+=4){
      const a=px[src+x+3];
      if(a<8){ id.data[dst+x+3]=0; continue; }
      id.data[dst+x]=Math.min(255,px[src+x]*gain); id.data[dst+x+1]=Math.min(255,px[src+x+1]*gain); id.data[dst+x+2]=Math.min(255,px[src+x+2]*gain); id.data[dst+x+3]=235;
    }
  }
  g.putImageData(id,0,0);
  return cv;
}
function drawMinimap(){
  const cv=document.getElementById('minimap'), wrap=document.getElementById('minimapWrap');
  if(!cv || !wrap || typeof camera==='undefined' || !camera) return;
  let minX=wallLimit.xmin, maxX=wallLimit.xmax, minZ=wallLimit.zmin, maxZ=wallLimit.zmax;
  try{
    const b=(typeof dust2Group!=='undefined'&&dust2Group&&dust2Group.userData.bounds)?dust2Group.userData.bounds:null;
    if(b){ minX=b.min.x; maxX=b.max.x; minZ=b.min.z; maxZ=b.max.z; }
  }catch(e){}
  if(!(isFinite(minX)&&isFinite(maxX)&&isFinite(minZ)&&isFinite(maxZ))||maxX<=minX||maxZ<=minZ) return;
  // el recuadro toma la proporción del mapa (Italy es alto, Office ancho) y siempre cabe entero
  const mw=maxX-minX, mh=maxZ-minZ, k=Math.min(165/mw, 215/mh);
  const cssW=Math.round(mw*k), cssH=Math.round(mh*k), D=2;
  if(cv.width!==cssW*D || cv.height!==cssH*D){ cv.width=cssW*D; cv.height=cssH*D; wrap.style.width=cssW+'px'; wrap.style.height=cssH+'px'; }
  const ctx=cv.getContext('2d'), W=cv.width, H=cv.height, s=W/mw;
  const mapX=(x)=>(x-minX)*s, mapY=(z)=>(z-minZ)*s;
  const ck=currentMapKey+'|'+currentMapFile;
  if(!(ck in mmCache)){ try{ mmCache[ck]=buildMinimapImage(currentMapKey); }catch(e){ mmCache[ck]=null; } }
  ctx.save(); ctx.clearRect(0,0,W,H);
  ctx.fillStyle='rgba(8,13,22,0.82)'; ctx.fillRect(0,0,W,H);
  const img=mmCache[ck];
  if(img) ctx.drawImage(img,0,0,W,H);
  else { ctx.fillStyle='rgba(70,90,110,0.55)'; ctx.fillRect(0,0,W,H); }
  // spawns T / CT (zonas oficiales)
  try{
    const zz=MAPS[currentMapKey].zones;
    if(zz){
      const lab=(z,t,c)=>{ ctx.fillStyle=c; ctx.strokeStyle='#000'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(mapX(z.x),mapY(z.z),8*D/1.4,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; ctx.font='bold '+(9*D)+'px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(t,mapX(z.x),mapY(z.z)+1); };
      lab(zz.t,'T','#e07a1f'); lab(zz.ct,'CT','#2f7fe0');
      if(!defuse.active){ ctx.font='bold '+(13*D)+'px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; for(const k of ['A','B']){ ctx.lineWidth=4; ctx.strokeStyle='#000'; ctx.strokeText(k,mapX(zz[k].x),mapY(zz[k].z)); ctx.fillStyle='rgba(255,196,60,0.98)'; ctx.fillText(k,mapX(zz[k].x),mapY(zz[k].z)); } }
    }
  }catch(e){}
  // sitios, bots visibles y bomba (modo Defuse)
  try{ if(defuse.active) defuse.drawRadar(ctx, mapX, mapY, s); }catch(e){}
  // jugador: flecha de dirección
  try{
    const dir=new THREE.Vector3(); camera.getWorldDirection(dir);
    const ang=Math.atan2(dir.x,-dir.z), mx=mapX(camera.position.x), my=mapY(camera.position.z);
    ctx.fillStyle=(playerTeam==='t')?'#ffb066':'#7af'; ctx.strokeStyle='#000'; ctx.lineWidth=3;
    ctx.save(); ctx.translate(mx,my); ctx.rotate(ang); ctx.scale(D/1.3,D/1.3);
    ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(7,7); ctx.lineTo(0,3.5); ctx.lineTo(-7,7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }catch(e){}
  ctx.restore();
}
// evitar menú contextual con click derecho (apuntar)
document.addEventListener('contextmenu', e=> e.preventDefault());

// click to shoot / cuchillo / apuntar
window.addEventListener('mousedown', (e)=>{
  if(!gameActive) return;
  if(buyMenuOpen) return;
  if(e.button===0){
    if(!controls.isLocked){
      if(!resultOverlay.classList.contains('show')) controls.lock();
      return;
    }
    if(!resultOverlay.classList.contains('show') && !pauseOverlay.classList.contains('show')){
      isHoldingShoot = true;
      if(currentWeapon==='knife') knifeAttack(); else shoot();
    }
  }
  if(e.button===2 && controls.isLocked){
    if(currentWeapon==='knife') knifeAttack();
    else if(currentWeapon==='awp') setAiming(!isAiming);
    else if(currentWeapon==='ak' || currentWeapon==='m4') setAiming(true);
    // deagle no apunta
  }
});
window.addEventListener('mouseup', (e)=>{
  if(e.button===0) isHoldingShoot = false;
  if(e.button===2 && (currentWeapon==='ak' || currentWeapon==='m4')) setAiming(false);
  // AWP es pulsar/soltar (toggle), no se quita al soltar
});
window.addEventListener('wheel', (e)=>{
  if(!gameActive || !controls.isLocked || buyMenuOpen) return;
  if(gameMode==='dust2'){
    const order=nextOwnedWeapon();
    if(order.length<2) return;
    const idx=order.indexOf(currentWeapon);
    if(e.deltaY < 0) switchWeapon(order[(idx-1+order.length)%order.length]);
    else switchWeapon(order[(idx+1)%order.length]);
    return;
  }
  const order=['ak','m4','knife','awp','deagle'];
  const idx=order.indexOf(currentWeapon);
  if(e.deltaY < 0) switchWeapon(order[(idx-1+order.length)%order.length]);
  else switchWeapon(order[(idx+1)%order.length]);
});
// si se pierde el foco, dejar de apuntar/disparar
window.addEventListener('blur', ()=> { setAiming(false); isHoldingShoot=false; });


// init three early so menu shows instantly
initThree();
gameActive=false;
timeLeft=30;
updateHUD();

/* === Wiring FAFI16 shell -> motor V2 === */
function fafiSwitchTab(id, el){
  if(id==='equip'){ menu2.openInventory(); return; }
  if(id==='tienda'){ menu2.openStore(); return; }
  document.querySelectorAll('.fafi16-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.fafi16-tab-btn').forEach(b=>b.classList.remove('active'));
  const map={jugar:'fafi16-tab-jugar', equip:'fafi16-tab-equip', tienda:'fafi16-tab-tienda', perfil:'fafi16-tab-perfil', ajustes:'fafi16-tab-ajustes'};
  const pid=map[id]||('fafi16-tab-'+id);
  const panel=document.getElementById(pid); if(panel) panel.classList.add('active');
  if(el) el.classList.add('active');
  else { const btn=document.querySelector('.fafi16-tab-btn[data-tab="'+id+'"]'); if(btn) btn.classList.add('active'); }
  if(id==='equip') fafiRenderEquipTab();
  if(id==='perfil') fafiUpdateProfileUI();
}
async function fafiDoLogin(){
  const u=(document.getElementById('login-user').value||'').trim();
  if(u.length<3){ alert('Usuario inválido (mín 3).'); return; }
  const p=document.getElementById('login-pass').value||'';
  const online=!!(window.authService && !window.authService.isDevMode());
  if(online){
    try{
      const user=await window.authService.login(u,p);
      if(!user) throw new Error('Credenciales incorrectas');
      fafiFinalizeAuth(user.user||user, false);
      return;
    }catch(e){
      try{ if(window.authService&&window.authService.logout) window.authService.logout(); }catch(_){}
      const msg=(e&&e.message)?e.message:'No se pudo conectar con el servidor.';
      if(/conectar|Unexpected|JSON|fetch/i.test(msg)){
        if(confirm(msg+'\n\n¿Jugar sin conexión?')) fafiPlayOffline(u);
      } else alert(msg);
      return;
    }
  }
  window.currentUserId=u; fafiFinalizeAuth({username:u}, true);
}
// Entra al juego sin servidor: progreso (coins, skins, sensibilidad) se guarda en localStorage.
function fafiPlayOffline(name){
  const typed=(name||document.getElementById('login-user').value||'').trim();
  const u = typed.length>=3 ? typed : 'Jugador';
  if(window.authService) window.authService.enableOfflineSession(u);
  window.currentUserId=u;
  fafiFinalizeAuth({username:u}, true);
}
async function fafiDoRegister(){
  const u=(document.getElementById('reg-user').value||'').trim();
  const email=(document.getElementById('reg-email').value||'').trim();
  const p=document.getElementById('reg-pass').value||'';
  if(u.length<3){ alert('Mínimo 3 caracteres.'); return; }
  if(!email.includes('@')){ alert('Email inválido.'); return; }
  const online=!!(window.authService && !window.authService.isDevMode());
  if(online){
    try{
      const user=await window.authService.register(u,email,p);
      if(!user) throw new Error('No se pudo crear la cuenta');
      fafiFinalizeAuth(user.user||user, false);
      return;
    }catch(e){
      alert((e&&e.message)?e.message:'No se pudo crear la cuenta en el servidor.');
      try{ if(window.authService&&window.authService.logout) window.authService.logout(); }catch(_){}
      return;
    }
  }
  alert('Cuenta local creada.');
  window.currentUserId=u; fafiFinalizeAuth({username:u}, true);
}
async function fafiPlayChapter(id){
  try{
    const m=await import('./historia.js');
    document.getElementById('campaign-map-overlay').style.display='none';
    m.playChapter(id, { onEnd:(done)=>{
      if(done){
        if(window.campaignLevel<2) window.campaignLevel=2;
        fafiUnlock('campaign_hero'); fafiSaveGameData(); fafiDbCompleteCampaign(id);
      }
      fafiOpenCampaign();
    }});
  }catch(e){ console.warn('historia',e); fafiOpenCampaign(); }
}
async function fafiOpenCampaign(){
  document.getElementById('menus').style.display='none';
  const ov=document.getElementById('campaign-map-overlay'); ov.style.display='flex';
  try{
    const [mh, sm]=await Promise.all([import('./historia.js'), import('./storymap.js')]);
    const chapters=await mh.getChapters();
    sm.renderStoryMap(ov, chapters, window.campaignLevel, fafiPlayChapter);
    }catch(e){ console.warn('mapa historia',e); }
}
try{
  document.querySelectorAll('.fafi16-tab-btn').forEach(b=>b.addEventListener('click',()=>fafiSwitchTab(b.getAttribute('data-tab'), b)));
  document.getElementById('loginBtn')?.addEventListener('click', fafiDoLogin);
  document.getElementById('regBtn')?.addEventListener('click', fafiDoRegister);
  document.getElementById('offlineBtn')?.addEventListener('click', ()=>fafiPlayOffline());
  document.getElementById('showRegLink')?.addEventListener('click',()=>{ document.getElementById('login-box').style.display='none'; document.getElementById('register-box').style.display='block'; });
  document.getElementById('showLoginLink')?.addEventListener('click',()=>{ document.getElementById('register-box').style.display='none'; document.getElementById('login-box').style.display='block'; });
  document.getElementById('login-pass')?.addEventListener('keydown',(e)=>{ if(e.key==='Enter') fafiDoLogin(); });
  document.getElementById('reg-pass')?.addEventListener('keydown',(e)=>{ if(e.key==='Enter') fafiDoRegister(); });
  document.getElementById('fafiPlayAim')?.addEventListener('click',()=>{ window.campaignActiveLevel=0; window.fafiAimSpeedMult=1; startGame('aim'); });
  document.getElementById('fafiPlayDust2')?.addEventListener('click',()=>{ window.campaignActiveLevel=0; window.fafiAimSpeedMult=1; window.fafiDefuse=false; startDust2Mode(); });
  document.getElementById('fafiPlayDefuse')?.addEventListener('click',()=>{ window.campaignActiveLevel=0; window.fafiAimSpeedMult=1; window.fafiDefuse=true; startDust2Mode(); });
  document.getElementById('dfBadgeCT').innerHTML=TEAM_BADGE.ct; document.getElementById('dfBadgeT').innerHTML=TEAM_BADGE.t;
  document.getElementById('teamT').insertAdjacentHTML('afterbegin', TEAM_BADGE.t); document.getElementById('teamCT').insertAdjacentHTML('afterbegin', TEAM_BADGE.ct);
  window.addEventListener('keydown',(e)=>{
    if(e.code!=='Tab') return;
    if(defuse.active){ e.preventDefault(); if(!e.repeat){ defuse.renderScoreboard(); document.getElementById('dfScoreboard').classList.add('show'); } return; }
    if(gameActive && gameMode==='dust2'){            // exploración: resumen de la partida
      e.preventDefault(); const el=document.getElementById('dfScoreboard'); if(!el) return;
      const g=Object.keys(grenadeStock).filter(k=>grenadeStock[k]>0).map(k=>GRENADES[k].label+(grenadeStock[k]>1?' ×'+grenadeStock[k]:'')).join(', ')||'—';
      const ar=getArmor();
      el.innerHTML='<div class="sbHead"><b>'+(MAPS[currentMapKey]?MAPS[currentMapKey].name:'')+'</b><span>EXPLORACIÓN LIBRE</span><span>Bando: <b>'+(playerTeam==='t'?'Terrorista':'Antiterrorista')+'</b></span></div>'
        +'<div class="team"><h3 style="color:#fff">TU EQUIPO</h3><table><tr><th>Arma</th><td>'+(WEAPON_LABEL[currentWeapon]||currentWeapon)+'</td></tr><tr><th>Armadura</th><td>'+(ar.a>0?(ar.h?'Chaleco + casco':'Chaleco'):'—')+'</td></tr><tr><th>Granadas</th><td>'+g+'</td></tr><tr><th>Dinero</th><td>$ ∞</td></tr><tr><th>Disparos</th><td>'+shots+'</td></tr></table></div>';
      if(!e.repeat) el.classList.add('show');
    }
  });
  window.addEventListener('keyup',(e)=>{ if(e.code==='Tab'){ document.getElementById('dfScoreboard')?.classList.remove('show'); } });
  document.getElementById('fafiOpenCampaign')?.addEventListener('click', fafiOpenCampaign);
  document.getElementById('closeCampBtn')?.addEventListener('click',()=>{ document.getElementById('campaign-map-overlay').style.display='none'; if(window.currentUserId) document.getElementById('menus').style.display='flex'; });
  document.querySelectorAll('.btn-buy[data-box]').forEach(b=>b.addEventListener('click',()=>fafiBuyBox(b.getAttribute('data-box'))));
  document.getElementById('closeStoreBtn')?.addEventListener('click',()=>{ document.getElementById('store-ui').style.display='none'; if(!gameActive) document.getElementById('menus').style.display='flex'; });
  document.getElementById('closeInvBtn')?.addEventListener('click',()=>{ document.getElementById('inventory-ui').style.display='none'; if(!gameActive) document.getElementById('menus').style.display='flex'; });
  document.getElementById('openFullInvBtn')?.addEventListener('click',()=>{ window.openInventory(); });
  document.getElementById('skinPopupOk')?.addEventListener('click',()=>{ document.getElementById('skin-popup').style.display='none'; });
  document.getElementById('addFriendBtn')?.addEventListener('click',()=>{
    const v=(document.getElementById('new-friend-id').value||'').trim();
    if(v && !window.friendsList.includes(v)){ window.friendsList.push(v); document.getElementById('new-friend-id').value=''; fafiSaveGameData(); fafiUpdateProfileUI(); }
  });
  document.getElementById('sens-slider')?.addEventListener('input',(e)=>{ window.fafiSensVal=parseInt(e.target.value)||5; document.getElementById('sens-val').textContent=window.fafiSensVal; fafiApplySensitivity(); fafiSaveGameData(); fafiDbSaveConfig(); });
  document.querySelectorAll('.q-btn').forEach(b=>b.addEventListener('click',()=>{ setQualityLevel(b.dataset.q); fafiSaveGameData(); }));
  document.getElementById('logoutBtn')?.addEventListener('click',()=>{ if(fafiDbOnline()) fafiDbSaveConfig(); fafiSaveGameData(); window.currentUserId=null; if(window.authService) try{ window.authService.logout(); window.authService.disableDevMode(); }catch(e){} document.getElementById('menus').style.display='none'; document.getElementById('login-overlay').style.display='flex'; try{ menu.style.display='none'; }catch(e){} });
  document.getElementById('againBtn')?.addEventListener('click',()=>{ setTimeout(()=>{ try{ fafiHideShell(); }catch(e){} },50); });
  // exponer para compatibilidad con HTML legacy del segundo juego
  window.switchFafi16Tab=fafiSwitchTab; window.handleLogin=fafiDoLogin; window.handleRegister=fafiDoRegister;
  window.showRegister=()=>{ document.getElementById('login-box').style.display='none'; document.getElementById('register-box').style.display='block'; };
  window.showLogin=()=>{ document.getElementById('register-box').style.display='none'; document.getElementById('login-box').style.display='block'; };
  window.openStore=()=>menu2.openStore();
  window.closeStore=()=>{ document.getElementById('store-ui').style.display='none'; if(!gameActive) document.getElementById('menus').style.display='flex'; };
  window.openInventory=()=>menu2.openInventory();
  window.closeInventory=()=>{ document.getElementById('inventory-ui').style.display='none'; if(!gameActive) document.getElementById('menus').style.display='flex'; };
  window.buyBox=fafiBuyBox; window.equipSkin=fafiEquipSkin; window.previewSkin=fafiPreviewSkin;
  window.addFriend=()=>document.getElementById('addFriendBtn')?.click();
  window.updateSensDisplay=(v)=>{ window.fafiSensVal=parseInt(v)||5; fafiApplySensitivity(); fafiSaveGameData(); };
  window.openCampaignMap=fafiOpenCampaign; window.closeCampaignMap=()=>document.getElementById('closeCampBtn')?.click();
}catch(e){ console.warn('fafi wiring', e); }
// arranque: forzar login primero (tapa el viejo #menu con z-index 9999)
try{ menu.style.display='none'; }catch(e){}
try{ fafiApplySensitivity(); }catch(e){}
try{ setInterval(()=>{ try{ fafiApplyEquippedSkins(); }catch(e){} }, 4000); }catch(e){}









