import * as THREE from 'three';
import { scene, camera, controls, raycaster, keys, bullets, targets, gameActive, gameMode, dust2Colliders, dust2Group, currentWeapon, ammoInMag, maxMag, reserveAmmo, akStoredAmmo, akStoredReserve, awpAmmo, awpReserve, awpMaxMag, deagleAmmo, deagleReserve, deagleMaxMag, isReloading, reloadProgress, isAiming, aimProgress, isInspecting, inspectProgress, inspectDuration, isKnifeSwinging, knifeSwingProgress, knifeSwingDir, isBoltCycling, boltProgress, viewRecoilX, viewRecoilY, spreadAccum, recoilPatternStep, spamHeat, consecutiveSpam, lastShotTime, fireRate, recoilKick, isCrouching, crouchProgress, baseFov, aimFov, awpAimFov, baseStandHeight, baseCrouchHeight, basePlayerRadius, standHeight, crouchHeight, playerScale, playerRadiusScale, playerRadius, playerDummy, dummyAK, dummyKnife, dummyAWP, dummyDeagle, owned, buyMenuOpen, updateBuyMenu, updateHUD, showFloating, playSound, spawnTarget, hitMarker, score, hits, shots, freeCam, akModel, awpModel, deagleModel, knifeModel, weaponBasePos, weaponBaseRot, weaponAimPos, weaponAimRot, awpBasePos, awpBaseRot, awpAimPos, awpAimRot, deagleBasePos, deagleBaseRot, deagleAimPos, deagleAimRot, knifeBasePos, knifeBaseRot } from './main.js';

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
