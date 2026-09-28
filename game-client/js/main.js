import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateAmmoHUD, updateWeaponVisibility, switchWeapon, updateWeaponAnim, updateViewRecoil, updateBullets, shoot, knifeAttack, spawnParticles } from './player.js';
import { handleMovement, updateFPS, drawMinimap, updateDebugPanel } from './controls.js';


/* === FAFI 1.6 MAIN port: todo el menú + configurables sobre motor V2 (sin colisiones con V2) === */
window.fafiCoins = 2000;
window.userInventory = [];
window.equippedSkins = { ak:null, awp:null, deagle:null, knife:null };
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
const fafiSkinsDB = [
  { id:'ak_oro', weapon:'ak', name:'AK-47 Oro Macizo', rarity:'legendaria', colors:{ metal:0xffd700, wood:0x111111 } },
  { id:'ak_hielo', weapon:'ak', name:'AK-47 Glaciar', rarity:'epica', colors:{ metal:0x00aaff, wood:0x003366 } },
  { id:'ak_tactical', weapon:'ak', name:'AK-47 Táctica', rarity:'comun', colors:{ metal:0x333333, wood:0x222222 } },
  { id:'awp_void', weapon:'awp', name:'AWP Vacío', rarity:'legendaria', colors:{ dark:0x1a0033, metal:0x8a2be2 } },
  { id:'awp_camo', weapon:'awp', name:'AWP Camuflaje', rarity:'comun', colors:{ dark:0x2e3b2c, metal:0x1f2e1e } },
  { id:'awp_magma', weapon:'awp', name:'AWP Magma', rarity:'epica', colors:{ dark:0x330000, metal:0xff3300 } },
  { id:'d_crimson', weapon:'deagle', name:'Deagle Carmesí', rarity:'epica', colors:{ metal:0xcc0000, dark:0x220000 } },
  { id:'d_neon', weapon:'deagle', name:'Deagle Neón', rarity:'legendaria', colors:{ metal:0x111111, accent:0x00ffcc } },
  { id:'d_desert', weapon:'deagle', name:'Deagle Desierto', rarity:'comun', colors:{ metal:0xc2b280, dark:0x5c4033 } },
  { id:'k_karambit', weapon:'knife', name:'Cuchillo Zafiro', rarity:'legendaria', colors:{ metal:0x0f52ba, dark:0x000000 } },
  { id:'k_blood', weapon:'knife', name:'Cuchillo Sangre', rarity:'epica', colors:{ metal:0xff0000, dark:0x111111 } },
  { id:'k_tactical', weapon:'knife', name:'Cuchillo Táctico', rarity:'comun', colors:{ metal:0x888888, dark:0x222222 } }
];
function fafiSkinById(id){ return fafiSkinsDB.find(s=>s.id===id); }
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
  window.equippedSkins = { ak:null, awp:null, deagle:null, knife:null };
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
      if(!isNaN(lvl)) window.campaignLevel = Math.max(1, Math.min(5, lvl));
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
  window.fafiCoins=2000; window.userInventory=[]; window.equippedSkins={ak:null,awp:null,deagle:null,knife:null};
  window.purchaseHistory=[]; window.friendsList=[]; window.campaignLevel=1; window.fafiAimSpeedMult=1; window.fafiSensVal=5;
  for(const a of window.achievements){ a.unlocked=false; }
}
function fafiUpdateCoinsDisplay(){
  const a=document.getElementById('coins-display-menu'); if(a) a.textContent='FAFI COINS: '+window.fafiCoins;
  const b=document.getElementById('coins-display-store'); if(b) b.textContent='FAFI COINS: '+window.fafiCoins;
  const c=document.getElementById('fafi-current-loadout');
  if(c){
    const parts=['ak','awp','deagle','knife'].map(w=>{
      const id=window.equippedSkins[w]; const s=id?fafiSkinById(id):null;
      return '<div class="fafi-list-item"><span>'+w.toUpperCase()+'</span><span>'+(s?s.name:'default')+'</span></div>';
    }).join('');
    c.innerHTML=parts+'<div class="fafi-list-item"><span>COINS</span><span>'+window.fafiCoins+'</span></div>';
  }
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
function fafiApplyQuality(){
  try{
    if(typeof renderer==='undefined' || !renderer) return;
    if(window.fafiQualityHigh){ renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled=true; }
    else { renderer.setPixelRatio(1); renderer.shadowMap.enabled=false; }
    const b=document.getElementById('qualityBtn'); if(b) b.textContent='CALIDAD: '+(window.fafiQualityHigh?'ALTA':'BAJA');
  }catch(e){}
}
function fafiApplyEquippedSkins(){
  try{
    const paint=(model, skinId)=>{
      if(!model) return;
      const s=skinId?fafiSkinById(skinId):null;
      if(!s||!s.colors) return;
      const col = s.colors.metal ?? s.colors.accent ?? s.colors.wood ?? s.colors.dark;
      if(col===undefined) return;
      model.traverse(o=>{
        if(o.isMesh && o.material && o.material.color){
          if(!o.userData._origCol) o.userData._origCol=o.material.color.getHex();
          o.material.color.setHex(col);
        }
      });
    };
    const resetIfNone=(model, skinId)=>{ if(!model||skinId) return; model.traverse(o=>{ if(o.isMesh&&o.userData._origCol!==undefined&&o.material&&o.material.color) o.material.color.setHex(o.userData._origCol); }); };
    if(typeof akModel!=='undefined'){ if(window.equippedSkins.ak) paint(akModel, window.equippedSkins.ak); else resetIfNone(akModel, null); }
    if(typeof awpModel!=='undefined'){ if(window.equippedSkins.awp) paint(awpModel, window.equippedSkins.awp); else resetIfNone(awpModel, null); }
    if(typeof deagleModel!=='undefined'){ if(window.equippedSkins.deagle) paint(deagleModel, window.equippedSkins.deagle); else resetIfNone(deagleModel, null); }
    if(typeof knifeModel!=='undefined'){ if(window.equippedSkins.knife) paint(knifeModel, window.equippedSkins.knife); else resetIfNone(knifeModel, null); }
  }catch(e){}
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
  const order=[['ak','AK-47'],['awp','AWP'],['deagle','Desert Eagle'],['knife','Cuchillo']];
  g.innerHTML=order.map(([w,label])=>{
    const owned=fafiSkinsDB.filter(s=>s.weapon===w);
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
function fafiBuildPreviewMesh(weaponId, skinId){
  const g=new THREE.Group();
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
    fafiPrevModel=fafiBuildPreviewMesh(weaponId, skinId);
    const box=new THREE.Box3().setFromObject(fafiPrevModel); const ctr=box.getCenter(new THREE.Vector3()); fafiPrevModel.position.sub(ctr);
    fafiPrevScene.add(fafiPrevModel);
    const sk=fafiSkinById(skinId); const el=document.getElementById('preview-name');
    if(el&&sk){ el.textContent=sk.name; el.className='rarity-'+sk.rarity; el.style.position='absolute'; el.style.bottom='14px'; el.style.width='100%'; }
  }catch(e){}
}
function fafiBuyBox(type){
  alert('🕒 Tienda deshabilitada — PRÓXIMAMENTE.');
  return;
  const cost = type==='basic'?200:(type==='advanced'?500:1000);
  if(window.fafiCoins<cost){ alert('¡No tienes suficientes FafiCoins! Juega AIM para ganar.'); return; }
  window.fafiCoins-=cost; window.purchaseHistory.push({box:type,cost});
  fafiUnlock('rich_boy'); fafiUpdateCoinsDisplay(); fafiSaveGameData(); fafiUpdateProfileUI();
  let roll=Math.random()*100, target='comun';
  if(type==='basic') target = roll<15?'epica':'comun';
  else if(type==='advanced') target = roll<20?'legendaria':(roll<70?'epica':'comun');
  else target = roll<50?'legendaria':'epica';
  let poss=fafiSkinsDB.filter(s=>s.rarity===target); if(!poss.length) poss=fafiSkinsDB;
  const won=poss[Math.floor(Math.random()*poss.length)];
  const rc=document.getElementById('roulette-container'), track=document.getElementById('roulette-track');
  if(!rc||!track){ fafiGiveSkin(won, target); return; }
  rc.style.display='block'; track.style.transition='none'; track.style.transform='translateX(0)'; track.innerHTML='';
  const N=45, winI=38;
  for(let i=0;i<N;i++){ const sk=(i===winI)?won:fafiSkinsDB[Math.floor(Math.random()*fafiSkinsDB.length)]; const el=document.createElement('div'); el.className='roulette-item rarity-'+sk.rarity; el.innerHTML='<div>'+sk.name+'</div><span>'+sk.weapon.toUpperCase()+'</span>'; track.appendChild(el); }
  void track.offsetWidth;
  const iw=160, cw=rc.clientWidth||800, off=(Math.random()-0.5)*100;
  const tx=-(winI*iw)+(cw/2)-(iw/2)+off;
  track.style.transition='transform 4.2s cubic-bezier(0.1,0.9,0.2,1)'; track.style.transform='translateX('+tx+'px)';
  setTimeout(()=>{ rc.style.display='none'; fafiGiveSkin(won, target); }, 4500);
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
let aimOffset = {x:-0.335, y:0.05, z:0.16}; // BAJADO: antes 0.13 dejaba la mira muy alta. Ahora 0.05 baja el arma para alinear alza con retícula
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
// cargar spawns marcados en sesiones anteriores
try{
  const st = JSON.parse(localStorage.getItem('fafi_spawn_t')||'null');
  const sc = JSON.parse(localStorage.getItem('fafi_spawn_ct')||'null');
  const okSp = (v)=> v && isFinite(v.x) && isFinite(v.z) && Math.abs(v.x)<200 && Math.abs(v.z)<200;
  if(okSp(st)) tSpawnOverride={x:st.x, z:st.z};
  if(okSp(sc)) ctSpawnOverride={x:sc.x, z:sc.z};
}catch(e){}
// Spawns PREDETERMINADOS (marcados en partida con < y Z, horneados al código)
const DEFAULT_T_SPAWN = { x: -4.063, z: 23.117 };
const DEFAULT_CT_SPAWN = { x: 7.444, z: -14.528 };
// física Dust2
let playerVelY=0, playerGrounded=false;
let dust2Colliders=[];
let dust2GroundY=null;
let playerRadius=basePlayerRadius;
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
const WEAPON_PRICES={ deagle:700, ak:2500, awp:4750 };
let owned={ knife:true, deagle:false, ak:false, awp:false };
let buyMenuOpen=false;

// THREE setup
function initThree(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1424);
  scene.fog = new THREE.Fog(0x0d1424, 18, 55);

  camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 100);
  camera.position.set(0,1.6,4);

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
  scene.add(new THREE.HemisphereLight(0xcde6ff, 0x0a0a0f, 1.2));
  const dir = new THREE.DirectionalLight(0xffffff, 1.4);
  dir.position.set(5,10,5);
  dir.castShadow=true;
  dir.shadow.mapSize.set(2048,2048);
  scene.add(dir);
  const fill = new THREE.PointLight(0x3aa0ff, 40, 20);
  fill.position.set(0,4,-8);
  scene.add(fill);

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

  // load AK
  const loader = new GLTFLoader();
  loader.load('assets/models/weapons/primarias/wep_ak47.glb', (gltf)=>{
    akModel = gltf.scene;
    akModel.traverse(o=>{ if(o.isMesh){ o.castShadow=true; }});
    // normalize scale y centrar modelo
    const box = new THREE.Box3().setFromObject(akModel);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const maxDim = Math.max(size.x,size.y,size.z);
    const targetSize = 1.4;
    const s = targetSize / maxDim;
    akModel.scale.setScalar(s);
    // recentrar pivote para que rote bien (compensa centro escalado)
    akModel.position.sub(center.clone().multiplyScalar(s));
    // posición FPS - cañón hacia adelante (-Z)
    akModel.position.add(new THREE.Vector3(0.35,-0.28,-0.65));
    // CORREGIDO: antes estaba en Math.PI (180°) y apuntaba al jugador. Ahora 0 para que el cañón apunte al frente
    akModel.rotation.set(0, 0, 0);
    console.log('AK-47 corregido: rotación Y=0 (cañón al frente), escala',s.toFixed(3),'centro',center);
    // guardar posiciones base / mira - CALIBRADO para que la mira coincida con la retícula (centro exacto)
    weaponBasePos = akModel.position.clone();
    weaponBaseRot = akModel.rotation.clone();
    // aimOffset calibrado: lleva el alza del AK justo al centro de la pantalla
    weaponAimPos = weaponBasePos.clone().add(new THREE.Vector3(aimOffset.x, aimOffset.y, aimOffset.z));
    weaponAimRot = new THREE.Euler(0, 0, 0);
    // ajuste auto: si el modelo es muy alto/bajo, corrige Y usando estimación del centro superior
    // el alza suele estar a ~0.35*size.y sobre el centro
    const estSightY = size.y * 0.32 * s; // altura estimada del alza
    // compensar para llevar alza a altura de ojo (-0.16 aprox)
    const tweakY = (-0.165 - (weaponBasePos.y + estSightY)) + weaponBasePos.y + aimOffset.y + estSightY;
    // no sobre-corregir, solo log
    console.log('AK mira calibrada, estSightY',estSightY.toFixed(3),'aimPos',weaponAimPos);
    updateAmmoHUD();
    // attach to camera
    camera.add(akModel);
    scene.add(camera);
    // optional animation mixer
    if(gltf.animations && gltf.animations.length) {
      mixer = new THREE.AnimationMixer(akModel);
    }
    console.log('AK-47 cargado', gltf);
  }, undefined, (e)=>{
    console.warn('No se pudo cargar assets/models/weapons/primarias/wep_ak47.glb, usando arma provisional', e);
    // fallback box gun
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.09,0.55), new THREE.MeshStandardMaterial({color:0x2a2a2a}));
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.45,10), new THREE.MeshStandardMaterial({color:0x111111}));
    barrel.rotation.x=Math.PI/2; barrel.position.set(0,0.02,-0.45);
    g.add(body); g.add(barrel);
    g.position.set(0.35,-0.28,-0.65);
    akModel = g;
    weaponBasePos = akModel.position.clone();
    weaponBaseRot = akModel.rotation.clone();
    weaponAimPos = weaponBasePos.clone().add(new THREE.Vector3(aimOffset.x, aimOffset.y, aimOffset.z));
    weaponAimRot = new THREE.Euler(0,0,0);
    updateAmmoHUD();
    camera.add(akModel);
    scene.add(camera);
  });

  // load Cuchillo
  const knifeLoader = new GLTFLoader();
  knifeLoader.load('assets/models/weapons/melee/wep_cuchillo.glb', (gltf)=>{
    knifeModel = gltf.scene;
    knifeModel.traverse(o=>{ if(o.isMesh){ o.castShadow=true; }});
    const boxK = new THREE.Box3().setFromObject(knifeModel);
    const sizeK = new THREE.Vector3(); boxK.getSize(sizeK);
    const centerK = new THREE.Vector3(); boxK.getCenter(centerK);
    const maxDimK = Math.max(sizeK.x,sizeK.y,sizeK.z);
    const targetSizeK = 0.48;
    const sK = targetSizeK / maxDimK;
    knifeModel.scale.setScalar(sK);
    knifeModel.position.sub(centerK.clone().multiplyScalar(sK));
    // un poco más a la izquierda
    knifeModel.position.add(new THREE.Vector3(0.16, -0.28, -0.52));
    knifeModel.rotation.set(0, Math.PI, 0);
    knifeBasePos = knifeModel.position.clone();
    knifeBaseRot = knifeModel.rotation.clone();
    knifeModel.visible = (currentWeapon==='knife');
    camera.add(knifeModel);
    scene.add(camera);
    console.log('Cuchillo cargado', gltf, 'escala',sK.toFixed(3));
    updateWeaponVisibility();
  }, undefined, (e)=>{
    console.warn('No se pudo cargar assets/models/weapons/melee/wep_cuchillo.glb, usando cuchillo provisional', e);
    const gk = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.032,0.012,0.22), new THREE.MeshStandardMaterial({color:0xcdd6e6, metalness:0.7, roughness:0.2}));
    blade.position.set(0,0,-0.14);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.11,8), new THREE.MeshStandardMaterial({color:0x2a1a0a}));
    handle.rotation.x=Math.PI/2; handle.position.set(0,0,0.015);
    gk.add(blade); gk.add(handle);
    gk.position.set(0.16, -0.28, -0.52);
    gk.rotation.set(0, 0, 0);
    knifeModel = gk;
    knifeBasePos = knifeModel.position.clone();
    knifeBaseRot = knifeModel.rotation.clone();
    knifeModel.visible = (currentWeapon==='knife');
    camera.add(knifeModel);
    scene.add(camera);
    updateWeaponVisibility();
  });

  // load AWP L115A3 - rehecho como AK47 para verse en FOV
  const awpLoader = new GLTFLoader();
  awpLoader.load('assets/models/weapons/primarias/wep_awp.glb', (gltf)=>{
    awpModel = gltf.scene;
    awpModel.traverse(o=>{ if(o.isMesh){ o.castShadow=true; }});
    const boxA = new THREE.Box3().setFromObject(awpModel);
    const sizeA = new THREE.Vector3(); boxA.getSize(sizeA);
    const centerA = new THREE.Vector3(); boxA.getCenter(centerA);
    const maxDimA = Math.max(sizeA.x,sizeA.y,sizeA.z);
    const targetSizeA = 1.55;
    const sA = targetSizeA / maxDimA;
    awpModel.scale.setScalar(sA);
    awpModel.position.sub(centerA.clone().multiplyScalar(sA));
    // misma altura/posición que AK47
    awpModel.position.add(new THREE.Vector3(0.34, -0.27, -0.62));
    awpModel.rotation.set(0, 0, 0);
    awpBasePos = awpModel.position.clone();
    awpBaseRot = awpModel.rotation.clone();
    awpAimPos = awpBasePos.clone().add(new THREE.Vector3(-0.31, 0.11, 0.18));
    awpAimRot = new THREE.Euler(0, 0, 0);
    awpModel.visible = (currentWeapon==='awp');
    camera.add(awpModel);
    scene.add(camera);
    console.log('AWP L115A3 x100', gltf, 'escala',sA.toFixed(3));
    updateWeaponVisibility();
  }, undefined, (e)=>{
    console.warn('No se pudo cargar assets/models/weapons/primarias/wep_awp.glb, usando AWP provisional', e);
    const gA = new THREE.Group();
    const bodyA = new THREE.Mesh(new THREE.BoxGeometry(0.09,0.08,0.72), new THREE.MeshStandardMaterial({color:0x2a3a2a}));
    const barrelA = new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.62,10), new THREE.MeshStandardMaterial({color:0x111111}));
    barrelA.rotation.x=Math.PI/2; barrelA.position.set(0,0.02,-0.55);
    const scopeA = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.42,12), new THREE.MeshStandardMaterial({color:0x0a0a0a}));
    scopeA.rotation.x=Math.PI/2; scopeA.position.set(0,0.09,0);
    gA.add(bodyA); gA.add(barrelA); gA.add(scopeA);
    gA.position.set(0.34, -0.27, -0.62);
    awpModel = gA;
    awpBasePos = awpModel.position.clone();
    awpBaseRot = awpModel.rotation.clone();
    awpAimPos = awpBasePos.clone().add(new THREE.Vector3(-0.40, 0.68, 0.62));
    awpAimRot = new THREE.Euler(0,0,0);
    awpModel.visible = (currentWeapon==='awp');
    camera.add(awpModel);
    scene.add(camera);
    updateWeaponVisibility();
  });

  // load Deagle CS:GO
  const deagleLoader = new GLTFLoader();
  deagleLoader.load('assets/models/weapons/secundarias/wep_deagle.glb', (gltf)=>{
    deagleModel = gltf.scene;
    deagleModel.traverse(o=>{ if(o.isMesh){ o.castShadow=true; }});
    const boxD = new THREE.Box3().setFromObject(deagleModel);
    const sizeD = new THREE.Vector3(); boxD.getSize(sizeD);
    const centerD = new THREE.Vector3(); boxD.getCenter(centerD);
    const maxDimD = Math.max(sizeD.x,sizeD.y,sizeD.z);
    const targetSizeD = 0.92;
    const sD = targetSizeD / maxDimD;
    deagleModel.scale.setScalar(sD);
    deagleModel.position.sub(centerD.clone().multiplyScalar(sD));
    deagleModel.position.add(new THREE.Vector3(0.28, -0.26, -0.48));
    deagleModel.rotation.set(0, 0, 0);
    deagleBasePos = deagleModel.position.clone();
    deagleBaseRot = deagleModel.rotation.clone();
    deagleAimPos = deagleBasePos.clone().add(new THREE.Vector3(-0.22, 0.06, 0.10));
    deagleAimRot = new THREE.Euler(0, 0, 0);
    deagleModel.visible=(currentWeapon==='deagle');
    camera.add(deagleModel);
    scene.add(camera);
    console.log('Deagle cargada', gltf, 'escala',sD.toFixed(3));
    updateWeaponVisibility();
  }, undefined, (e)=>{
    console.warn('No se pudo cargar assets/models/weapons/secundarias/wep_deagle.glb, usando Deagle provisional', e);
    const gD=new THREE.Group();
    const bodyD=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.05,0.18), new THREE.MeshStandardMaterial({color:0x2a2a2a}));
    const barrelD=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.11,8), new THREE.MeshStandardMaterial({color:0x111111}));
    barrelD.rotation.x=Math.PI/2; barrelD.position.set(0,0.015,-0.11);
    const gripD=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.08,0.04), new THREE.MeshStandardMaterial({color:0x1a1a1a}));
    gripD.position.set(0,-0.05,0.04);
    gD.add(bodyD); gD.add(barrelD); gD.add(gripD);
    gD.position.set(0.28, -0.26, -0.48);
    deagleModel=gD;
    deagleBasePos=deagleModel.position.clone();
    deagleBaseRot=deagleModel.rotation.clone();
    deagleAimPos=deagleBasePos.clone().add(new THREE.Vector3(-0.22, 0.06, 0.10));
    deagleAimRot=new THREE.Euler(0,0,0);
    deagleModel.visible=(currentWeapon==='deagle');
    camera.add(deagleModel);
    scene.add(camera);
    updateWeaponVisibility();
  });

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
  // guardar/cargar configuración de armas (para establecer como predeterminada)
  window.saveWeaponConfig = function(){
    try{
      const data={};
      if(weaponBasePos) data.ak={pos:weaponBasePos.clone(), rot:weaponBaseRot.clone(), scale: akModel?akModel.scale.x:1, aimOff:{...aimOffset}};
      if(awpBasePos) data.awp={pos:awpBasePos.clone(), rot:awpBaseRot.clone(), scale: awpModel?awpModel.scale.x:1};
      if(knifeBasePos) data.knife={pos:knifeBasePos.clone(), rot:knifeBaseRot.clone(), scale: knifeModel?knifeModel.scale.x:1};
      if(deagleBasePos) data.deagle={pos:deagleBasePos.clone(), rot:deagleBaseRot.clone(), scale: deagleModel?deagleModel.scale.x:1};
      localStorage.setItem('fafi_v2_weapons', JSON.stringify(data));
      console.log('Config guardada', data);
      showFloating('¡Config guardada como predeterminada!');
    }catch(e){ console.warn(e); }
  };
  window.loadWeaponConfig = function(){
    try{
      const raw=localStorage.getItem('fafi_v2_weapons');
      if(!raw) return;
      const data=JSON.parse(raw);
      if(data.ak && weaponBasePos && akModel){
        weaponBasePos.copy(data.ak.pos); weaponBaseRot.copy(data.ak.rot); akModel.position.copy(weaponBasePos); akModel.rotation.copy(weaponBaseRot); akModel.scale.setScalar(data.ak.scale);
        if(data.ak.aimOff) Object.assign(aimOffset, data.ak.aimOff);
        weaponAimPos.copy(weaponBasePos).add(new THREE.Vector3(aimOffset.x, aimOffset.y, aimOffset.z));
      }
      if(data.awp && awpBasePos && awpModel){
        awpBasePos.copy(data.awp.pos); awpBaseRot.copy(data.awp.rot); awpModel.position.copy(awpBasePos); awpModel.rotation.copy(awpBaseRot); awpModel.scale.setScalar(data.awp.scale);
        awpAimPos.copy(awpBasePos).add(new THREE.Vector3(-0.40, 0.68, 0.62));
      }
      if(data.knife && knifeBasePos && knifeModel){
        knifeBasePos.copy(data.knife.pos); knifeBaseRot.copy(data.knife.rot); knifeModel.position.copy(knifeBasePos); knifeModel.rotation.copy(knifeBaseRot); knifeModel.scale.setScalar(data.knife.scale);
      }
      if(data.deagle && deagleBasePos && deagleModel){
        deagleBasePos.copy(data.deagle.pos); deagleBaseRot.copy(data.deagle.rot); deagleModel.position.copy(deagleBasePos); deagleModel.rotation.copy(deagleBaseRot); deagleModel.scale.setScalar(data.deagle.scale);
        deagleAimPos.copy(deagleBasePos).add(new THREE.Vector3(-0.22, 0.06, 0.10));
      }
      updateWeaponVisibility(); console.log('Config cargada', data);
    }catch(e){ console.warn(e); }
  };
  setTimeout(()=>{ try{ window.loadWeaponConfig(); }catch(e){} }, 600);
  // establecer AWP actual como predeterminada si ya lo ajustaste - guarda automáticamente lo que ves ahora



  window.addEventListener('resize', ()=>{
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  });

  animate();
}

// --- DUST2 LOADER - modo distinto con modelo glb ---
function loadDust2Map(onDone){
  if(dust2Loaded || dust2Loading){
    if(dust2Loaded && onDone) onDone();
    return;
  }
  dust2Loading = true;
  const loadingEl = document.getElementById('dust2Loading');
  if(loadingEl) loadingEl.style.display='block';
  const loader2 = new GLTFLoader();
  loader2.load('assets/models/maps/map_prueba.glb', (gltf)=>{
    const model = gltf.scene;
    // Normalizar escala a ~42 unidades (tamaño CS original) y centrar
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 64;
    const s = targetSize / maxDim;
    model.scale.setScalar(s);
    // recentrar: compensar centro escalado y bajar a suelo (y=0)
    model.position.sub(center.clone().multiplyScalar(s));
    // Ajuste fino Dust2 CS: el origen del glb suele quedar enterrado, levantamos 0.02
    model.position.y += 0.02;
    model.traverse(o=>{
      if(o.isMesh){
        o.castShadow = true;
        o.receiveShadow = true;
        if(o.material){
          // fix: materiales de una sola cara + transparentes del glb causaban paredes invisibles/transparentes al mirar desde dentro
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for(const m of mats){
            m.side = THREE.DoubleSide;
            m.transparent = false;
            m.opacity = 1;
            m.depthWrite = true;
            m.needsUpdate = true;
          }
        }
      }
    });
    dust2Group.add(model);
    // recalcular bounds reales del mapa escalado para limitar al jugador DENTRO del mapa
    // (antes wallLimit ±45 dejaba salir fuera del mapa y ver el cielo/traseras negras)
    {
      const b2 = new THREE.Box3().setFromObject(model);
      const sz = new THREE.Vector3(); b2.getSize(sz);
      console.log('Dust2 bounds post-scale', b2.min, b2.max, 'size', sz);
      // insets: 1.0m de muros exteriores para nunca tocar la cara exterior ni ver el cielo a través del canto
      wallLimit.xmin = b2.min.x + 1.0;
      wallLimit.xmax = b2.max.x - 1.0;
      wallLimit.zmin = b2.min.z + 1.0;
      wallLimit.zmax = b2.max.z - 1.0;
      // guardar para respawn/spawn
      dust2Group.userData.bounds = b2.clone();
    }
    // Boxes semitransparentes para Site A y B (referencia, no colisión - excluidos de colisiones)
    const siteMatA=new THREE.MeshStandardMaterial({color:0x1e3a5a, transparent:true, opacity:0.12, side:THREE.DoubleSide});
    const siteMatB=new THREE.MeshStandardMaterial({color:0x5a2a1a, transparent:true, opacity:0.12, side:THREE.DoubleSide});
    const siteA = new THREE.Mesh(new THREE.BoxGeometry(8,0.08,8), siteMatA);
    siteA.position.set(-10, 0.04, 7);
    siteA.receiveShadow=true;
    siteA.userData.noCollide = true;
    dust2Group.add(siteA);
    const siteB = new THREE.Mesh(new THREE.BoxGeometry(7,0.08,7), siteMatB);
    siteB.position.set(12, 0.04, -6);
    siteB.receiveShadow=true;
    siteB.userData.noCollide = true;
    dust2Group.add(siteB);
    console.log('Dust2 cargado:', 'escala', s.toFixed(4), 'size', size, 'center', center, 'model pos', model.position, 'wallLimit', wallLimit);
    // cachear colisionables para física y balas (excluir boxes Site)
    dust2Colliders = [];
    dust2Group.traverse(o=>{ if(o.isMesh && !o.userData.noCollide) dust2Colliders.push(o); });
    console.log('Dust2 colliders:', dust2Colliders.length);
    refreshSpawnRings();
    // si ya estás jugando, recortar posición dentro del nuevo bounds
    if(gameActive && gameMode==='dust2' && camera){
      camera.position.x = Math.max(wallLimit.xmin, Math.min(wallLimit.xmax, camera.position.x));
      camera.position.z = Math.max(wallLimit.zmin, Math.min(wallLimit.zmax, camera.position.z));
      controls.getObject().position.copy(camera.position);
    }
    dust2Loaded = true;
    dust2Loading = false;
    if(loadingEl) loadingEl.style.display='none';
    if(onDone) onDone();
  }, (xhr)=>{
    if(loadingEl && xhr.lengthComputable){
      const pct = Math.round(xhr.loaded / xhr.total * 100);
      loadingEl.textContent = 'Cargando Dust2... ' + pct + '%';
    }
  }, (e)=>{
    console.warn('No se pudo cargar assets/models/maps/map_prueba.glb', e);
    dust2Loading = false;
    if(loadingEl) loadingEl.textContent = 'Error cargando Dust2 - usando mapa fallback';
    setTimeout(()=>{ if(loadingEl) loadingEl.style.display='none'; }, 1500);
    // Fallback simple: plano grande si falla
    const fallback = new THREE.Mesh(new THREE.PlaneGeometry(50,50), new THREE.MeshStandardMaterial({color:0x2a2a2a, roughness:0.9}));
    fallback.rotation.x = -Math.PI/2;
    fallback.receiveShadow = true;
    dust2Group.add(fallback);
    // colliders fallback
    dust2Colliders = [fallback];
    dust2Loaded = true;
    if(onDone) onDone();
  });
}

function setMapVisibility(mode){
  // Dust2 limpio estilo CS: HUD AIM oculto + minimapa visible (CSS .mode-dust2)
  try{ document.getElementById('game')?.classList.toggle('mode-dust2', mode==='dust2'); }catch(e){}
  if(!aimMapGroup || !dust2Group) return;
  if(mode==='dust2'){
    aimMapGroup.visible = false;
    dust2Group.visible = true;
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 30, 80);
  } else {
    aimMapGroup.visible = true;
    dust2Group.visible = false;
    scene.background = new THREE.Color(0x0d1424);
    scene.fog = new THREE.Fog(0x0d1424, 18, 55);
  }
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
  if(m) m.textContent='$'+money;
  const bm=document.getElementById('buyMoneyEl');
  if(bm) bm.textContent='$'+money;
  const box=document.getElementById('moneyBox');
  if(box) box.style.display = (gameMode==='dust2' && gameActive) ? 'block' : 'none';
}
function nextOwnedWeapon(){
  // Para Q/rueda: cicla solo entre las que posees en Dust2
  const order=['ak','knife','awp','deagle'];
  if(gameMode!=='dust2') return order;
  return order.filter(w=>owned[w]);
}
function updateBuyMenu(){
  updateMoneyHUD();
  const inv=document.getElementById('buyInvEl');
  if(inv){
    const prim = owned.awp ? 'AWP' : owned.ak ? 'AK-47' : '— (sin primaria)';
    const sec = owned.deagle ? 'Desert Eagle' : '— (sin pistola)';
    inv.innerHTML = '<span class="inv-slot">🔪 <b>Cuchillo</b> ✓</span>'
      + '<span class="inv-slot">🔫 <b>Secundaria:</b> '+sec+'</span>'
      + '<span class="inv-slot">🎯 <b>Primaria:</b> '+prim+' <span style="color:#8aa0b8">(AK o AWP)</span></span>'
      + '<span class="inv-slot">💰 <b>$'+money+'</b></span>';
  }
  const defs=[['ak','buyCard-ak','buyBtn-ak'],['awp','buyCard-awp','buyBtn-awp'],['deagle','buyCard-deagle','buyBtn-deagle']];
  for(const [w,cardId,btnId] of defs){
    const card=document.getElementById(cardId), btn=document.getElementById(btnId);
    if(!card||!btn) continue;
    const price=WEAPON_PRICES[w];
    card.classList.toggle('owned', !!owned[w]);
    card.classList.toggle('cant', !owned[w] && money<price);
    if(owned[w]){
      const isEquipped=(currentWeapon===w);
      btn.textContent = isEquipped ? 'EQUIPADA ✓' : 'EQUIPAR';
      btn.disabled=false;
      btn.classList.toggle('equipped', isEquipped);
      btn.onclick=()=>{ switchWeapon(w); updateBuyMenu(); };
    } else {
      btn.classList.remove('equipped');
      if(money>=price){ btn.textContent='COMPRAR — $'+price; btn.disabled=false; btn.onclick=()=>tryBuy(w); }
      else { btn.textContent='SIN DINERO ($'+price+')'; btn.disabled=true; btn.onclick=null; }
    }
  }
}
function tryBuy(w){
  if(gameMode!=='dust2'||!gameActive) return;
  if(owned[w]){ switchWeapon(w); updateBuyMenu(); return; }
  const price=WEAPON_PRICES[w];
  if(money<price){ showFloating('Sin dinero suficiente ($'+price+')'); return; }
  money-=price;
  // Primaria excluyente: AK o AWP, no las dos (como pedir rifle o awp)
  if(w==='ak' && owned.awp){ owned.awp=false; showFloating('AWP reemplazada por AK-47'); }
  if(w==='awp' && owned.ak){ owned.ak=false; showFloating('AK-47 reemplazada por AWP'); }
  owned[w]=true;
  // munición completa al comprar
  if(w==='ak'){ akStoredAmmo=30; akStoredReserve=90; }
  if(w==='awp'){ awpAmmo=10; awpReserve=30; }
  if(w==='deagle'){ deagleAmmo=7; deagleReserve=35; }
  switchWeapon(w);
  // si switchWeapon fue bloqueado por recarga, forzar equip
  if(currentWeapon!==w && !isReloading && !isBoltCycling){
    currentWeapon=w;
    if(w==='ak'){ maxMag=30; ammoInMag=akStoredAmmo; reserveAmmo=akStoredReserve; }
    if(w==='awp'){ maxMag=awpMaxMag; ammoInMag=awpAmmo; reserveAmmo=awpReserve; }
    if(w==='deagle'){ maxMag=deagleMaxMag; ammoInMag=deagleAmmo; reserveAmmo=deagleReserve; }
    updateWeaponVisibility();
  }
  showFloating((w==='ak'?'AK-47 comprada -$'+price : w==='awp'?'AWP comprada -$'+price : 'Desert Eagle -$'+price));
  updateBuyMenu(); updateHUD();
}
function setBuyMenu(open){
  if(gameMode!=='dust2'||!gameActive) open=false;
  buyMenuOpen=open;
  const el=document.getElementById('buyMenu');
  if(el) el.classList.toggle('show', open);
  if(open){
    updateBuyMenu();
    try{ controls.unlock(); }catch(e){}
    // Evitar que el unlock dispare la pausa mientras compras
    pauseOverlay.classList.remove('show');
  } else {
    if(gameActive && !resultOverlay.classList.contains('show')){ try{ controls.lock(); }catch(e){} }
  }
}
function toggleBuyMenu(){ setBuyMenu(!buyMenuOpen); }





function onTargetHit(target, point){
  hits++; score += 100;
  // bonus for center? distance to center
  const dist = target.position.distanceTo(camera.position);
  // extra if quickly
  // hit marker
  hitMarker.classList.add('show');
  setTimeout(()=>hitMarker.classList.remove('show'), 120);
  playSound(440,0.08,0.12,'sine',0.22);
  setTimeout(()=>playSound(660,0.06,0.08,'sine',0.16),70);

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

function playSound(freq, attack, dur, type='sine', vol=0.2){ return; /* sonidos desactivados por pedido */ }


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
function findSpawnGround(x, z){
  if(!dust2Colliders.length) return null;
  const cands = [[x,z],[x+2,z],[x-2,z],[x,z+2],[x,z-2]];
  for(const c of cands){
    const origin = new THREE.Vector3(c[0], 9, c[1]);
    const ray = new THREE.Raycaster(origin, new THREE.Vector3(0,-1,0), 0, 16);
    const hits = ray.intersectObjects(dust2Colliders, false);
    let best = null;
    for(const h of hits){
      if(!h.face) continue;
      const n = h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize();
      if(n.y > 0.5){ if(best===null || h.point.y < best) best = h.point.y; }
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
  const g = (typeof findSpawnGround==='function') ? findSpawnGround(ov.x, ov.z) : null;
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
    if(team==='t'){ tSpawnOverride=p; localStorage.setItem('fafi_spawn_t', JSON.stringify(p)); }
    else { ctSpawnOverride=p; localStorage.setItem('fafi_spawn_ct', JSON.stringify(p)); }
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
  const isDust2 = (mode==='dust2');
  score=0; hits=0; shots=0; timeLeft= isDust2 ? Infinity : 30;
  ammoInMag=30; reserveAmmo=90; isReloading=false; reloadProgress=0; isAiming=false; aimProgress=0; recoilKick=0;
  // === Reset economía/inventario ===
  if(isDust2){
    money=3000;
    owned={ knife:true, deagle:false, ak:false, awp:false };
    akStoredAmmo=30; akStoredReserve=90; awpAmmo=10; awpReserve=30; deagleAmmo=7; deagleReserve=35;
    currentWeapon='knife';
    buyMenuOpen=false;
    document.getElementById('buyMenu')?.classList.remove('show');
  } else {
    // En AIM practice todo desbloqueado como antes
    owned={ knife:true, deagle:true, ak:true, awp:true };
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
    const g = findSpawnGround(sp.pos.x, sp.pos.z);
    const sx = g ? g.x : sp.pos.x, sz = g ? g.z : sp.pos.z;
    const eyeY = (g ? g.y : 2.5) + eyeStandHeight + 0.25;
    camera.position.set(sx, eyeY, sz);
    controls.getObject().position.copy(camera.position);
    camera.lookAt(sp.foe.x, eyeY - 0.1, sp.foe.z);
    const teamName = playerTeam==='t' ? 'TERRORISTAS' : 'ANTITERRORISTAS';
    document.getElementById('weapon-info').querySelector('b').textContent = teamName;
    // arrancas solo con cuchillo + $3000, como en CS:GO
    maxMag=30; ammoInMag=akStoredAmmo; reserveAmmo=akStoredReserve;
    updateWeaponVisibility();
    updateMoneyHUD();
    showFloating('¡' + teamName + '! Pulsa B para comprar ($3000)');
  } else {
    camera.position.set(0,1.6,4);
    controls.getObject().position.copy(camera.position);
    camera.lookAt(0, 1.6, -12);
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
  if(dust2Loaded){
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
      if(dust2Loaded){ clearInterval(mirror); if(shellBtn){ shellBtn.disabled=false; shellBtn.textContent=shellBtn.dataset.orig||'🗺️ DUST II — EXPLORACIÓN POR BANDOS'; } }
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
document.getElementById('teamT').addEventListener('click', ()=>{ hideTeamSelect(); startGame('dust2','t'); });
document.getElementById('teamCT').addEventListener('click', ()=>{ hideTeamSelect(); startGame('dust2','ct'); });
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




let lastTime=performance.now();
// === FPS chiquito arriba-derecha + MINIMAPA circular Dust2 (sup-izq) ===
function animate(){
  rafId=requestAnimationFrame(animate);
  const now=performance.now();
  const dt = Math.min((now-lastTime)/1000, 0.05); lastTime=now;
  try{ updateFPS(now); }catch(e){}
  try{ if(gameMode==='dust2' && gameActive) drawMinimap(); }catch(e){}

  if(mixer) mixer.update(dt);
  updateWeaponAnim(dt);
  updateViewRecoil(dt);
  handleMovement(dt);
  updateBullets(dt);
  // cadencia automática si mantienes pulsado (AK) / repetición cuchillo
  if(isHoldingShoot && gameActive && controls.isLocked && !isReloading && !pauseOverlay.classList.contains('show') && !resultOverlay.classList.contains('show')){
    if(currentWeapon==='ak') shoot();
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

  if(renderer && scene && camera) renderer.render(scene,camera);
}


// init three early so menu shows instantly
initThree();
gameActive=false;
timeLeft=30;
updateHUD();

/* === Wiring FAFI16 shell -> motor V2 === */
function fafiSwitchTab(id, el){
  if(id==='equip' || id==='tienda'){
    try{ if(typeof showFloating==='function' && typeof gameActive!=='undefined' && gameActive) showFloating('🔒 PRÓXIMAMENTE'); }catch(e){}
    alert('🔒 '+(id==='equip'?'Inventario':'Tienda')+' deshabilitado — PRÓXIMAMENTE.');
    document.querySelectorAll('.fafi16-tab-btn').forEach(b=>b.classList.remove('active'));
    const jb=document.querySelector('.fafi16-tab-btn[data-tab="jugar"]'); if(jb) jb.classList.add('active');
    document.querySelectorAll('.fafi16-panel').forEach(p=>p.classList.remove('active'));
    const jp=document.getElementById('fafi16-tab-jugar'); if(jp) jp.classList.add('active');
    return;
  }
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
      fafiFinalizeAuth(user, false);
      return;
    }catch(e){
      alert((e&&e.message)?e.message:'No se pudo conectar con el servidor.');
      try{ if(window.authService&&window.authService.logout) window.authService.logout(); }catch(_){}
      return;
    }
  }
  window.currentUserId=u; fafiFinalizeAuth({username:u}, true);
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
      fafiFinalizeAuth(user, false);
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
function fafiOpenCampaign(){
  document.getElementById('menus').style.display='none';
  const ov=document.getElementById('campaign-map-overlay'); ov.style.display='flex';
  const cont=document.getElementById('map-nodes-container'); cont.innerHTML='';
  for(let i=1;i<=5;i++){
    const un=i<=window.campaignLevel;
    const n=document.createElement('div'); n.className='map-node '+(un?'unlocked':'locked'); n.textContent=i;
    if(un) n.addEventListener('click',()=>{
      window.campaignActiveLevel=i; window.fafiAimSpeedMult=1+(i-1)*0.35;
      ov.style.display='none'; startGame('aim'); showFloating('CAMPAÑA NIVEL '+i+' — 600+ pts para avanzar');
    });
    cont.appendChild(n);
    if(i<5){ const l=document.createElement('div'); l.className='map-line '+(i<window.campaignLevel?'unlocked':''); cont.appendChild(l); }
  }
}
try{
  document.querySelectorAll('.fafi16-tab-btn').forEach(b=>b.addEventListener('click',()=>fafiSwitchTab(b.getAttribute('data-tab'), b)));
  document.getElementById('loginBtn')?.addEventListener('click', fafiDoLogin);
  document.getElementById('regBtn')?.addEventListener('click', fafiDoRegister);
  document.getElementById('showRegLink')?.addEventListener('click',()=>{ document.getElementById('login-box').style.display='none'; document.getElementById('register-box').style.display='block'; });
  document.getElementById('showLoginLink')?.addEventListener('click',()=>{ document.getElementById('register-box').style.display='none'; document.getElementById('login-box').style.display='block'; });
  document.getElementById('login-pass')?.addEventListener('keydown',(e)=>{ if(e.key==='Enter') fafiDoLogin(); });
  document.getElementById('reg-pass')?.addEventListener('keydown',(e)=>{ if(e.key==='Enter') fafiDoRegister(); });
  document.getElementById('fafiPlayAim')?.addEventListener('click',()=>{ window.campaignActiveLevel=0; window.fafiAimSpeedMult=1; startGame('aim'); });
  document.getElementById('fafiPlayDust2')?.addEventListener('click',()=>{ window.campaignActiveLevel=0; window.fafiAimSpeedMult=1; startDust2Mode(); });
  document.getElementById('fafiOpenCampaign')?.addEventListener('click', fafiOpenCampaign);
  document.getElementById('closeCampBtn')?.addEventListener('click',()=>{ document.getElementById('campaign-map-overlay').style.display='none'; if(window.currentUserId) document.getElementById('menus').style.display='flex'; });
  document.querySelectorAll('.btn-buy[data-box]').forEach(b=>b.addEventListener('click',()=>fafiBuyBox(b.getAttribute('data-box'))));
  document.getElementById('closeStoreBtn')?.addEventListener('click',()=>{ document.getElementById('store-ui').style.display='none'; if(!gameActive) document.getElementById('menus').style.display='flex'; });
  document.getElementById('closeInvBtn')?.addEventListener('click',()=>{ document.getElementById('inventory-ui').style.display='none'; if(!gameActive) document.getElementById('menus').style.display='flex'; });
  document.getElementById('openFullInvBtn')?.addEventListener('click',()=>{ alert('🔒 Inventario deshabilitado — PRÓXIMAMENTE.'); });
  document.getElementById('skinPopupOk')?.addEventListener('click',()=>{ document.getElementById('skin-popup').style.display='none'; });
  document.getElementById('addFriendBtn')?.addEventListener('click',()=>{
    const v=(document.getElementById('new-friend-id').value||'').trim();
    if(v && !window.friendsList.includes(v)){ window.friendsList.push(v); document.getElementById('new-friend-id').value=''; fafiSaveGameData(); fafiUpdateProfileUI(); }
  });
  document.getElementById('sens-slider')?.addEventListener('input',(e)=>{ window.fafiSensVal=parseInt(e.target.value)||5; document.getElementById('sens-val').textContent=window.fafiSensVal; fafiApplySensitivity(); fafiSaveGameData(); fafiDbSaveConfig(); });
  document.getElementById('qualityBtn')?.addEventListener('click',()=>{ window.fafiQualityHigh=!window.fafiQualityHigh; fafiApplyQuality(); fafiSaveGameData(); });
  document.getElementById('logoutBtn')?.addEventListener('click',()=>{ if(fafiDbOnline()) fafiDbSaveConfig(); fafiSaveGameData(); window.currentUserId=null; if(window.authService) try{ window.authService.logout(); }catch(e){} document.getElementById('menus').style.display='none'; document.getElementById('login-overlay').style.display='flex'; try{ menu.style.display='none'; }catch(e){} });
  document.getElementById('againBtn')?.addEventListener('click',()=>{ setTimeout(()=>{ try{ fafiHideShell(); }catch(e){} },50); });
  // exponer para compatibilidad con HTML legacy del segundo juego
  window.switchFafi16Tab=fafiSwitchTab; window.handleLogin=fafiDoLogin; window.handleRegister=fafiDoRegister;
  window.showRegister=()=>{ document.getElementById('login-box').style.display='none'; document.getElementById('register-box').style.display='block'; };
  window.showLogin=()=>{ document.getElementById('register-box').style.display='none'; document.getElementById('login-box').style.display='block'; };
  window.openStore=()=>{ alert('🔒 Tienda deshabilitada — PRÓXIMAMENTE.'); };
  window.closeStore=()=>{ document.getElementById('store-ui').style.display='none'; if(!gameActive) document.getElementById('menus').style.display='flex'; };
  window.openInventory=()=>{ alert('🔒 Inventario deshabilitado — PRÓXIMAMENTE.'); };
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



export {
  scene, camera, renderer, controls, raycaster, akModel, mixer, audioCtx, targets, bullets,
  score, hits, shots, timeLeft, gameActive, rafId, clock, targetSpawnTimer,
  keys, isAiming, aimProgress, isReloading, reloadProgress, ammoInMag, maxMag, reserveAmmo,
  awpAmmo, awpMaxMag, awpReserve, akStoredAmmo, akStoredReserve,
  weaponBasePos, weaponAimPos, weaponBaseRot, weaponAimRot,
  recoilKick, baseFov, aimFov, awpAimFov, fireRate, lastShotTime,
  viewRecoilX, viewRecoilY, spreadAccum, isHoldingShoot, recoilPatternStep,
  baseMoveSpeed, baseCrouchSpeed, moveSpeed, crouchSpeed,
  walkTime, viewBobY, lastViewBobY, landShake, jumpBob, prevGrounded,
  jumpFatigueMult, consecutiveJumps, lastJumpTime, aimOffset, playerVelocity, wallLimit,
  isCrouching, crouchProgress, baseStandHeight, baseCrouchHeight, basePlayerRadius,
  standHeight, crouchHeight, eyeStandHeight, eyeCrouchHeight, freeCam, SPAWN_ZONE_RADIUS,
  tSpawnOverride, ctSpawnOverride, tSpawnRing, ctSpawnRing,
  DEFAULT_T_SPAWN, DEFAULT_CT_SPAWN,
  playerVelY, playerGrounded, dust2Colliders, dust2GroundY, playerRadius,
  playerGravity, playerJumpForce, playerScale, playerRadiusScale,
  playerDummy, dummyAK, dummyKnife, dummyAWP, dummyDeagle,
  spamHeat, consecutiveSpam, isInspecting, inspectProgress, inspectDuration,
  knifeModel, knifeBasePos, knifeBaseRot, currentWeapon,
  isKnifeSwinging, knifeSwingProgress, knifeSwingDir,
  awpModel, awpBasePos, awpBaseRot, awpAimPos, awpAimRot, isBoltCycling, boltProgress,
  deagleModel, deagleBasePos, deagleBaseRot, deagleAimPos, deagleAimRot,
  deagleAmmo, deagleMaxMag, deagleReserve,
  gameMode, playerTeam, teamReturn, aimMapGroup, dust2Group, dust2Loaded, dust2Loading,
  money, WEAPON_PRICES, owned, buyMenuOpen,
  menu, gameEl, playBtn, scoreEl, hitsEl, accEl, timeEl, hitMarker,
  resultOverlay, pauseOverlay, rScore, rHits, rAcc, rRank, teamOverlay,
  updateMoneyHUD, nextOwnedWeapon, setBuyMenu, toggleBuyMenu, updateBuyMenu,
  markSpawn, updateSpawnRing, refreshSpawnRings, getTeamSpawn, showTeamSelect, hideTeamSelect,
  goMenu, startGame, setMapVisibility, spawnTarget, clearTargets, clearBullets,
  updateHUD, showFloating, playSound
};
