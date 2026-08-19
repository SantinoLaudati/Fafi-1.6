function setupWeapon() {
    if(weaponGroup) camera.remove(weaponGroup);
    weaponGroup = new THREE.Group();

    let cDark = 0x111111, cDarkGrey = 0x2a2a2a, cMetal = 0x555555, cAccent = 0xff4655, cWood = 0x5c3a21;
    if(window.equippedSkins[currentWeapon]) {
        const skinData = skinsDB.find(s => s.id === window.equippedSkins[currentWeapon]);
        if(skinData && skinData.colors) {
            if(skinData.colors.dark) cDark = skinData.colors.dark; if(skinData.colors.body) cDarkGrey = skinData.colors.body; if(skinData.colors.metal) cMetal = skinData.colors.metal; if(skinData.colors.accent) cAccent = skinData.colors.accent; if(skinData.colors.wood) cWood = skinData.colors.wood;
        }
    }

    const matDark = new THREE.MeshStandardMaterial({ color: cDark, roughness: 0.8, metalness: 0.3 });
    const matDarkGrey = new THREE.MeshStandardMaterial({ color: cDarkGrey, roughness: 0.6, metalness: 0.5 });
    const matMetal = new THREE.MeshStandardMaterial({ color: cMetal, roughness: 0.3, metalness: 0.8 });
    const matRedAccent = new THREE.MeshStandardMaterial({ color: cAccent, roughness: 0.4, metalness: 0.3 });
    const matWood = new THREE.MeshStandardMaterial({ color: cWood, roughness: 0.9, metalness: 0.1 });
    const matGrenade = new THREE.MeshStandardMaterial({ color: 0x2e3b2c, roughness: 0.8, metalness: 0.5 });
    const matGlass = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 });

    if(currentWeapon === 'vandal') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.45), matDarkGrey); const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3), matMetal); barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.03, -0.35);
        const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05), matDark); muzzle.rotation.x = Math.PI/2; muzzle.position.set(0, 0.03, -0.5);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.07), matDark); mag.position.set(0, -0.12, -0.05); mag.rotation.x = 0.15;
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.12, 0.045), matDark); grip.position.set(0, -0.12, 0.15); grip.rotation.x = 0.25;
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.2), matDarkGrey); stock.position.set(0, -0.02, 0.3);
        const holoBase = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.08), matMetal); holoBase.position.set(0, 0.08, 0); const holoGlass = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.01), matGlass); holoGlass.position.set(0, 0.11, 0.03);
        weaponGroup.add(body, barrel, muzzle, mag, grip, stock, holoBase, holoGlass);
    }
    else if(currentWeapon === 'ak47') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.35), matMetal); const woodStock = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.22), matWood); woodStock.position.set(0, -0.03, 0.25); woodStock.rotation.x = -0.05;
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35), matMetal); barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.01, -0.35);
        const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), matWood); gasTube.rotation.x = Math.PI/2; gasTube.position.set(0, 0.03, -0.22);
        const sightBlock = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.02), matMetal); sightBlock.position.set(0, 0.03, -0.45);
        const mag = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 16, Math.PI/3), matDark); mag.rotation.y = Math.PI/2; mag.position.set(0, -0.1, -0.15);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.1, 0.04), matWood); grip.position.set(0, -0.08, 0.12); grip.rotation.x = 0.2;
        weaponGroup.add(body, woodStock, barrel, gasTube, sightBlock, mag, grip);
    }
    else if(currentWeapon === 'sniper') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.65), matDark); const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.7), matMetal); barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0, -0.6);
        const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.08), matDarkGrey); muzzle.position.set(0, 0, -0.95);
        const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35), matMetal); scopeBody.rotation.x = Math.PI/2; scopeBody.position.set(0, 0.12, -0.1);
        const bipod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), matMetal); bipod.position.set(0, -0.06, -0.3);
        weaponGroup.add(body, barrel, muzzle, scopeBody, bipod);
    }
    else if(currentWeapon === 'deagle') {
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.28), matMetal); slide.position.set(0, 0.05, -0.05);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.06), matDark); grip.position.set(0, -0.02, 0.05); grip.rotation.x = 0.15;
        const underBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.15), matDarkGrey); underBarrel.position.set(0, 0.01, -0.1);
        weaponGroup.add(slide, grip, underBarrel);
    }
    else if(currentWeapon === 'pistol') {
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 0.2), matDarkGrey); slide.position.set(0, 0.05, -0.02);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.1, 0.045), matDark); grip.position.set(0, -0.01, 0.04); grip.rotation.x = 0.15;
        weaponGroup.add(slide, grip);
    }
    else if(currentWeapon === 'knife') {
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.12, 16), matDark); handle.rotation.x = Math.PI / 2; handle.position.z = 0.06;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 16, 32), matMetal); ring.position.set(0, 0, 0.14);
        const bladeBase = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.035, 0.08), matMetal); bladeBase.position.set(0, 0.01, -0.02); bladeBase.rotation.x = 0.2;
        const bladeCurve = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.02, 0.12, 3), matMetal); bladeCurve.rotation.x = Math.PI / 2; bladeCurve.rotation.y = Math.PI / 2; bladeCurve.position.set(0, -0.02, -0.08); bladeCurve.rotation.x = -0.5;
        weaponGroup.add(handle, ring, bladeBase, bladeCurve); weaponGroup.rotation.y = -0.2; weaponGroup.rotation.x = 0.1;
    }
    else if(currentWeapon === 'grenade') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 12), matGrenade); const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.03), matMetal); neck.position.y = 0.07;
        const spoon = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.1, 0.02), matMetal); spoon.position.set(0.025, 0.04, 0); spoon.rotation.z = -0.1;
        const pin = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.003, 8, 16), matRedAccent); pin.position.set(-0.02, 0.08, 0);
        weaponGroup.add(body, neck, spoon, pin);
    }

    weaponGroup.position.set(0.35, -0.35, -0.5); camera.add(weaponGroup);
}

function changeWeapon(slot) {
    isInspecting = false; const weaponsList = ['vandal', 'ak47', 'deagle', 'sniper', 'pistol', 'knife', 'grenade'];
    if(slot >= 1 && slot <= 7) {
        currentWeapon = weaponsList[slot - 1]; ammo = maxAmmo[currentWeapon];
        let displayName = currentWeapon.toUpperCase();
        if(window.equippedSkins[currentWeapon]) { const skin = skinsDB.find(s => s.id === window.equippedSkins[currentWeapon]); if(skin) displayName = skin.name.toUpperCase(); }
        document.getElementById('current-weapon-name').innerText = displayName; document.getElementById('ammo-count').innerText = ammo; setupWeapon();
    }
}

function shoot() {
    if(isReloading || isWeaponMenuOpen || isInGameMenuOpen || !scene) return;
    isInspecting = false; 
    const now = performance.now(); 
    const stats = weaponStats[currentWeapon];

    if (now - lastShootTime < stats.fireRate) return; 

    if (now - lastShotTimeForRecoil > 400) { sprayCount = 0; }
    lastShotTimeForRecoil = now;
    lastShootTime = now;

    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    const isMovingPlayer = (moveForward || moveBackward || moveLeft || moveRight);
    
    let movementPenalty = isMovingPlayer ? 4.0 : 1.0;
    let sprayPenalty = 1.0 + (sprayCount * 0.15); 
    
    let currentSpread = (isAiming ? stats.spread * 0.4 : stats.spread) * movementPenalty * sprayPenalty;
    dir.x += (Math.random() - 0.5) * currentSpread; 
    dir.y += (Math.random() - 0.5) * currentSpread; 
    dir.z += (Math.random() - 0.5) * currentSpread; 
    dir.normalize();
    
    const spawnPos = camera.position.clone();

    if(currentWeapon !== 'knife' && currentWeapon !== 'grenade') {
        if(ammo <= 0) { reload(); return; } ammo--; document.getElementById('ammo-count').innerText = ammo;
        let bulletColor = 0x00ffcc; 
        if(window.equippedSkins[currentWeapon]) { const skin = skinsDB.find(s => s.id === window.equippedSkins[currentWeapon]); if(skin && skin.rarity === 'legendaria' && skin.colors.metal) bulletColor = skin.colors.metal; }
        
        spawnBullet(spawnPos, dir, bulletColor, false, false, currentWeapon);
        
        weaponGroup.position.z += 0.08; weaponGroup.rotation.x += currentWeapon === 'sniper' ? 0.15 : 0.05;
        
        let recoilVertical = stats.recoil * (isMovingPlayer ? 1.5 : 1.0) * sprayPenalty;
        let recoilHorizontal = (Math.random() - 0.5) * (stats.recoil * 0.8) * sprayPenalty;
        
        camera.rotation.x += recoilVertical; 
        camera.rotation.y += recoilHorizontal;
        
        sprayCount++;
        if(sprayCount > 20) sprayCount = 20; 

        broadcast({ type: 'shoot', pos: spawnPos, dir: dir, weapon: currentWeapon });
    }
    else if(currentWeapon === 'knife' && !isStabbing) {
        isStabbing = true; stabAnimProgress = 0;
        for(let id in remotePlayers) {
            if(camera.position.distanceTo(remotePlayers[id].position) < 3) {
                if(connections[id]) connections[id].send({ type: 'damage', amount: weaponStats.knife.body }); showDamage(weaponStats.knife.body, false, remotePlayers[id]);
            }
        }
        setTimeout(() => { isStabbing = false; }, 500);
    }
    else if(currentWeapon === 'grenade' && !isThrowing) {
        isThrowing = true; throwAnimProgress = 0;
        setTimeout(() => { spawnBullet(spawnPos, dir, 0xffffff, true, false, 'grenade'); broadcast({ type: 'shoot', pos: spawnPos, dir: dir, weapon: 'grenade' }); isThrowing = false; }, 200);
    }
}

function reload() {
    if (isReloading || maxAmmo[currentWeapon] === 0) return;
    isReloading = true; isInspecting = false; const origY = -0.35, origRotX = 0, origRotZ = 0; const startTime = performance.now(); const duration = 1200;
    function anim() {
        const now = performance.now(); const progress = (now - startTime) / duration;
        if (progress < 1) { weaponGroup.position.y = origY - Math.sin(progress * Math.PI) * 0.4; weaponGroup.rotation.x = origRotX - Math.sin(progress * Math.PI) * 0.5; weaponGroup.rotation.z = origRotZ + Math.sin(progress * Math.PI) * 0.3; requestAnimationFrame(anim); } 
        else { ammo = maxAmmo[currentWeapon]; document.getElementById('ammo-count').innerText = ammo; weaponGroup.position.y = origY; weaponGroup.rotation.x = origRotX; weaponGroup.rotation.z = origRotZ; isReloading = false; }
    }
    anim();
}

function showDamage(amount, isHeadshot, target) {
    if(!target) return; const vector = target.position.clone(); vector.y += 0.5; vector.project(camera);
    const x = (vector.x * .5 + .5) * window.innerWidth; const y = (vector.y * -.5 + .5) * window.innerHeight;
    const popup = document.createElement('div'); popup.className = 'damage-popup' + (isHeadshot ? ' damage-headshot' : ''); popup.innerText = amount; popup.style.left = `${x}px`; popup.style.top = `${y}px`;
    document.body.appendChild(popup); setTimeout(() => popup.remove(), 800);
}

function spawnBullet(pos, dir, color, isFlash, isRemote, weaponType) {
    const geo = isFlash ? new THREE.CylinderGeometry(0.06, 0.06, 0.15, 8) : new THREE.SphereGeometry(0.04);
    const mat = isFlash ? new THREE.MeshStandardMaterial({color: 0x2e3b2c}) : new THREE.MeshBasicMaterial({ color: color });
    const bullet = new THREE.Mesh(geo, mat); bullet.position.copy(pos).add(dir.clone().multiplyScalar(1));
    let speed = 120.0; if (isFlash) { speed = 22.0; } else if (weaponType === 'sniper') { speed = 250.0; }
    bullet.velocity = dir.clone().multiplyScalar(speed); if(isFlash) bullet.velocity.y += 8; bullet.isGravity = isFlash; bullet.isFlash = isFlash; scene.add(bullet); bullets.push(bullet);

    if(!isRemote && Object.keys(remotePlayers).length > 0 && !isFlash && gameMode === 'online') {
        const stats = weaponStats[weaponType];
        const checkInterval = setInterval(() => {
            let hitId = null; let isHeadshot = false;
            for(let id in remotePlayers) {
                let rpRootPos = remotePlayers[id].position; let headDist = bullet.position.distanceTo(rpRootPos); let bodyCenter = rpRootPos.clone(); bodyCenter.y -= 0.6; let bodyDist = bullet.position.distanceTo(bodyCenter);
                if(headDist < 0.35) { hitId = id; isHeadshot = true; break; } else if(bodyDist < 0.8) { hitId = id; isHeadshot = false; break; }
            }
            if(hitId) { let targetPlayer = remotePlayers[hitId]; let finalDamage = isHeadshot ? stats.head : stats.body; if(connections[hitId]) connections[hitId].send({ type: 'damage', amount: finalDamage }); showDamage(finalDamage, isHeadshot, targetPlayer); scene.remove(bullet); clearInterval(checkInterval); }
        }, 10);
        setTimeout(() => clearInterval(checkInterval), 1000);
    }

    if(!isFlash && gameMode === 'campaign') {
        const stats = weaponStats[weaponType];
        const checkBot = setInterval(() => {
            let hitIndex = -1; let isHeadshot = false;
            enemyBots.forEach((bot, idx) => {
                let headPos = new THREE.Vector3(bot.mesh.position.x, bot.mesh.position.y + 1.4, bot.mesh.position.z);
                let bodyPos = new THREE.Vector3(bot.mesh.position.x, bot.mesh.position.y + 0.6, bot.mesh.position.z);
                if (bullet.position.distanceTo(headPos) < 0.4) { hitIndex = idx; isHeadshot = true; }
                else if (bullet.position.distanceTo(bodyPos) < 0.8) { hitIndex = idx; isHeadshot = false; }
            });
            
            if (hitIndex > -1) {
                let bot = enemyBots[hitIndex];
                let finalDamage = isHeadshot ? stats.head : stats.body;
                bot.health -= finalDamage;
                showDamage(finalDamage, isHeadshot, bot.mesh);
                scene.remove(bullet);
                clearInterval(checkBot);
                
                if (bot.health <= 0) {
                    scene.remove(bot.mesh);
                    enemyBots.splice(hitIndex, 1);
                    
                    if(enemyBots.length === 0) {
                        unlockAchievement('campaign_hero');
                        window.campaignLevel++;
                        saveGameData();
                        alert("¡ZONA DESPEJADA! Nivel Completado. Has avanzado en el Mapa de Campaña.");
                        document.exitPointerLock();
                        location.reload();
                    }
                }
            }
        }, 10);
        setTimeout(() => clearInterval(checkBot), 1000);
    }

    if(!isFlash && gameMode === 'aim') {
        const checkTarget = setInterval(() => { aimTargets.forEach((t) => { if (bullet.position.distanceTo(t.position) < 1.0) { scene.remove(bullet); t.position.set((Math.random() - 0.5) * 30, 2 + Math.random() * 8, -19); document.getElementById('crosshair').style.filter = "drop-shadow(0 0 5px red)"; setTimeout(()=> document.getElementById('crosshair').style.filter = "none", 100); clearInterval(checkTarget); } }); }, 10); setTimeout(() => clearInterval(checkTarget), 1000);
    }

    setTimeout(() => {
        if(isFlash) { for(let id in remotePlayers) { if(!isRemote && remotePlayers[id] && bullet.position.distanceTo(remotePlayers[id].position) < 30) { if(connections[id]) connections[id].send({ type: 'flash_event' }); } } if(bullet.position.distanceTo(camera.position) < 30) triggerFlash(); }
        scene.remove(bullet); const idx = bullets.indexOf(bullet); if(idx > -1) bullets.splice(idx, 1);
    }, isFlash ? 2500 : 1000);
}

function triggerFlash() { const ov = document.getElementById('flash-overlay'); ov.style.transition = "none"; ov.style.opacity = "1"; setTimeout(() => { ov.style.transition = "opacity 4s"; ov.style.opacity = "0"; }, 100); }