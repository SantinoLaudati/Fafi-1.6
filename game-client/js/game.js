/*
 * FAFI 1.6 — cliente unificado (ARCHIVO GENERADO).
 * No edites game.js a mano: edita player.js, controls.js o main.js y ejecuta
 *   node scripts/build-game.js
 *
 * Motivo: los tres módulos comparten estado mutable. Al concatenarlos en un
 * solo módulo, las asignaciones dejan de apuntar a importaciones de solo
 * lectura y el motor puede actualizar munición, recoil, movimiento, etc.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

/* =========================================================================
 * player.js
 * ========================================================================= */
const WEAPON_MOVE_MULT = { knife:1.22, deagle:0.97, ak:0.84, awp:0.73 }; // cuchillo más rápido pero reducido un poco (pedido)
function getWeaponMoveMult(){ return WEAPON_MOVE_MULT[currentWeapon]||1; }
function applyPlayerScale(){
  playerRadius=basePlayerRadius*playerScale*playerRadiusScale;
  standHeight=baseStandHeight*playerScale;
  crouchHeight=baseCrouchHeight*playerScale;
  if(playerDummy) playerDummy.scale.setScalar(playerScale);
}
function updateAmmoHUD(){
  const el=document.getElementById('ammoEl');
  const mode=document.getElementById('weaponMode');
  const icon=document.querySelector('#weapon-info .icon');
  if(icon) icon.textContent = currentWeapon==='knife' ? '🔪' : currentWeapon==='awp' ? '🎯' : currentWeapon==='deagle' ? '🔫' : '🔫';
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
  if(freeCam){
    if(akModel) akModel.visible=false;
    if(knifeModel) knifeModel.visible=false;
    if(awpModel) awpModel.visible=false;
    if(deagleModel) deagleModel.visible=false;
    if(dummyAK) dummyAK.visible=(currentWeapon==='ak');
    if(dummyKnife) dummyKnife.visible=(currentWeapon==='knife');
    if(dummyAWP) dummyAWP.visible=(currentWeapon==='awp');
    if(dummyDeagle) dummyDeagle.visible=(currentWeapon==='deagle');
  } else {
    if(akModel) akModel.visible = (currentWeapon==='ak');
    if(knifeModel) knifeModel.visible = (currentWeapon==='knife');
    if(awpModel) awpModel.visible = (currentWeapon==='awp');
    if(deagleModel) deagleModel.visible = (currentWeapon==='deagle');
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
  if(to!=='ak' && to!=='knife' && to!=='awp' && to!=='deagle') return;
  if(currentWeapon===to) return;
  if(isReloading || isBoltCycling) return;
  // En Dust2 solo puedes sacar lo que tienes en el inventario (CS:GO)
  if(gameMode==='dust2' && !owned[to]){
    showFloating(to==='ak' ? 'No tienes AK-47 • Pulsa B para comprar' : to==='awp' ? 'No tienes AWP • Pulsa B para comprar' : to==='deagle' ? 'No tienes Deagle • Pulsa B para comprar' : 'Sin arma');
    return;
  }
  if(currentWeapon==='ak'){ akStoredAmmo=ammoInMag; akStoredReserve=reserveAmmo; }
  else if(currentWeapon==='awp'){ awpAmmo=ammoInMag; awpReserve=reserveAmmo; }
  else if(currentWeapon==='deagle'){ deagleAmmo=ammoInMag; deagleReserve=reserveAmmo; }
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
  else if(to==='knife'){ /* sin munición */ }
  currentWeapon=to;
  updateWeaponVisibility();
  showFloating(to==='knife' ? 'CUCHILLO' : to==='awp' ? 'AWP' : to==='deagle' ? 'DESERT EAGLE' : 'AK-47');
  if(buyMenuOpen) updateBuyMenu();
}
function tryReload(){
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
  playSound(120,0.02,0.12,'square',0.14);
  setTimeout(()=>playSound(200,0.02,0.10,'square',0.12), 380);
  setTimeout(()=>playSound(320,0.02,0.10,'square',0.13), 820);
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
  playSound(450,0.01,0.08,'sine',0.18);
}

function setAiming(v){
  if(currentWeapon==='deagle') v=false;
  if(isReloading || isInspecting) v=false;
  isAiming=v;
  updateAmmoHUD();
}
function tryInspect(){
  if(!gameActive || isReloading || isInspecting || isBoltCycling) return;
  if(!controls.isLocked) return;
  if(currentWeapon==='ak' && (!akModel || !weaponBasePos)) return;
  if(currentWeapon==='knife' && (!knifeModel || !knifeBasePos)) return;
  if(currentWeapon==='awp' && (!awpModel || !awpBasePos)) return;
  if(currentWeapon==='deagle' && (!deagleModel || !deagleBasePos)) return;
  isInspecting=true;
  inspectProgress=0;
  isAiming=false;
  updateAmmoHUD();
}
function knifeAttack(){
  if(!gameActive || !controls.isLocked || isReloading || isKnifeSwinging) return;
  if(typeof buyMenuOpen!=='undefined' && buyMenuOpen) return;
  if(currentWeapon!=='knife') return;
  // si estabas inspeccionando, al atacar se cancela (pedido: al disparar se cancela animación)
  if(isInspecting){ isInspecting=false; inspectProgress=0; updateAmmoHUD(); }
  isKnifeSwinging=true; knifeSwingProgress=0; knifeSwingDir *= -1;
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
  // cuchillo tiene su propia animación
  if(currentWeapon==='knife'){
    if(!knifeModel || !knifeBasePos) return;
    // FOV normal sin mira
    if(Math.abs(camera.fov - baseFov) > 0.05){ camera.fov = THREE.MathUtils.lerp(camera.fov, baseFov, 1 - Math.pow(0.001, dt*8)); camera.updateProjectionMatrix(); }
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
      playSound(440,0.08,0.12,'sine',0.22); setTimeout(()=>playSound(660,0.06,0.08,'sine',0.16),70);
      const pts=b.isAWP?250:b.isDeagle?140:100; hits++; score+=pts; showFloating('+'+pts+(b.isAWP?' AWP!':b.isDeagle?' DEAGLE!':'')); updateHUD();
      scene.remove(hit); targets = targets.filter(x=>x!==hit); if(gameActive) setTimeout(spawnTarget,120);
      // remover bala
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
        const dustMeshes = [];
        dust2Group.traverse(o=>{ if(o.isMesh) dustMeshes.push(o); });
        if(dustMeshes.length){
          const segDir = new THREE.Vector3().subVectors(b.mesh.position, b.prev);
          const segLen = segDir.length();
          if(segLen > 0.001){
            segDir.normalize();
            const r = new THREE.Raycaster(b.prev, segDir, 0, segLen);
            const hits = r.intersectObjects(dustMeshes, false);
            if(hits.length){
              spawnParticles(hits[0].point, 0xd8c2a0);
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
  if(!gameActive || !controls.isLocked) return;
  if(typeof buyMenuOpen!=='undefined' && buyMenuOpen) return;
  if(isReloading) return;
  if(isInspecting){ isInspecting=false; inspectProgress=0; updateAmmoHUD(); }
  const now = performance.now();
  const curFireRate = currentWeapon==='awp' ? 1150 : currentWeapon==='deagle' ? 225 : fireRate;
  if(now - lastShotTime < curFireRate) return;
  if(currentWeapon==='awp' && isBoltCycling) return;
  if(ammoInMag<=0){
    playSound(80,0.01,0.08,'square',0.12);
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
    ? (isAiming ? new THREE.Vector3(0.02, -0.10, -0.92) : new THREE.Vector3(0.32, -0.16, -1.12))
    : (isAiming ? new THREE.Vector3(0.02, -0.12, -0.78) : new THREE.Vector3(0.35, -0.18, -1.05));
  // light + sprite
  const flash = new THREE.PointLight(0xffcc66, 22, 3);
  flash.position.copy(flashPos);
  camera.add(flash);
  setTimeout(()=>camera.remove(flash), 45);
  // pequeño sprite de destello
  const flashMesh = new THREE.Mesh(new THREE.ConeGeometry(0.06,0.14,6), new THREE.MeshBasicMaterial({color:0xffd27a, transparent:true, opacity:0.95}));
  flashMesh.position.copy(flashPos);
  flashMesh.position.z -= 0.18;
  flashMesh.rotation.x=Math.PI;
  camera.add(flashMesh);
  setTimeout(()=>camera.remove(flashMesh), 40);
  // casing eject (pequeño cilindro dorado)
  const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.03,8), new THREE.MeshStandardMaterial({color:0xd8a44a, metalness:0.7, roughness:0.3}));
  casing.position.set(0.18, -0.18, -0.55);
  camera.add(casing);
  const vel = new THREE.Vector3(0.9+Math.random()*0.6, 0.7+Math.random()*0.4, -0.6);
  let life=0.55;
  const tick=()=>{
    life-=0.016;
    casing.position.add(vel.clone().multiplyScalar(0.016));
    vel.y -= 9.8*0.016;
    casing.rotation.x+=0.3; casing.rotation.z+=0.2;
    if(life<=0) camera.remove(casing); else requestAnimationFrame(tick);
  }; tick();

  playSound(180,0.04,0.14,'square', isAiming?0.16:0.18);

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
  updateHUD();
}
function spawnParticles(pos, color){
  const count=10;
  for(let i=0;i<count;i++){
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.04,6,6), new THREE.MeshStandardMaterial({color}));
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

export { WEAPON_MOVE_MULT, getWeaponMoveMult, applyPlayerScale, updateAmmoHUD, updateWeaponVisibility, switchWeapon, tryReload, finishReload, setAiming, tryInspect, knifeAttack, updateWeaponAnim, spawnBullet, updateBullets, updateViewRecoil, shoot, spawnParticles };

/* =========================================================================
 * controls.js
 * ========================================================================= */
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

/* =========================================================================
 * main.js
 * ========================================================================= */
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
      const data=await window.authService.login(u,p);
      if(!data || !data.user) throw new Error('Credenciales incorrectas');
      fafiFinalizeAuth(data.user, false);
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
      const data=await window.authService.register(u,email,p);
      if(!data || !data.user) throw new Error('No se pudo crear la cuenta');
      fafiFinalizeAuth(data.user, false);
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
