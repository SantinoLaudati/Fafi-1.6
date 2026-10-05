import * as THREE from 'three';
import { camera, controls, keys, gameActive, gameMode, pauseOverlay, resultOverlay, wallLimit, playerRadius, isAiming, isReloading, isCrouching, crouchProgress, standHeight, crouchHeight, eyeStandHeight, eyeCrouchHeight, baseMoveSpeed, baseCrouchSpeed, moveSpeed, crouchSpeed, walkTime, viewBobY, lastViewBobY, landShake, jumpBob, prevGrounded, jumpFatigueMult, consecutiveJumps, lastJumpTime, playerVelY, playerGrounded, playerJumpForce, playerGravity, dust2GroundY, freeCam, dust2Colliders, playerScale, playerRadiusScale, currentWeapon, playerTeam, tSpawnOverride, ctSpawnOverride, DEFAULT_T_SPAWN, DEFAULT_CT_SPAWN, SPAWN_ZONE_RADIUS, isHoldingShoot, buyMenuOpen, akModel, awpModel, deagleModel, knifeModel, weaponBasePos, weaponBaseRot, weaponAimPos, weaponAimRot, awpBasePos, awpBaseRot, awpAimPos, awpAimRot, deagleBasePos, deagleBaseRot, deagleAimPos, deagleAimRot, knifeBasePos, knifeBaseRot, aimOffset, playerDummy, dummyAK, dummyKnife, dummyAWP, dummyDeagle, showFloating, updateHUD, markSpawn, setBuyMenu, toggleBuyMenu, nextOwnedWeapon, goMenu, baseFov } from './main.js';
import { getWeaponMoveMult, applyPlayerScale, updateWeaponVisibility, switchWeapon, setAiming, tryReload, tryInspect, shoot, knifeAttack } from './player.js';

// === MODO DEBUG F7: las teclas de ajuste solo funcionan con debugMode=true ===
let debugMode=false;
function setDebugMode(v){
  debugMode=!!v;
  const badge=document.getElementById('debugBadge');
  const txt=document.getElementById('debugEl');
  const panel=document.getElementById('debugPanel');
  const inst=document.getElementById('instructions');
  if(txt) txt.textContent=debugMode?'ON':'OFF';
  if(badge){ badge.classList.toggle('on',debugMode); badge.classList.toggle('off',!debugMode); }
  // En Dust2 el debug visual queda oculto por CSS (.mode-dust2), pero la lógica sigue activa
  if(panel) panel.classList.toggle('show',debugMode && gameMode!=='dust2');
  if(inst) inst.classList.toggle('showDbg',debugMode && gameMode!=='dust2');
  showFloating(debugMode?'MODO DEBUG ON (F7) — teclas de ajuste activas':'MODO DEBUG OFF (F7)');
  updateDebugPanel();
}
function toggleDebugMode(){ setDebugMode(!debugMode); }
function updateDebugPanel(){
  const panel=document.getElementById('debugPanel');
  if(!panel) return;
  if(!debugMode) return;
  // En Dust2 el debug visual está desactivado (pedido): no mostrar panel
  if(gameMode==='dust2'){ panel.classList.remove('show'); return; }
  let curModel=null, curBasePos=null, curBaseRot=null;
  if(currentWeapon==='ak'){ curModel=akModel; curBasePos=weaponBasePos; curBaseRot=weaponBaseRot; }
  else if(currentWeapon==='awp'){ curModel=awpModel; curBasePos=awpBasePos; curBaseRot=awpBaseRot; }
  else if(currentWeapon==='deagle'){ curModel=deagleModel; curBasePos=deagleBasePos; curBaseRot=deagleBaseRot; }
  else { curModel=knifeModel; curBasePos=knifeBasePos; curBaseRot=knifeBaseRot; }
  const wp = curBasePos ? curBasePos.x.toFixed(2)+','+curBasePos.y.toFixed(2)+','+curBasePos.z.toFixed(2) : '--';
  const wr = (curModel&&curModel.rotation) ? curModel.rotation.y.toFixed(2) : '--';
  const ws = (curModel&&curModel.scale) ? curModel.scale.x.toFixed(3) : '--';
  let eyeH='--';
  try{
    if(typeof camera!=='undefined'&&camera){
      let h=camera.position.y;
      if(gameMode==='dust2'&&typeof dust2GroundY!=='undefined'&&dust2GroundY!==null) h=camera.position.y-dust2GroundY;
      eyeH=h.toFixed(2)+'m';
    }
  }catch(e){}
  const tS = (typeof tSpawnOverride!=='undefined'&&tSpawnOverride)?tSpawnOverride.x.toFixed(1)+','+tSpawnOverride.z.toFixed(1):'def';
  const cS = (typeof ctSpawnOverride!=='undefined'&&ctSpawnOverride)?ctSpawnOverride.x.toFixed(1)+','+ctSpawnOverride.z.toFixed(1):'def';
  panel.innerHTML='<b>F7 DEBUG ON</b> — pulsa F7 para apagar\n'
    +'arma <b>'+currentWeapon+'</b> pos '+wp+' rotY '+wr+' scale '+ws+'\n'
    +'jugador H <b>'+(playerScale*100).toFixed(0)+'%</b> W '+(playerRadiusScale*100).toFixed(0)+'% R:'+playerRadius.toFixed(2)+' H:'+standHeight.toFixed(2)+' ojo:'+eyeH+'\n'
    +'spawnT:'+tS+' spawnCT:'+cS+' | '+(freeCam?'ESPECTADOR':'cuerpo')+'\n'
    +'7/8/9/0 mover • O/P escala • [/]/\' rot • Alt+↑↓ altura • , . K L V - cuerpo';
}
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
  // F7 = activar/desactivar TODAS las teclas de ajuste + ver valores en pantalla. Funciona siempre.
  if(e.code==='F7'){
    e.preventDefault();
    e.stopPropagation();
    toggleDebugMode();
    return;
  }
  // ajuste manual arma actual (SOLO con F7 ON): 7 izq, 8 der, 9 atrás, 0 adelante, O agrandar, P achicar, ' rotar - en espectador ajusta el dummy
  if(debugMode){
    const isFree = freeCam && playerDummy && playerDummy.visible;
    let curModel, curBasePos, curBaseRot, dummyModel;
    if(currentWeapon==='ak'){ curModel=akModel; curBasePos=weaponBasePos; curBaseRot=weaponBaseRot; dummyModel=dummyAK; }
    else if(currentWeapon==='awp'){ curModel=awpModel; curBasePos=awpBasePos; curBaseRot=awpBaseRot; dummyModel=dummyAWP; }
    else if(currentWeapon==='deagle'){ curModel=deagleModel; curBasePos=deagleBasePos; curBaseRot=deagleBaseRot; dummyModel=dummyDeagle; }
    else { curModel=knifeModel; curBasePos=knifeBasePos; curBaseRot=knifeBaseRot; dummyModel=dummyKnife; }
    const targetModel = isFree && dummyModel ? dummyModel : curModel;
    if(targetModel && curBasePos){
      const step=0.12;
      let moved=false;
      const applyPos = (dx,dy,dz)=>{
        targetModel.position.x+=dx; targetModel.position.y+=dy; targetModel.position.z+=dz;
        curBasePos.x+=dx; curBasePos.y+=dy; curBasePos.z+=dz;
        // si estás en espectador, también mover el modelo FPS para que al salir quede igual
        if(isFree && curModel && curModel!==targetModel){ curModel.position.x+=dx; curModel.position.y+=dy; curModel.position.z+=dz; }
        moved=true;
      };
      const applyScale = (s)=>{ targetModel.scale.multiplyScalar(s); if(isFree && curModel && curModel!==targetModel) curModel.scale.multiplyScalar(s); moved=true; };
      const applyRotY = (d)=>{ targetModel.rotation.y+=d; if(curBaseRot) curBaseRot.y+=d; if(isFree && curModel && curModel!==targetModel){ curModel.rotation.y+=d; } moved=true; };
      if(e.code==='Digit7' || e.code==='Numpad7' || e.key==='7' || e.keyCode===55){ applyPos(-step,0,0); }
      if(e.code==='Digit8' || e.code==='Numpad8' || e.key==='8' || e.keyCode===56){ applyPos(step,0,0); }
      if(e.code==='Digit9' || e.code==='Numpad9' || e.key==='9' || e.keyCode===57){ applyPos(0,0,step); }
      if(e.code==='Digit0' || e.code==='Numpad0' || e.key==='0' || e.keyCode===48){ applyPos(0,0,-step); }
      if(e.code==='KeyO' || e.key==='o' || e.key==='O' || e.keyCode===79){ applyScale(1.08); }
      if(e.code==='KeyP' || e.key==='p' || e.key==='P' || e.keyCode===80){ applyScale(0.92); }
      if(e.code==='BracketLeft'){ applyRotY(-0.14); }
      if(e.code==='BracketRight'){ applyRotY(0.14); }
      if(e.code==='Quote' || e.key==="'" || e.key==='"'){ const dir=e.shiftKey?-1:1; applyRotY(0.18*dir); }
      if(e.code==='ArrowUp' && e.altKey){ applyPos(0,step,0); }
      if(e.code==='ArrowDown' && e.altKey){ applyPos(0,-step,0); }
      if(moved){
        e.preventDefault();
        if(currentWeapon==='ak' && weaponBasePos && weaponAimPos) weaponAimPos.copy(weaponBasePos).add(new THREE.Vector3(aimOffset.x, aimOffset.y, aimOffset.z));
        if(currentWeapon==='awp' && awpBasePos && awpAimPos) awpAimPos.copy(awpBasePos).add(new THREE.Vector3(-0.40, 0.68, 0.62));
        if(currentWeapon==='deagle' && deagleBasePos && deagleAimPos) deagleAimPos.copy(deagleBasePos).add(new THREE.Vector3(-0.22, 0.06, 0.10));
        console.log(currentWeapon+(isFree?' (espectador)':''),'pos',targetModel.position.x.toFixed(2),targetModel.position.y.toFixed(2),targetModel.position.z.toFixed(2),'rotY',targetModel.rotation.y.toFixed(2),'scale',targetModel.scale.x.toFixed(3));
        showFloating(`${currentWeapon.toUpperCase()}${isFree?' ESPECTADOR':''} ${targetModel.position.x.toFixed(2)},${targetModel.position.y.toFixed(2)},${targetModel.position.z.toFixed(2)}`);
        updateDebugPanel();
      }
    }
  }
  // === ESCALA JUGADOR (SOLO con F7 ON): , agranda  . achica  k ensancha  l achica ancho  - guarda ===
  if(debugMode){
    let scaled=false;
    if(e.key===',' || ((e.code==='Comma' || e.keyCode===188) && e.key!=='<' && e.key!=='.' && e.key!=='>')){
      e.preventDefault();
      playerScale = Math.min(3.0, playerScale*1.04);
      applyPlayerScale();
      console.log('Jugador scale',playerScale.toFixed(3),'radius',playerRadius.toFixed(3),'height',standHeight.toFixed(3));
      showFloating(`JUGADOR ${(playerScale*100).toFixed(0)}% • R:${playerRadius.toFixed(2)} H:${standHeight.toFixed(2)}`);
      scaled=true;
    } else if(e.key==='.' || e.key===':' || e.key==='>' || e.code==='Period' || e.keyCode===190){
      e.preventDefault();
      playerScale = Math.max(0.05, playerScale*0.96);
      applyPlayerScale();
      console.log('Jugador scale',playerScale.toFixed(3));
      showFloating(`JUGADOR ${(playerScale*100).toFixed(0)}% • R:${playerRadius.toFixed(2)} H:${standHeight.toFixed(2)}`);
      scaled=true;
    } else if(e.key==='k' || e.key==='K' || e.code==='KeyK'){
      e.preventDefault();
      playerRadiusScale = Math.min(3.0, playerRadiusScale*1.04);
      applyPlayerScale();
      console.log('Jugador radiusScale',playerRadiusScale.toFixed(3),'radius',playerRadius.toFixed(3));
      showFloating(`ANCHO ${(playerRadiusScale*100).toFixed(0)}% • R:${playerRadius.toFixed(2)}`);
      scaled=true;
    } else if(e.key==='l' || e.key==='L' || e.code==='KeyL'){
      e.preventDefault();
      playerRadiusScale = Math.max(0.05, playerRadiusScale*0.96);
      applyPlayerScale();
      console.log('Jugador radiusScale',playerRadiusScale.toFixed(3),'radius',playerRadius.toFixed(3));
      showFloating(`ANCHO ${(playerRadiusScale*100).toFixed(0)}% • R:${playerRadius.toFixed(2)}`);
      scaled=true;
    } else if(e.key==='v' || e.key==='V' || e.code==='KeyV'){
      e.preventDefault();
      playerScale = 1; playerRadiusScale = 1;
      applyPlayerScale();
      showFloating('Tamaño reseteado 100% (pulsa - para guardar)');
      scaled=true;
    } else if(e.key==='-' || e.key==='_' || e.code==='Minus' || e.code==='NumpadSubtract' || e.keyCode===189 || e.keyCode===109){
      e.preventDefault();
      try{
        localStorage.setItem('fafi_playerScale', playerScale.toString());
        localStorage.setItem('fafi_playerRadiusScale', playerRadiusScale.toString());
        showFloating(`¡Jugador guardado H:${playerScale.toFixed(2)} W:${playerRadiusScale.toFixed(2)}!`);
        console.log('Jugador guardado scale',playerScale,'radiusScale',playerRadiusScale);
      }catch(err){ console.warn(err); showFloating('Error guardando'); }
      scaled=true;
    } else if(e.code==='Slash' && e.key==='-' ){
      e.preventDefault();
      try{ localStorage.setItem('fafi_playerScale', playerScale.toString()); localStorage.setItem('fafi_playerRadiusScale', playerRadiusScale.toString()); showFloating(`¡Jugador guardado!`); }catch(err){}
      scaled=true;
    }
    if(scaled){
      // actualizar HUD colisiones
      updateHUD();
    }
  }
  // === ESPECTADOR (| atraviesa todo) + MARCAR SPAWNS (< T, Z CT) — SOLO con F7 ON, solo DUST II ===
  if(debugMode){
    if(e.key==='|'){
      e.preventDefault();
      if(!gameActive || gameMode!=='dust2'){ showFloating('Espectador solo en DUST II'); }
      else toggleSpectator();
    } else if(e.key==='<'){
      e.preventDefault();
      if(!gameActive || gameMode!=='dust2'){ showFloating('Marca spawns solo en DUST II'); }
      else markSpawn('t');
    } else if(e.key==='z' || e.key==='Z' || e.code==='KeyZ'){
      // Z es spawn CT, pero si el buy menu está abierto no marcar
      if(buyMenuOpen){ /* dejar escribir nada, ignorar */ }
      else {
        e.preventDefault();
        if(!gameActive || gameMode!=='dust2'){ showFloating('Marca spawns solo en DUST II'); }
        else markSpawn('ct');
      }
    }
  }
  // === B = MENÚ COMPRA estilo CS:GO (solo Dust2) ===
  if(e.code==='KeyB'){
    if(gameMode==='dust2' && gameActive){
      e.preventDefault();
      e.stopPropagation();
      toggleBuyMenu();
      return;
    }
    // fuera de Dust2, B no hace nada (el reset ahora es V)
  }
  if(e.code==='Escape' && gameActive && !resultOverlay.classList.contains('show')){
    if(buyMenuOpen){ setBuyMenu(false); return; }
    if(controls.isLocked) controls.unlock();
    else goMenu();
    return;
  }
  if(!gameActive) return;
  if(buyMenuOpen) return;
  if(e.code==='KeyR'){
    e.preventDefault();
    tryReload();
  }

  // 1/2/3/4 y Q/Rueda para cambiar arma (en Dust2 solo si la posees)
  if(e.code==='Digit1' || e.code==='Numpad1'){ e.preventDefault(); switchWeapon('ak'); return; }
  if(e.code==='Digit2' || e.code==='Numpad2'){ e.preventDefault(); switchWeapon('knife'); return; }
  if(e.code==='Digit3' || e.code==='Numpad3'){ e.preventDefault(); switchWeapon('awp'); return; }
  if(e.code==='Digit4' || e.code==='Numpad4'){ e.preventDefault(); switchWeapon('deagle'); return; }
  if(e.code==='KeyQ' && !e.ctrlKey){
    e.preventDefault();
    if(gameMode==='dust2'){
      const order=nextOwnedWeapon();
      if(!order.length) return;
      let idx=order.indexOf(currentWeapon);
      switchWeapon(order[(idx+1)%order.length]);
    } else {
      const order=['ak','knife','awp','deagle']; const idx=order.indexOf(currentWeapon); switchWeapon(order[(idx+1)%order.length]);
    }
    return;
  }
  // F = inspeccionar arma estilo CS:GO
  if(e.code==='KeyF'){
    e.preventDefault();
    tryInspect();
  }
  // G = flip debug AK (SOLO con F7 ON)
  if(debugMode && e.code==='KeyG' && akModel){
    akModel.rotation.y += Math.PI;
    if(weaponBaseRot) weaponBaseRot.y += Math.PI;
    if(weaponAimRot) weaponAimRot.y += Math.PI;
    console.log('AK flip G, rot Y:', akModel.rotation.y.toFixed(2));
    updateDebugPanel();
  }

  if(debugMode && e.code==='KeyM'){ e.preventDefault(); window.saveWeaponConfig(); showFloating('Config guardada (M)'); updateDebugPanel(); return; }
  if(debugMode && e.code==='KeyN'){ e.preventDefault(); localStorage.removeItem('fafi_v2_weapons'); showFloating('Config reseteada (N)'); setTimeout(()=>location.reload(), 600); return; }
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
    if(h.point.y > feetY + 0.7) continue;
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
    const ray = new THREE.Raycaster(o, dir.clone().normalize(), 0, dist + playerRadius + 0.22);
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
    if(hit && hit.distance < dist + playerRadius + 0.20){
      const hitDist = Math.max(0, hit.distance - playerRadius - 0.20);
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
    const hTop = Math.max(curEye, curBody) * 0.7;
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
    if(forward!==0 || right!==0){
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
      wish.multiplyScalar(speed * dt);
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
          if(step > 0.68){
            // escalón demasiado alto, bloquear X/Z pero mantener Y
            // no mover
          } else {
            // aplicar X/Z, Y se ajustará por gravedad/snap en próximo frame
            camera.position.x = newPos.x;
            camera.position.z = newPos.z;
            // si escalón pequeño, subir un poco ya (con tope: nunca deriva por encima del suelo+ojo)
            if(step > 0.08 && step < 0.68 && playerGrounded){
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
      }
    }
    // resolver penetración residual - 8 direcciones + vista, evita ver a través de costado (foto 2)
    for(let k=0;k<3;k++){
      let pushed=false;
      const dirs = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, -3*Math.PI/4, -Math.PI/2, -Math.PI/4];
      for(const ang of dirs){
        const dir = new THREE.Vector3(Math.sin(ang),0,Math.cos(ang));
        const hit = dust2WallCollides(camera.position, dir, playerRadius+0.22, camera.position.y - curEye, hLow, hTop);
        if(hit && hit.distance < playerRadius+0.20){
          const push = (playerRadius+0.24) - hit.distance;
          camera.position.add(dir.clone().negate().multiplyScalar(push + 0.02));
          pushed=true;
        }
      }
      // también empujar si la pared está justo delante de tu vista (aunque no te muevas de costado)
      {
        const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y=0; if(fwd.lengthSq()>0.0001){ fwd.normalize();
          const hitF = dust2WallCollides(camera.position, fwd, 0.65, camera.position.y - curEye, hLow, hTop);
          if(hitF && hitF.distance < playerRadius+0.18){
            const pushF = (playerRadius+0.22) - hitF.distance;
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
function drawMinimap(){
  const cv=document.getElementById('minimap');
  if(!cv || typeof camera==='undefined' || !camera) return;
  const ctx=cv.getContext('2d');
  const W=cv.width, H=cv.height, cx=W/2, cy=H/2, R=W/2-4;
  // bounds del mapa
  let minX=wallLimit.xmin, maxX=wallLimit.xmax, minZ=wallLimit.zmin, maxZ=wallLimit.zmax;
  try{
    const b=(typeof dust2Group!=='undefined'&&dust2Group&&dust2Group.userData.bounds)?dust2Group.userData.bounds:null;
    if(b){ minX=b.min.x; maxX=b.max.x; minZ=b.min.z; maxZ=b.max.z; }
  }catch(e){}
  if(!(isFinite(minX)&&isFinite(maxX)&&isFinite(minZ)&&isFinite(maxZ))||maxX<=minX||maxZ<=minZ) return;
  const pad=2;
  const sx=(W-pad*2)/(maxX-minX), sz=(H-pad*2)/(maxZ-minZ);
  const s=Math.min(sx,sz);
  const offX=cx-(minX+maxX)/2*s, offY=cy-(minZ+maxZ)/2*s;
  const mapX=(x)=>offX+x*s, mapY=(z)=>offY+z*s;
  // fondo + clip circular
  ctx.save();
  ctx.clearRect(0,0,W,H);
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.clip();
  ctx.fillStyle='rgba(10,16,26,0.95)'; ctx.fillRect(0,0,W,H);
  // retícula
  ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=1;
  for(let gx=cx-120;gx<cx+120;gx+=24){ ctx.beginPath(); ctx.moveTo(gx,cy-R); ctx.lineTo(gx,cy+R); ctx.stroke(); }
  for(let gy=cy-120;gy<cy+120;gy+=24){ ctx.beginPath(); ctx.moveTo(cx-R,gy); ctx.lineTo(cx+R,gy); ctx.stroke(); }
  // área del mapa
  ctx.fillStyle='rgba(70,90,110,0.55)';
  ctx.fillRect(mapX(minX),mapY(minZ),(maxX-minX)*s,(maxZ-minZ)*s);
  ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=2;
  ctx.strokeRect(mapX(minX),mapY(minZ),(maxX-minX)*s,(maxZ-minZ)*s);
  // sites A/B (refs de loadDust2Map)
  try{
    ctx.font='bold 20px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='rgba(58,160,255,0.9)'; ctx.fillText('A',mapX(-10),mapY(7));
    ctx.fillStyle='rgba(255,140,42,0.9)'; ctx.fillText('B',mapX(12),mapY(-6));
  }catch(e){}
  // spawns T/CT
  try{
    if(typeof tSpawnOverride!=='undefined'||typeof DEFAULT_T_SPAWN!=='undefined'){
      const t=(typeof tSpawnOverride!=='undefined'&&tSpawnOverride)?tSpawnOverride:(typeof DEFAULT_T_SPAWN!=='undefined'?DEFAULT_T_SPAWN:null);
      const ct=(typeof ctSpawnOverride!=='undefined'&&ctSpawnOverride)?ctSpawnOverride:(typeof DEFAULT_CT_SPAWN!=='undefined'?DEFAULT_CT_SPAWN:null);
      if(t){ ctx.fillStyle='#ff8c2a'; ctx.beginPath(); ctx.arc(mapX(t.x),mapY(t.z),5,0,Math.PI*2); ctx.fill(); }
      if(ct){ ctx.fillStyle='#3aa0ff'; ctx.beginPath(); ctx.arc(mapX(ct.x),mapY(ct.z),5,0,Math.PI*2); ctx.fill(); }
    }
  }catch(e){}
  // jugador: punto + flecha de dirección
  try{
    const px=camera.position.x, pz=camera.position.z;
    const dir=new THREE.Vector3(); camera.getWorldDirection(dir);
    const ang=Math.atan2(dir.x,-dir.z);
    const mx=mapX(px), my=mapY(pz);
    ctx.fillStyle = (playerTeam==='t') ? '#ffb066' : '#7af';
    ctx.strokeStyle='#000'; ctx.lineWidth=2;
    ctx.save(); ctx.translate(mx,my); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(7,7); ctx.lineTo(0,3.5); ctx.lineTo(-7,7); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(mx,my,2.5,0,Math.PI*2); ctx.fill();
  }catch(e){}
  ctx.restore();
  // anillo
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=3; ctx.stroke();
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
    else if(currentWeapon==='ak') setAiming(true);
    // deagle no apunta
  }
});
window.addEventListener('mouseup', (e)=>{
  if(e.button===0) isHoldingShoot = false;
  if(e.button===2 && currentWeapon==='ak') setAiming(false);
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
  const order=['ak','knife','awp','deagle'];
  const idx=order.indexOf(currentWeapon);
  if(e.deltaY < 0) switchWeapon(order[(idx-1+order.length)%order.length]);
  else switchWeapon(order[(idx+1)%order.length]);
});
// si se pierde el foco, dejar de apuntar/disparar
window.addEventListener('blur', ()=> { setAiming(false); isHoldingShoot=false; });

export { handleMovement, updateFPS, drawMinimap, toggleSpectator, updateDebugPanel };
