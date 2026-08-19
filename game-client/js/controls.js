function toggleWeaponMenu() { isWeaponMenuOpen = !isWeaponMenuOpen; const menu = document.getElementById('weapon-menu'); if (isWeaponMenuOpen) { menu.style.display = "block"; document.exitPointerLock(); } else { menu.style.display = "none"; document.body.requestPointerLock(); } }

function setupControls() {
    document.addEventListener('keydown', (e) => {
        if(e.code === 'Digit0' || e.code === 'Numpad0' || e.code === 'Escape') toggleInGameMenu();
        if(e.code === 'KeyB') toggleWeaponMenu();
        if(isWeaponMenuOpen || isInGameMenuOpen) return; 
        if(e.code === 'KeyF' && !isReloading && !isStabbing && !isThrowing && !isAiming) { isInspecting = true; inspectTime = 0; }
        if(e.code === 'KeyW') { moveForward = true; isInspecting = false; } if(e.code === 'KeyS') { moveBackward = true; isInspecting = false; } if(e.code === 'KeyA') { moveRight = true; isInspecting = false; } if(e.code === 'KeyD') { moveLeft = true; isInspecting = false; }
        if(e.code === 'KeyR') reload(); if(e.code === 'ShiftLeft') isSprinting = true;
        if(e.code.startsWith('Digit') && e.code !== 'Digit0') changeWeapon(parseInt(e.code.replace('Digit','')));
        if(e.code === 'Space' && canJump && stamina >= 15) { velocity.y = 8; canJump = false; stamina -= 15; isInspecting = false; }
    });
    document.addEventListener('keyup', (e) => {
        if(e.code === 'KeyW') moveForward = false; if(e.code === 'KeyS') moveBackward = false; if(e.code === 'KeyA') moveRight = false; if(e.code === 'KeyD') moveLeft = false; if(e.code === 'ShiftLeft') isSSprint = false;
    });
    document.addEventListener('mousedown', (e) => {
        if(isWeaponMenuOpen || isInGameMenuOpen || !document.pointerLockElement) return;
        if(e.button === 0) { shoot(); if(currentWeapon === 'vandal' || currentWeapon === 'ak47') { autoShootInterval = setInterval(shoot, weaponStats[currentWeapon].fireRate); } }
        if(e.button === 2) { isAiming = true; isInspecting = false; if(currentWeapon === 'sniper') document.getElementById('sniper-scope').style.display = "block"; }
    });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) clearInterval(autoShootInterval); if (e.button === 2) { isAiming = false; document.getElementById('sniper-scope').style.display = "none"; } });
    document.addEventListener('mousemove', (e) => {
        if (isWeaponMenuOpen || isInGameMenuOpen || !document.pointerLockElement) return;
        let currentSens = isAiming ? sensitivity * adsMultiplier : sensitivity; camera.rotation.y -= e.movementX * currentSens; camera.rotation.x -= e.movementY * currentSens; camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    });
}

function animate() {
    requestAnimationFrame(animate); if (!scene) return; const time = performance.now(); const delta = (time - lastTime) / 1000; lastTime = time;

    let shakeRotX = 0; let shakeRotZ = 0;
    if (damageShake > 0) { const intensity = damageShake * 0.1; shakeRotX = Math.sin(time * 0.04) * intensity; shakeRotZ = Math.cos(time * 0.05) * intensity; camera.rotation.x += shakeRotX; camera.rotation.z += shakeRotZ; damageShake -= delta; if (damageShake < 0) damageShake = 0; }

    let targetFov = (isAiming && currentWeapon === 'sniper') ? 20 : 75; if (Math.abs(camera.fov - targetFov) > 0.5) { camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.15); camera.updateProjectionMatrix(); }
    const crosshair = document.getElementById('crosshair'); if (isAiming && currentWeapon === 'sniper') { crosshair.style.display = 'none'; } else { crosshair.style.display = 'block'; }

    velocity.x -= velocity.x * 10.0 * delta; velocity.z -= velocity.z * 10.0 * delta; velocity.y -= 9.8 * 2.0 * delta; direction.z = Number(moveForward) - Number(moveBackward); direction.x = Number(moveRight) - Number(moveLeft); direction.normalize();

    let currentSpeed = isSprinting ? 60.0 : 30.0; if (isAiming) currentSpeed = 15.0;
    if (moveForward || moveBackward) velocity.z -= direction.z * currentSpeed * delta; if (moveLeft || moveRight) velocity.x -= direction.x * currentSpeed * delta;
    camera.translateX(velocity.x * delta); camera.translateY(velocity.y * delta); camera.translateZ(velocity.z * delta); if (camera.position.y < 1.6) { velocity.y = 0; camera.position.y = 1.6; canJump = true; }

    if (!isSprinting && stamina < 100) stamina += 15 * delta; else if (isSprinting && (moveForward||moveBackward||moveLeft||moveRight)) stamina -= 25 * delta;
    stamina = Math.max(0, Math.min(100, stamina)); document.getElementById('stamina-fill').style.width = stamina + '%'; if (stamina === 0) isSprinting = false;

    if (isInspecting) {
        inspectTime += delta * 1.5; if (inspectTime >= Math.PI) { isInspecting = false; } else { const animVal = Math.sin(inspectTime); weaponGroup.rotation.y = THREE.MathUtils.lerp(weaponGroup.rotation.y, -0.2 + (animVal * 1.5), 0.15); weaponGroup.rotation.x = THREE.MathUtils.lerp(weaponGroup.rotation.x, (animVal * 0.4), 0.15); weaponGroup.rotation.z = THREE.MathUtils.lerp(weaponGroup.rotation.z, (animVal * -0.2), 0.15); weaponGroup.position.x = THREE.MathUtils.lerp(weaponGroup.position.x, 0.35 + (animVal * 0.1), 0.15); }
    } else if (!isReloading && !isStabbing && !isThrowing) {
        let targetPosX = 0.35; let targetPosY = -0.35; let targetPosZ = -0.5; let targetRotX = 0; let targetRotY = -0.2; let targetRotZ = 0;
        
        if (isAiming) { targetPosX = 0; targetPosY = -0.25; targetPosZ = -0.4; targetRotY = 0; }
        
        if (moveForward || moveBackward || moveLeft || moveRight) { const bobbingSpeed = isSprinting ? 15 : 10; const bobbingAmount = isAiming ? 0.005 : 0.02; targetPosY += Math.sin(time * 0.001 * bobbingSpeed) * bobbingAmount; targetPosX += Math.cos(time * 0.0005 * bobbingSpeed) * bobbingAmount; }
        
        weaponGroup.position.x = THREE.MathUtils.lerp(weaponGroup.position.x, targetPosX, 0.2); weaponGroup.position.y = THREE.MathUtils.lerp(weaponGroup.position.y, targetPosY, 0.2); weaponGroup.position.z = THREE.MathUtils.lerp(weaponGroup.position.z, targetPosZ, 0.2);
        weaponGroup.rotation.x = THREE.MathUtils.lerp(weaponGroup.rotation.x, targetRotX, 0.2); weaponGroup.rotation.y = THREE.MathUtils.lerp(weaponGroup.rotation.y, targetRotY, 0.2); weaponGroup.rotation.z = THREE.MathUtils.lerp(weaponGroup.rotation.z, targetRotZ, 0.2);
    }

    if(isStabbing) {
        stabAnimProgress += delta * 5;
        if(stabAnimProgress < 0.5) { weaponGroup.position.z -= 0.1; weaponGroup.rotation.x += 0.2; weaponGroup.rotation.y -= 0.2; } else { weaponGroup.position.z += 0.1; weaponGroup.rotation.x -= 0.2; weaponGroup.rotation.y += 0.2; }
    }

    if(isThrowing) {
        throwAnimProgress += delta * 6;
        if(throwAnimProgress < 0.5) { weaponGroup.position.y -= 0.1; weaponGroup.position.z += 0.1; weaponGroup.rotation.x -= 0.5; } else { weaponGroup.position.y += 0.2; weaponGroup.position.z -= 0.3; weaponGroup.rotation.x += 0.8; }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; b.position.add(b.velocity.clone().multiplyScalar(delta));
        if (b.isGravity) { b.velocity.y -= 25.0 * delta; if (b.position.y <= 0.2) { b.velocity.y = 0; b.velocity.x = 0; b.velocity.z = 0; b.position.y = 0.2; } }
    }

    if(gameMode === 'campaign') {
        enemyBots.forEach(bot => {
            bot.mesh.lookAt(camera.position.x, bot.mesh.position.y, camera.position.z);
            if(bot.mesh.position.distanceTo(camera.position) > 10) { const dir = new THREE.Vector3(); dir.subVectors(camera.position, bot.mesh.position).normalize(); bot.mesh.position.add(dir.multiplyScalar(3.0 * delta)); }
            if(time > bot.lastShot) {
                const dist = bot.mesh.position.distanceTo(camera.position);
                if(dist < 30) {
                    const bulletStart = bot.mesh.position.clone(); bulletStart.y += 1.0; const shootDir = new THREE.Vector3(); shootDir.subVectors(camera.position, bulletStart).normalize(); shootDir.x += (Math.random() - 0.5) * 0.1; shootDir.y += (Math.random() - 0.5) * 0.1; shootDir.z += (Math.random() - 0.5) * 0.1;
                    spawnBullet(bulletStart, shootDir.normalize(), 0xffaa00, false, true, 'vandal');
                    
                    const checkHit = setInterval(() => {
                        if (bullets.length > 0 && bullets[bullets.length - 1] && bullets[bullets.length - 1].position.distanceTo(camera.position) < 0.8) { health -= 15; damageShake = 0.5; document.getElementById('hp-fill').style.width = health + "%"; if (health <= 0) { alert("Has muerto en combate. Reiniciando..."); location.reload(); } clearInterval(checkHit); }
                    }, 50); setTimeout(() => clearInterval(checkHit), 1000);
                }
                bot.lastShot = time + 1500 + Math.random() * 2000;
            }
        });
    }

    for (let id in remotePlayers) {
        let rp = remotePlayers[id];
        if (rp.userData.isMoving) { rp.userData.walkTime += delta * (rp.userData.isSprinting ? 15 : 10); rp.userData.leftLeg.rotation.x = Math.sin(rp.userData.walkTime) * 0.5; rp.userData.rightLeg.rotation.x = -Math.sin(rp.userData.walkTime) * 0.5; rp.userData.leftArm.rotation.x = -Math.sin(rp.userData.walkTime) * 0.5; rp.userData.rightArm.rotation.x = Math.sin(rp.userData.walkTime) * 0.3; } 
        else { rp.userData.leftLeg.rotation.x = 0; rp.userData.rightLeg.rotation.x = 0; rp.userData.leftArm.rotation.x = 0; rp.userData.rightArm.rotation.x = 0; rp.userData.walkTime = 0; }
    }

    broadcast({ type: 'move', pos: { x: camera.position.x, y: camera.position.y - 1.6, z: camera.position.z }, rot: camera.rotation.y, sprint: isSprinting, weapon: currentWeapon }); renderer.render(scene, camera);
}