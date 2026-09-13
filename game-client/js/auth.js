class AuthService {
    constructor() {
        this.token = localStorage.getItem('fafi_token');
        this.user = JSON.parse(localStorage.getItem('fafi_user') || 'null');
        this.refreshPromise = null;
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${FAFI_CONFIG.apiBaseUrl}${endpoint}`, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 && !options._retry) {
                    const refreshed = await this.refreshToken();
                    if (refreshed) {
                        return this.request(endpoint, { ...options, _retry: true });
                    }
                }
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (err) {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                throw new Error('No se puede conectar al servidor. Verifica tu conexión.');
            }
            throw err;
        }
    }

    async refreshToken() {
        if (this.refreshPromise) return this.refreshPromise;

        this.refreshPromise = (async () => {
            try {
                const data = await this.request('/auth/me', { _retry: true });
                this.user = data.user;
                localStorage.setItem('fafi_user', JSON.stringify(this.user));
                return true;
            } catch (err) {
                this.logout();
                return false;
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
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

    async updatePassword(currentPassword, newPassword) {
        return this.request('/auth/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
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