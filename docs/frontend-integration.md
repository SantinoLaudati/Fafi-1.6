# Fafi-1.6 Frontend Integration Guide
## Connecting game-client to PHP Backend

This guide explains how to modify the existing `game-client` to use the new PHP backend instead of localStorage and PeerJS.

---

## 1. Configuration

Create a config file in your game-client:

```javascript
// game-client/js/config.js
window.FAFI_CONFIG = {
    apiBaseUrl: 'https://your-domain.com/api',
    wsUrl: 'wss://your-domain.com/game',
    // For local development:
    // apiBaseUrl: 'http://localhost:3000/api',
    // wsUrl: 'ws://localhost:8080/game'
};
```

---

## 2. Authentication Module

Replace the login/register logic in `main.js`:

```javascript
// game-client/js/auth.js
class AuthService {
    constructor() {
        this.token = localStorage.getItem('fafi_token');
        this.user = JSON.parse(localStorage.getItem('fafi_user') || 'null');
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${FAFI_CONFIG.apiBaseUrl}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                this.logout();
                window.location.reload();
            }
            throw new Error(data.error || 'Request failed');
        }

        return data;
    }

    async login(username, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        this.setAuth(data.token, data.user);
        return data;
    }

    async register(username, email, password) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
        this.setAuth(data.token, data.user);
        return data;
    }

    async getProfile() {
        const data = await this.request('/auth/me');
        this.user = data.user;
        localStorage.setItem('fafi_user', JSON.stringify(this.user));
        return data;
    }

    setAuth(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('fafi_token', token);
        localStorage.setItem('fafi_user', JSON.stringify(user));
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('fafi_token');
        localStorage.removeItem('fafi_user');
    }

    isAuthenticated() {
        return !!this.token;
    }

    getAuthHeaders() {
        return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
    }
}

window.authService = new AuthService();
```

---

## 3. API Service

Create a unified API service:

```javascript
// game-client/js/api.js
class ApiService {
    constructor(auth) {
        this.auth = auth;
    }

    async request(endpoint, options = {}) {
        return this.auth.request(endpoint, options);
    }

    // Inventory
    async getInventory() {
        return this.request('/inventory');
    }

    async getEquipped() {
        return this.request('/inventory/equipped');
    }

    async equipSkin(articuloId, armaBase) {
        return this.request('/inventory/equip', {
            method: 'POST',
            body: JSON.stringify({ articulo_id: articuloId, arma_base: armaBase })
        });
    }

    async getStore() {
        return this.request('/inventory/store');
    }

    async getCoins() {
        return this.request('/inventory/coins');
    }

    async purchaseBox(articuloId) {
        return this.request('/inventory/store/purchase', {
            method: 'POST',
            body: JSON.stringify({ articulo_id: articuloId })
        });
    }

    async getPurchaseHistory() {
        return this.request('/inventory/history/purchases');
    }

    // Social
    async getFriends() {
        return this.request('/social/friends');
    }

    async addFriend(username) {
        return this.request('/social/friends', {
            method: 'POST',
            body: JSON.stringify({ username })
        });
    }

    async acceptFriend(friendId) {
        return this.request(`/social/friends/${friendId}/accept`, {
            method: 'PUT'
        });
    }

    async removeFriend(friendId) {
        return this.request(`/social/friends/${friendId}`, {
            method: 'DELETE'
        });
    }

    async blockUser(friendId) {
        return this.request(`/social/friends/${friendId}/block`, {
            method: 'PUT'
        });
    }

    async getAchievements() {
        return this.request('/social/achievements');
    }

    async searchUsers(query) {
        return this.request(`/social/search?q=${encodeURIComponent(query)}`);
    }

    // Game
    async getCampaignProgress() {
        return this.request('/game/campaign');
    }

    async completeCampaignLevel(nivel, dificultad = 'normal') {
        return this.request('/game/campaign/complete', {
            method: 'POST',
            body: JSON.stringify({ nivel, dificultad })
        });
    }

    async getStats() {
        return this.request('/game/stats');
    }

    async updateStats(stats) {
        return this.request('/game/stats/update', {
            method: 'POST',
            body: JSON.stringify(stats)
        });
    }

    async getLeaderboard(type = 'kills', limit = 50) {
        return this.request(`/game/leaderboard?type=${type}&limit=${limit}`);
    }

    async getMatchHistory(limit = 20) {
        return this.request(`/game/matches?limit=${limit}`);
    }

    async saveMatch(matchData) {
        return this.request('/game/matches', {
            method: 'POST',
            body: JSON.stringify(matchData)
        });
    }

    async getConfig() {
        return this.request('/game/config');
    }

    async updateConfig(config) {
        return this.request('/game/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    }
}

window.apiService = new ApiService(window.authService);
```

---

## 4. WebSocket Game Client

Replace PeerJS with native WebSocket:

```javascript
// game-client/js/network.js
class GameNetwork {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.callbacks = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    connect(token) {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(`${FAFI_CONFIG.wsUrl}?token=${token}`);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                resolve();
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                this.attemptReconnect(token);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
        });
    }

    attemptReconnect(token) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);

        setTimeout(() => this.connect(token), delay);
    }

    handleMessage(data) {
        const callback = this.callbacks[data.type];
        if (callback) {
            callback(data);
        }
    }

    on(type, callback) {
        this.callbacks[type] = callback;
    }

    off(type) {
        delete this.callbacks[type];
    }

    send(type, data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, ...data }));
        }
    }

    joinRoom(roomId, mode = 'deathmatch') {
        this.roomId = roomId;
        this.send('join_room', { roomId, mode });
    }

    leaveRoom() {
        this.send('leave_room');
        this.roomId = null;
    }

    updatePlayer(data) {
        this.send('player_update', data);
    }

    shoot(data) {
        this.send('shoot', data);
    }

    damage(data) {
        this.send('damage', data);
    }

    chat(message) {
        this.send('chat', { text: message });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
    }
}

window.gameNetwork = new GameNetwork();
```

---

## 5. Integration in main.js

Update your main.js to use the new services:

```javascript
// In main.js - replace existing auth logic

async function handleLogin() {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    
    if (user.length < 3) { alert("Usuario inválido."); return; }

    try {
        await authService.login(user, pass);
        finalizeAuth(user);
    } catch (err) {
        alert(err.message);
    }
}

async function handleRegister() {
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const email = document.getElementById('reg-email')?.value.trim() || `${user}@fafi.local`;
    
    if (user.length < 3) { alert("El usuario debe tener al menos 3 caracteres."); return; }

    try {
        await authService.register(user, email, pass);
        finalizeAuth(user);
    } catch (err) {
        alert(err.message);
    }
}

async function finalizeAuth(username) {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('menus').style.display = 'flex';
    document.getElementById('player-name').innerText = username;
    
    // Load user data from API
    await loadGameDataFromAPI();
    
    // Connect WebSocket
    await gameNetwork.connect(authService.token);
    
    // Set up WebSocket handlers
    setupGameNetworkHandlers();
}

async function loadGameDataFromAPI() {
    try {
        // Load inventory, coins, equipped skins, etc.
        const [inventory, coins, equipped, achievements, friends] = await Promise.all([
            apiService.getInventory(),
            apiService.getCoins(),
            apiService.getEquipped(),
            apiService.getAchievements(),
            apiService.getFriends()
        ]);
        
        // Update local state
        window.userInventory = inventory.inventory.map(item => item.articulo_id);
        window.fafiCoins = coins.coins;
        window.equippedSkins = equipped.equipped_skins || {};
        window.achievements = achievements.achievements;
        window.friendsList = friends.friends.filter(f => f.estado === 'aceptada').map(f => f.username);
        
        updateCoinsDisplay();
        updateProfileUI();
        
        if (weaponGroup && currentWeapon) setupWeapon();
    } catch (err) {
        console.error('Failed to load game data:', err);
    }
}

function setupGameNetworkHandlers() {
    gameNetwork.on('welcome', (data) => {
        console.log('Welcome to game server:', data);
    });

    gameNetwork.on('room_state', (data) => {
        // Initialize game with room data
        startGameNetwork(data);
    });

    gameNetwork.on('player_joined', (data) => {
        createRemotePlayer(data.player);
    });

    gameNetwork.on('player_left', (data) => {
        if (remotePlayers[data.playerId]) {
            scene.remove(remotePlayers[data.playerId]);
            delete remotePlayers[data.playerId];
        }
    });

    gameNetwork.on('player_update', (data) => {
        updateRemotePlayer(data);
    });

    gameNetwork.on('player_shoot', (data) => {
        handleRemoteShoot(data);
    });

    gameNetwork.on('player_damage', (data) => {
        handleRemoteDamage(data);
    });

    gameNetwork.on('player_killed', (data) => {
        handleRemoteKill(data);
    });

    gameNetwork.on('player_respawned', (data) => {
        handleRemoteRespawn(data);
    });

    gameNetwork.on('chat', (data) => {
        showChatMessage(data.username, data.message);
    });
}
```

---

## 6. Save/Load Replacement

Replace localStorage save/load with API calls:

```javascript
// Replace window.saveGameData
window.saveGameData = async () => {
    if (!authService.isAuthenticated()) return;
    
    try {
        const prefs = {
            equipped_skins: window.equippedSkins,
            // ... other preferences
        };
        
        await apiService.updateConfig({
            preferencias_ui: prefs
        });
        
        // Also save inventory/coins if changed
        // The backend handles this via purchase/equip endpoints
    } catch (err) {
        console.error('Failed to save game data:', err);
    }
};

// Replace window.loadGameData
window.loadGameData = async () => {
    if (!authService.isAuthenticated()) return;
    await loadGameDataFromAPI();
};
```

---

## 7. Match Saving

After a match ends, save results:

```javascript
async function saveMatchResults(results) {
    try {
        await apiService.saveMatch({
            mapa: currentMap,
            modo_juego: gameMode,
            duracion_segundos: matchDuration,
            equipo_ganador: winningTeam,
            equipo: playerTeam,
            bajas: playerKills,
            muertes: playerDeaths,
            asistencias: playerAssists,
            dano_infligido: playerDamage,
            precision: playerAccuracy
        });
    } catch (err) {
        console.error('Failed to save match:', err);
    }
}
```

---

## 8. HTML Updates

Add the new scripts to your index.html:

```html
<!-- Add before main.js -->
<script src="js/config.js"></script>
<script src="js/auth.js"></script>
<script src="js/api.js"></script>
<script src="js/network.js"></script>
<script src="js/main.js"></script>
```

---

## 9. Deployment Checklist

- [ ] Update `FAFI_CONFIG` with your domain
- [ ] Enable HTTPS on your server (required for WebSocket secure)
- [ ] Configure CORS in PHP backend for your domain
- [ ] Test login/register flow
- [ ] Test inventory/store functionality
- [ ] Test WebSocket multiplayer
- [ ] Test campaign progress saving
- [ ] Test leaderboards
- [ ] Verify all API endpoints work
- [ ] Set up SSL certificates (Let's Encrypt recommended)
- [ ] Configure firewall for ports 80, 443, 8080
- [ ] Set up monitoring and logs

---

## 10. Local Development

For local development without Docker:

1. Start MySQL and create database
2. Import schema and seed data
3. Copy `.env.example` to `.env` and configure
4. Run `composer install` in php-backend
5. Start PHP server: `php -S localhost:3000 -t php-backend/api`
6. Start WebSocket: `php php-backend/websocket/server.php`
7. Serve game-client with any static server (e.g., `npx serve game-client`)
8. Update `FAFI_CONFIG` to use `http://localhost:3000/api` and `ws://localhost:8080/game`