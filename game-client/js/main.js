function switchFafi16Tab(tabId, element) {
    document.querySelectorAll('.fafi16-panel').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.fafi16-tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('fafi16-tab-' + tabId).classList.add('active');
    element.classList.add('active');
}

function showRegister() {
    document.getElementById('login-box').style.display = 'none';
    document.getElementById('register-box').style.display = 'block';
}

function showLogin() {
    document.getElementById('register-box').style.display = 'none';
    document.getElementById('login-box').style.display = 'block';
}

window.handleLogin = async () => {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    if(user.length < 3) { alert("Usuario inválido."); return; }

    window.currentUserId = user; 
    finalizeAuth(user);
};

window.handleRegister = async () => {
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    if(user.length < 3) { alert("El usuario debe tener al menos 3 caracteres."); return; }

    alert("Cuenta local creada (No conectada a DB).");
    window.currentUserId = user;
    finalizeAuth(user);
};

function finalizeAuth(username) {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('menus').style.display = 'flex';
    document.getElementById('player-name').innerText = username;
    loadGameData();
}

window.fafiCoins = 2000;
window.userInventory = [];
window.equippedSkins = { vandal: null, ak47: null, deagle: null, sniper: null, pistol: null, knife: null, grenade: null };
window.currentUserId = null; 
let enemyBots = [];

window.purchaseHistory = [];
window.friendsList = [];
window.campaignLevel = 1;
window.achievements = [
    { id: 'first_blood', name: 'Recluta', desc: 'Entra a tu primera partida.', unlocked: false },
    { id: 'rich_boy', name: 'Inversor de Fafi', desc: 'Realiza tu primera compra de caja.', unlocked: false },
    { id: 'campaign_hero', name: 'Héroe de Guerra', desc: 'Completa un nivel en la Campaña WWII.', unlocked: false }
];

let sprayCount = 0;
let lastShotTimeForRecoil = 0;

const skinsDB = [
    { id: 'v_neon', weapon: 'vandal', name: 'Vandal Neón', rarity: 'epica', colors: { body: 0x111111, accent: 0x00ffcc, metal: 0x222222 } },
    { id: 'v_magma', weapon: 'vandal', name: 'Vandal Magma', rarity: 'legendaria', colors: { body: 0x330000, accent: 0xff3300, metal: 0x1a0000 } },
    { id: 'v_desert', weapon: 'vandal', name: 'Vandal Desierto', rarity: 'comun', colors: { body: 0xc2b280, accent: 0x5c4033, metal: 0x8b7e66 } },
    { id: 'ak_oro', weapon: 'ak47', name: 'AK-47 Oro Macizo', rarity: 'legendaria', colors: { metal: 0xffd700, wood: 0x111111 } },
    { id: 'ak_hielo', weapon: 'ak47', name: 'AK-47 Glaciar', rarity: 'epica', colors: { metal: 0x00aaff, wood: 0x003366 } },
    { id: 'ak_tactical', weapon: 'ak47', name: 'AK-47 Táctica', rarity: 'comun', colors: { metal: 0x222222, wood: 0x333333 } },
    { id: 's_void', weapon: 'sniper', name: 'Sniper Vacío', rarity: 'legendaria', colors: { dark: 0x1a0033, metal: 0x8a2be2 } },
    { id: 's_camo', weapon: 'sniper', name: 'Sniper Camuflaje', rarity: 'comun', colors: { dark: 0x2e3b2c, metal: 0x1f2e1e } },
    { id: 'd_crimson', weapon: 'deagle', name: 'Deagle Carmesí', rarity: 'epica', colors: { metal: 0xcc0000, dark: 0x220000 } },
    { id: 'k_karambit', weapon: 'knife', name: 'Cuchillo Zafiro', rarity: 'legendaria', colors: { metal: 0x0f52ba, dark: 0x000000 } },
    { id: 'k_blood', weapon: 'knife', name: 'Cuchillo Sangre', rarity: 'epica', colors: { metal: 0xff0000, dark: 0x111111 } }
];

window.saveGameData = async () => {
    if (!window.currentUserId) return; 
    const dataToSave = { 
        coins: window.fafiCoins, inventory: window.userInventory, equipped: window.equippedSkins,
        purchases: window.purchaseHistory, friends: window.friendsList, achievements: window.achievements, level: window.campaignLevel
    };
    
    localStorage.setItem('fafi_save_' + window.currentUserId, JSON.stringify(dataToSave));
};

window.loadGameData = async () => {
    if (!window.currentUserId) return;
    
    const savedData = localStorage.getItem('fafi_save_' + window.currentUserId);
    if (savedData) {
        const data = JSON.parse(savedData);
        window.fafiCoins = data.coins !== undefined ? data.coins : 2000;
        window.userInventory = data.inventory || [];
        window.equippedSkins = data.equipped || window.equippedSkins;
        window.purchaseHistory = data.purchases || [];
        window.friendsList = data.friends || [];
        if(data.achievements) window.achievements = data.achievements;
        window.campaignLevel = data.level || 1;
        updateCoinsDisplay();
        if(weaponGroup && currentWeapon) setupWeapon(); 
    }
    updateProfileUI();
};

window.updateProfileUI = () => {
    const histEl = document.getElementById('purchase-history-list');
    histEl.innerHTML = window.purchaseHistory.length === 0 ? "<div class='fafi-list-item'>No hay compras registradas.</div>" : "";
    window.purchaseHistory.slice().reverse().forEach(p => {
        histEl.innerHTML += `<div class="fafi-list-item"><span>Caja ${p.box.toUpperCase()}</span> <span>-${p.cost} Coins</span></div>`;
    });

    const friendsEl = document.getElementById('friends-list');
    friendsEl.innerHTML = window.friendsList.length === 0 ? "<div class='fafi-list-item'>Aún no tienes amigos.</div>" : "";
    window.friendsList.forEach(f => {
        friendsEl.innerHTML += `<div class="fafi-list-item"><span>${f}</span> <span style="color:#4ade80;">Online</span></div>`;
    });

    const achEl = document.getElementById('achievements-list');
    achEl.innerHTML = "";
    window.achievements.forEach(a => {
        const stateClass = a.unlocked ? 'achievement-unlocked' : 'achievement-locked';
        achEl.innerHTML += `<div class="fafi-list-item ${stateClass}"><div><b>${a.name}</b><br><small style="color:#777;">${a.desc}</small></div> <span>${a.unlocked ? '✅' : '🔒'}</span></div>`;
    });
};

window.addFriend = () => {
    const fId = document.getElementById('new-friend-id').value.trim();
    if(fId && !window.friendsList.includes(fId)) {
        window.friendsList.push(fId);
        document.getElementById('new-friend-id').value = "";
        saveGameData(); updateProfileUI();
    }
};

window.unlockAchievement = (id) => {
    const ach = window.achievements.find(a => a.id === id);
    if(ach && !ach.unlocked) { ach.unlocked = true; saveGameData(); updateProfileUI(); }
};

window.updateCoinsDisplay = () => {
    document.getElementById('coins-display-menu').innerText = `FAFI COINS: ${window.fafiCoins}`;
    document.getElementById('coins-display-store').innerText = `FAFI COINS: ${window.fafiCoins}`;
};

window.openStore = () => { document.getElementById('store-ui').style.display = 'block'; document.getElementById('menus').style.display = 'none'; };
window.closeStore = () => { document.getElementById('store-ui').style.display = 'none'; document.getElementById('menus').style.display = 'flex'; };
window.openInventory = () => { renderInventory(); document.getElementById('inventory-ui').style.display = 'block'; document.getElementById('menus').style.display = 'none'; initPreview(); };
window.closeInventory = () => { document.getElementById('inventory-ui').style.display = 'none'; document.getElementById('menus').style.display = 'flex'; };

window.buyBox = (type) => {
    let cost = type === 'basic' ? 200 : (type === 'advanced' ? 500 : 1000);
    if(window.fafiCoins < cost) { alert("¡No tienes suficientes FafiCoins!"); return; }
    window.fafiCoins -= cost; 
    
    window.purchaseHistory.push({ box: type, cost: cost });
    unlockAchievement('rich_boy');
    
    updateCoinsDisplay(); saveGameData(); updateProfileUI();

    let roll = Math.random() * 100;
    let targetRarity = 'comun';
    if(type === 'basic') { targetRarity = roll < 15 ? 'epica' : 'comun'; }
    else if(type === 'advanced') { targetRarity = roll < 20 ? 'legendaria' : (roll < 70 ? 'epica' : 'comun'); }
    else if(type === 'legendary') { targetRarity = roll < 50 ? 'legendaria' : 'epica'; }

    let possibleSkins = skinsDB.filter(s => s.rarity === targetRarity);
    if(possibleSkins.length === 0) possibleSkins = skinsDB;
    let wonSkin = possibleSkins[Math.floor(Math.random() * possibleSkins.length)];
    
    const rouletteContainer = document.getElementById('roulette-container');
    const track = document.getElementById('roulette-track');
    rouletteContainer.style.display = 'block';
    track.style.transition = 'none'; track.style.transform = 'translateX(0)'; track.innerHTML = '';

    const numItems = 45; const winIndex = 38; 
    for(let i=0; i<numItems; i++) {
        let itemSkin = (i === winIndex) ? wonSkin : skinsDB[Math.floor(Math.random() * skinsDB.length)];
        let el = document.createElement('div');
        el.className = `roulette-item rarity-${itemSkin.rarity}`;
        el.innerHTML = `<div>${itemSkin.name}</div><span>${itemSkin.weapon.toUpperCase()}</span>`;
        track.appendChild(el);
    }

    void track.offsetWidth; 
    const itemWidth = 164; 
    const containerWidth = rouletteContainer.clientWidth;
    const randomOffset = (Math.random() - 0.5) * 100; 
    const targetX = -(winIndex * itemWidth) + (containerWidth / 2) - (itemWidth / 2) + randomOffset;

    track.style.transition = 'transform 5s cubic-bezier(0.1, 0.9, 0.2, 1)';
    track.style.transform = `translateX(${targetX}px)`;

    setTimeout(() => {
        rouletteContainer.style.display = 'none';
        let popupTitle = document.getElementById('popup-title');
        let popupDesc = document.getElementById('popup-desc');
        let popupSkinName = document.getElementById('popup-skin-name');

        popupSkinName.innerText = wonSkin.name;
        popupSkinName.className = `rarity-${wonSkin.rarity}`;

        if(window.userInventory.includes(wonSkin.id)) {
            let refund = targetRarity === 'legendaria' ? 400 : (targetRarity === 'epica' ? 150 : 50);
            window.fafiCoins += refund;
            popupTitle.innerText = "¡SKIN DUPLICADA!";
            popupDesc.innerText = `Ya tenías esta skin. Te hemos devuelto ${refund} FafiCoins.`;
            updateCoinsDisplay();
        } else {
            window.userInventory.push(wonSkin.id);
            popupTitle.innerText = "¡NUEVA SKIN DESBLOQUEADA!";
            popupDesc.innerText = `Arma: ${wonSkin.weapon.toUpperCase()} | Rareza: ${wonSkin.rarity.toUpperCase()}`;
        }

        saveGameData();
        document.getElementById('skin-popup').style.display = 'block';
    }, 5500);
};

window.renderInventory = () => {
    const list = document.getElementById('inventory-list');
    list.innerHTML = "";
    if(window.userInventory.length === 0) { list.innerHTML = "<p style='color:#aaa;'>Aún no tienes skins. ¡Ve a la tienda!</p>"; return; }
    window.userInventory.forEach(skinId => {
        const skin = skinsDB.find(s => s.id === skinId);
        const isEquipped = window.equippedSkins[skin.weapon] === skin.id;
        const card = document.createElement('div');
        card.className = 'skin-card';
        card.setAttribute('onmouseenter', `previewSkin('${skin.id}', '${skin.weapon}')`);
        card.innerHTML = `
            <div class="skin-name rarity-${skin.rarity}">${skin.name}</div>
            <div class="skin-weapon">${skin.weapon}</div>
            <button class="btn-equip ${isEquipped ? 'equipped' : ''}" onclick="equipSkin('${skin.id}', '${skin.weapon}')">
                ${isEquipped ? 'EQUIPADO' : 'EQUIPAR'}
            </button>
        `;
        list.appendChild(card);
    });
};

window.equipSkin = (skinId, weaponId) => {
    if(window.equippedSkins[weaponId] === skinId) { window.equippedSkins[weaponId] = null; } 
    else { window.equippedSkins[weaponId] = skinId; }
    saveGameData(); renderInventory();
    if(weaponGroup && currentWeapon === weaponId) setupWeapon();
};

let previewScene, previewCamera, previewRenderer, previewWeaponModel;

function buildPreviewMesh(weaponId, skinId) {
    const group = new THREE.Group();
    let cDark = 0x111111, cDarkGrey = 0x2a2a2a, cMetal = 0x555555, cAccent = 0xff4655, cWood = 0x5c3a21;
    
    if(skinId) {
        const skinData = skinsDB.find(s => s.id === skinId);
        if(skinData && skinData.colors) {
            if(skinData.colors.dark) cDark = skinData.colors.dark;
            if(skinData.colors.body) cDarkGrey = skinData.colors.body;
            if(skinData.colors.metal) cMetal = skinData.colors.metal;
            if(skinData.colors.accent) cAccent = skinData.colors.accent;
            if(skinData.colors.wood) cWood = skinData.colors.wood;
        }
    }

    const matDark = new THREE.MeshStandardMaterial({ color: cDark, roughness: 0.8, metalness: 0.3 });
    const matDarkGrey = new THREE.MeshStandardMaterial({ color: cDarkGrey, roughness: 0.6, metalness: 0.5 });
    const matMetal = new THREE.MeshStandardMaterial({ color: cMetal, roughness: 0.3, metalness: 0.8 });
    const matRedAccent = new THREE.MeshStandardMaterial({ color: cAccent, roughness: 0.4, metalness: 0.3 });
    const matWood = new THREE.MeshStandardMaterial({ color: cWood, roughness: 0.9, metalness: 0.1 });
    const matGlass = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 });
    const matGrenade = new THREE.MeshStandardMaterial({ color: 0x2e3b2c, roughness: 0.8, metalness: 0.5 });

    if(weaponId === 'vandal') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.45), matDarkGrey);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3), matMetal);
        barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.03, -0.35);
        const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05), matDark);
        muzzle.rotation.x = Math.PI/2; muzzle.position.set(0, 0.03, -0.5);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.07), matDark);
        mag.position.set(0, -0.12, -0.05); mag.rotation.x = 0.15;
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.12, 0.045), matDark);
        grip.position.set(0, -0.12, 0.15); grip.rotation.x = 0.25;
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.2), matDarkGrey);
        stock.position.set(0, -0.02, 0.3);
        const holoBase = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.08), matMetal);
        holoBase.position.set(0, 0.08, 0);
        const holoGlass = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.01), matGlass);
        holoGlass.position.set(0, 0.11, 0.03);
        group.add(body, barrel, muzzle, mag, grip, stock, holoBase, holoGlass);
    }
    else if(weaponId === 'ak47') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.35), matMetal);
        const woodStock = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.22), matWood);
        woodStock.position.set(0, -0.03, 0.25); woodStock.rotation.x = -0.05;
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35), matMetal);
        barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.01, -0.35);
        const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), matWood);
        gasTube.rotation.x = Math.PI/2; gasTube.position.set(0, 0.03, -0.22);
        const mag = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 16, Math.PI/3), matDark);
        mag.rotation.y = Math.PI/2; mag.position.set(0, -0.1, -0.15);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.1, 0.04), matWood);
        grip.position.set(0, -0.08, 0.12); grip.rotation.x = 0.2;
        group.add(body, woodStock, barrel, gasTube, mag, grip);
    }
    else if(weaponId === 'sniper') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.65), matDark);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.7), matMetal);
        barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0, -0.6);
        const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.08), matDarkGrey);
        muzzle.position.set(0, 0, -0.95);
        const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35), matMetal);
        scopeBody.rotation.x = Math.PI/2; scopeBody.position.set(0, 0.12, -0.1);
        const bipod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), matMetal);
        bipod.position.set(0, -0.06, -0.3);
        group.add(body, barrel, muzzle, scopeBody, bipod);
    }
    else if(weaponId === 'deagle') {
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.28), matMetal);
        slide.position.set(0, 0.05, -0.05);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.06), matDark);
        grip.position.set(0, -0.02, 0.05); grip.rotation.x = 0.15;
        const underBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.15), matDarkGrey);
        underBarrel.position.set(0, 0.01, -0.1);
        group.add(slide, grip, underBarrel);
    }
    else if(weaponId === 'pistol') {
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 0.2), matDarkGrey);
        slide.position.set(0, 0.05, -0.02);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.1, 0.045), matDark);
        grip.position.set(0, -0.01, 0.04); grip.rotation.x = 0.15;
        group.add(slide, grip);
    }
    else if(weaponId === 'knife') {
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.12, 16), matDark);
        handle.rotation.x = Math.PI / 2; handle.position.z = 0.06;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 16, 32), matMetal);
        ring.position.set(0, 0, 0.14);
        const bladeBase = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.035, 0.08), matMetal); 
        bladeBase.position.set(0, 0.01, -0.02); bladeBase.rotation.x = 0.2;
        const bladeCurve = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.02, 0.12, 3), matMetal);
        bladeCurve.rotation.x = Math.PI / 2; bladeCurve.rotation.y = Math.PI / 2; 
        bladeCurve.position.set(0, -0.02, -0.08); bladeCurve.rotation.x = -0.5;
        group.add(handle, ring, bladeBase, bladeCurve);
    }
    else if(weaponId === 'grenade') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 12), matGrenade);
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.03), matMetal); neck.position.y = 0.07;
        const spoon = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.1, 0.02), matMetal); spoon.position.set(0.025, 0.04, 0); spoon.rotation.z = -0.1;
        const pin = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.003, 8, 16), matRedAccent); pin.position.set(-0.02, 0.08, 0);
        group.add(body, neck, spoon, pin);
    }

    group.scale.set(1.5, 1.5, 1.5);
    return group;
}

window.initPreview = () => {
    const container = document.getElementById('inventory-preview-container');
    if(previewScene) return; 

    previewScene = new THREE.Scene();
    previewCamera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    previewCamera.position.set(0, 0, 1.2);

    previewRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    previewRenderer.setSize(container.clientWidth, container.clientHeight);
    container.insertBefore(previewRenderer.domElement, container.firstChild);

    const light = new THREE.AmbientLight(0xffffff, 0.8);
    previewScene.add(light);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(2, 2, 2);
    previewScene.add(dirLight);

    function animatePrev() {
        requestAnimationFrame(animatePrev);
        if(previewWeaponModel) previewWeaponModel.rotation.y += 0.01; 
        previewRenderer.render(previewScene, previewCamera);
    }

    animatePrev();
};

window.previewSkin = (skinId, weaponId) => {
    if(!previewScene) return;
    if(previewWeaponModel) previewScene.remove(previewWeaponModel);
    
    previewWeaponModel = buildPreviewMesh(weaponId, skinId);
    const box = new THREE.Box3().setFromObject(previewWeaponModel);
    const center = box.getCenter(new THREE.Vector3());
    previewWeaponModel.position.sub(center);
    previewWeaponModel.rotation.x = 0.2;

    previewScene.add(previewWeaponModel);

    const skin = skinsDB.find(s => s.id === skinId);
    const nameEl = document.getElementById('preview-name');
    if(skin) { nameEl.innerText = skin.name; nameEl.className = `rarity-${skin.rarity}`; }
};

let scene, camera, renderer, weaponGroup;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, isSprinting = false;
let canJump = true, isReloading = false, isAiming = false, isStabbing = false, isThrowing = false;
let isInspecting = false, inspectTime = 0;
let velocity = new THREE.Vector3(), direction = new THREE.Vector3(), obstacles = [];
let stamina = 100, health = 100, ammo = 30;
let stabAnimProgress = 0, throwAnimProgress = 0;
let sensitivity = 0.0018;
let adsMultiplier = 0.4;
let lastTime = performance.now();
let lastShootTime = 0;
let gameMode = 'online';
let aimTargets = [];
let damageShake = 0;
let isInGameMenuOpen = false;

const weaponStats = {
    'vandal':  { ammo: 25, head: 85, body: 40, spread: 0.01, recoil: 0.015, fireRate: 120 },
    'ak47':    { ammo: 30, head: 100, body: 25, spread: 0.015, recoil: 0.02, fireRate: 100 },
    'deagle':  { ammo: 7,  head: 90, body: 40, spread: 0.005, recoil: 0.04, fireRate: 400 },
    'sniper':  { ammo: 5, head: 100, body: 80, spread: 0.001, recoil: 0.08, fireRate: 1500 },
    'pistol':  { ammo: 12, head: 45, body: 20, spread: 0.005, recoil: 0.01, fireRate: 200 },
    'knife':   { ammo: 0,  head: 40, body: 40, spread: 0, recoil: 0, fireRate: 500 },
    'grenade': { ammo: 1, head: 0, body: 0, spread: 0, recoil: 0, fireRate: 1000 }
};

const maxAmmo = { 'vandal': 25, 'ak47': 30, 'deagle': 7, 'sniper': 5, 'pistol': 12, 'knife': 0, 'grenade': 1 };
const bullets = [];
let currentWeapon = 'vandal';
let autoShootInterval = null;
let isWeaponMenuOpen = false;
let peer; let connections = {}; let remotePlayers = {};

window.updateSensDisplay = (val) => { document.getElementById('sens-val').innerText = val; sensitivity = (val / 5) * 0.0018; };
window.copyMyID = () => {
    const idText = document.getElementById('my-id').innerText;
    if(idText.includes("CARGANDO")) return;
    navigator.clipboard.writeText(idText); alert("ID Copiado: " + idText);
};

window.startPractice = (mapType) => {
    document.getElementById('net-status').innerText = `MODO: PRÁCTICA (${mapType.toUpperCase()})`;
    unlockAchievement('first_blood');
    gameMode = 'aim'; startGameNetwork();
};

window.openCampaignMap = () => {
    document.getElementById('menus').style.display = 'none';
    document.getElementById('campaign-map-overlay').style.display = 'flex';
    
    const mapContainer = document.getElementById('map-nodes-container');
    mapContainer.innerHTML = "";
    const totalLevels = 5;

    for(let i = 1; i <= totalLevels; i++) {
        const isUnlocked = i <= window.campaignLevel;
        const isClickable = i <= window.campaignLevel;
        
        const node = document.createElement('div');
        node.className = `map-node ${isUnlocked ? 'unlocked' : 'locked'}`;
        node.innerText = i;
        if(isClickable) {
            node.onclick = () => window.startCampaignLevel(i);
        }

        mapContainer.appendChild(node);
        
        if(i < totalLevels) {
            const line = document.createElement('div');
            line.className = `map-line ${i < window.campaignLevel ? 'unlocked' : ''}`;
            mapContainer.appendChild(line);
        }
    }
};

window.closeCampaignMap = () => {
    document.getElementById('campaign-map-overlay').style.display = 'none';
    document.getElementById('menus').style.display = 'flex';
};

window.startCampaignLevel = (level) => {
    document.getElementById('campaign-map-overlay').style.display = 'none';
    document.getElementById('net-status').innerText = `MODO: CAMPAÑA WWII (NIVEL ${level})`;
    unlockAchievement('first_blood');
    gameMode = 'campaign'; 
    startGameNetwork();
};

window.selectWeaponFromMenu = (slot) => { changeWeapon(slot); toggleWeaponMenu(); };

window.toggleInGameMenu = () => {
    isInGameMenuOpen = !isInGameMenuOpen;
    const menu = document.getElementById('ingame-menu');
    if (isInGameMenuOpen) { menu.style.display = "flex"; document.exitPointerLock(); } 
    else { menu.style.display = "none"; document.body.requestPointerLock(); }
};

window.showControls = () => { alert(" CONTROLES BÁSICOS \n\n• Moverse: W, A, S, D\n• Saltar: Espacio\n• Correr: Shift Izquierdo\n• Disparar: Clic Izquierdo\n• Apuntar (Sniper): Clic Derecho\n• Recargar: R\n• Inspeccionar Arma: F\n• Tienda en Partida: B\n• Cambiar Arma: Teclas 1 al 7\n• Menú de Pausa: 0"); };
window.returnToMainMenu = () => { location.reload(); };

function broadcast(data) { for(let id in connections) { if(connections[id] && connections[id].open) connections[id].send(data); } }

function initNetwork() {
    peer = new Peer();
    peer.on('open', (id) => { document.getElementById('my-id').innerText = id; });
    peer.on('error', (err) => { console.error("PeerJS Error:", err); document.getElementById('my-id').innerText = "ERROR DE RED"; });
    peer.on('connection', (c) => {
        for(let id in connections) { if(connections[id].open) connections[id].send({type: 'new_peer', peerId: c.peer}); }
        const existingPeers = Object.keys(connections);
        if(existingPeers.length > 0) { c.on('open', () => { c.send({type: 'existing_peers', peers: existingPeers}); }); }
        connections[c.peer] = c; setupDataListener(c);
        if(gameMode !== 'online') { gameMode = 'online'; startGameNetwork(); unlockAchievement('first_blood'); } else { createRemotePlayer(c.peer); }
    });
    document.getElementById('start-btn').onclick = () => {
        const joinId = document.getElementById('join-id').value;
        if(joinId) { unlockAchievement('first_blood'); gameMode = 'online'; const c = peer.connect(joinId); connections[c.peer] = c; setupDataListener(c); startGameNetwork(); } 
        else { alert("Por favor ingresa un ID de la sala/host"); }
    };
}

function setupDataListener(c) {
    c.on('open', () => {
        document.getElementById('net-status').innerText = `EN SALA (${Object.keys(connections).length} JUGADORES)`;
        createRemotePlayer(c.peer); c.send({type: 'init-request'});
    });
    c.on('data', (data) => {
        if (data.type === 'new_peer') { if(data.peerId !== peer.id && !connections[data.peerId]) { const newC = peer.connect(data.peerId); connections[newC.peer] = newC; setupDataListener(newC); } }
        if (data.type === 'existing_peers') { data.peers.forEach(pid => { if(pid !== peer.id && !connections[pid]) { const newC = peer.connect(pid); connections[newC.peer] = newC; setupDataListener(newC); } }); }
        if (data.type === 'init-request') { createRemotePlayer(c.peer); c.send({type: 'init-confirm'}); }
        if (data.type === 'init-confirm') createRemotePlayer(c.peer);

        if (data.type === 'move' && remotePlayers[c.peer]) {
            let rp = remotePlayers[c.peer];
            let newPos = new THREE.Vector3(data.pos.x, data.pos.y, data.pos.z);
            rp.userData.isMoving = rp.userData.lastPos.distanceTo(newPos) > 0.02; rp.userData.lastPos.copy(newPos); rp.userData.isSprinting = data.sprint; rp.position.copy(newPos); rp.rotation.y = data.rot;
            if (data.weapon === 'knife') rp.userData.weaponMesh.scale.set(1, 1, 0.3); else if (data.weapon === 'pistol' || data.weapon === 'deagle') rp.userData.weaponMesh.scale.set(0.8, 1, 0.5); else rp.userData.weaponMesh.scale.set(1, 1, 1);
        }
        if (data.type === 'shoot') {
            const bulletColor = data.weapon === 'grenade' ? 0xffffff : 0xff0000;
            spawnBullet(new THREE.Vector3(data.pos.x, data.pos.y, data.pos.z), new THREE.Vector3(data.dir.x, data.dir.y, data.dir.z), bulletColor, data.weapon === 'grenade', true, data.weapon);
        }
        if (data.type === 'damage') {
            health -= data.amount; damageShake = 0.4;
            if(health <= 0) { health = 100; camera.position.set((Math.random() - 0.5) * 40, 1.6, (Math.random() - 0.5) * 40); }
            document.getElementById('hp-fill').style.width = health + "%";
        }
        if (data.type === 'flash_event') triggerFlash();
    });
    c.on('close', () => {
        if(remotePlayers[c.peer]) { scene.remove(remotePlayers[c.peer]); delete remotePlayers[c.peer]; }
        delete connections[c.peer]; document.getElementById('net-status').innerText = `EN SALA (${Object.keys(connections).length} JUGADORES)`;
    });
}

function startGameNetwork() { document.getElementById('menus').style.display = "none"; document.getElementById('hud').style.display = "block"; document.body.requestPointerLock(); init(); }

function init() {
    if (scene) return;
    scene = new THREE.Scene(); 
    scene.background = new THREE.Color(0x050a0f); scene.fog = new THREE.Fog(0x050a0f, 0, 100);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); camera.rotation.order = 'YXZ'; camera.position.set(0, 1.6, 5); scene.add(camera);
    const ambient = new THREE.AmbientLight(0xffffff, 0.6); scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(10, 20, 10); scene.add(sun);

    if (gameMode === 'campaign') {
        scene.background = new THREE.Color(0x3a4033); 
        scene.fog = new THREE.Fog(0x3a4033, 5, 50);
        setupCampaignLevel();
        camera.position.set(0, 1.6, 10);
    } else if (gameMode === 'aim') {
        scene.background = new THREE.Color(0x1a1a24); scene.fog = new THREE.Fog(0x1a1a24, 0, 80);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 1.0 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
        const wall = new THREE.Mesh(new THREE.BoxGeometry(60, 30, 2), new THREE.MeshStandardMaterial({ color: 0x222230, roughness: 1.0 })); wall.position.set(0, 15, -20); scene.add(wall); obstacles.push(wall);
        const targetGeo = new THREE.SphereGeometry(0.8, 16, 16); const targetMat = new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0x550011 });
        for(let i=0; i<5; i++) { let t = new THREE.Mesh(targetGeo, targetMat); t.position.set((Math.random() - 0.5) * 30, 2 + Math.random() * 8, -19); scene.add(t); aimTargets.push(t); }
        camera.position.set(0, 1.6, 5);
    } else {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.2 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
        for(let i=0; i<30; i++) { const box = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 4), new THREE.MeshStandardMaterial({ color: 0x1a252e, roughness: 0.6, metalness: 0.4 })); box.position.set(Math.sin(i)*50, 4, Math.cos(i)*50); scene.add(box); obstacles.push(box); }
    }

    renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(window.innerWidth, window.innerHeight); document.body.appendChild(renderer.domElement);
    setupWeapon(); setupControls(); animate();
    window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
}

function setupCampaignLevel() {
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x4a3c2c, roughness: 1.0 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), floorMat); 
    floor.rotation.x = -Math.PI / 2; 
    scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2e2b26 });
    for(let i=0; i<25; i++) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 1.5), wallMat);
        wall.position.set((Math.random() - 0.5) * 80, 1.25, (Math.random() - 0.5) * 80 - 10);
        scene.add(wall);
        obstacles.push(wall);
    }

    for(let i=0; i<5 + window.campaignLevel * 2; i++) {
        spawnEnemyBot((Math.random() - 0.5) * 60, -20 - Math.random() * 40);
    }
}

function spawnEnemyBot(x, z) {
    const botGroup = new THREE.Group();
    const matUniform = new THREE.MeshStandardMaterial({ color: 0x4d5448 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.4), matUniform);
    body.position.y = 0.6;
    
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xffccaa });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), matSkin);
    head.position.y = 1.4;
    
    botGroup.add(body, head);
    botGroup.position.set(x, 0, z);
    scene.add(botGroup);

    enemyBots.push({
        mesh: botGroup,
        health: 100,
        lastShot: performance.now() + Math.random() * 2000
    });
}

function createRemotePlayer(id) {
    if (remotePlayers[id] || !scene) return;
    const rp = new THREE.Group();
    const colors = [0xff4655, 0x00ccff, 0x00ffcc, 0xffcc00, 0xcc00ff, 0xffffff]; const pColor = colors[Object.keys(remotePlayers).length % colors.length];
    const mat = new THREE.MeshStandardMaterial({ color: pColor, roughness: 0.5 }); const headMat = new THREE.MeshStandardMaterial({ color: 0xffe0c2, roughness: 0.5 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), headMat); head.position.y = 0;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x000 })); visor.position.set(0, 0.05, -0.18); head.add(visor); rp.add(head);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), mat); torso.position.y = -0.55; rp.add(torso);

    function createLimb(w, h, d, yOffset) { const group = new THREE.Group(); const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mesh.position.y = yOffset; group.add(mesh); return group; }
    const leftLeg = createLimb(0.2, 0.7, 0.2, -0.35); leftLeg.position.set(-0.15, -0.9, 0); rp.add(leftLeg);
    const rightLeg = createLimb(0.2, 0.7, 0.2, -0.35); rightLeg.position.set(0.15, -0.9, 0); rp.add(rightLeg);
    const leftArm = createLimb(0.15, 0.7, 0.15, -0.35); leftArm.position.set(-0.35, -0.25, 0); rp.add(leftArm);
    const rightArm = createLimb(0.15, 0.7, 0.15, -0.35); rightArm.position.set(0.35, -0.25, 0); rp.add(rightArm);
    const weaponMat = new THREE.MeshStandardMaterial({color: 0x333333}); const weaponMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.6), weaponMat); weaponMesh.position.set(0, -0.4, -0.2); rightArm.add(weaponMesh);

    rp.userData = { leftLeg, rightLeg, leftArm, rightArm, weaponMesh, walkTime: 0, isMoving: false, isSSprint: false, lastPos: new THREE.Vector3() }; remotePlayers[id] = rp; scene.add(rp);
}