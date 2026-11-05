class ApiService {
    constructor(auth) {
        this.auth = auth;
    }

    async request(endpoint, options = {}) {
        return this.auth.request(endpoint, options);
    }

    // ========== INVENTARIO ==========
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

    // ========== SOCIAL ==========
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

    // ========== JUEGO ==========
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