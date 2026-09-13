class GameNetwork {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.callbacks = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.pingInterval = null;
    }

    connect(token) {
        return new Promise((resolve, reject) => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                resolve();
                return;
            }

            const url = `${FAFI_CONFIG.wsUrl}?token=${encodeURIComponent(token)}`;
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('[WS] Conectado al servidor de juego');
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
                this.startPing();
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (err) {
                    console.error('[WS] Error parseando mensaje:', err);
                }
            };

            this.ws.onclose = (event) => {
                console.log('[WS] Desconectado:', event.code, event.reason);
                this.stopPing();
                this.attemptReconnect(token);
            };

            this.ws.onerror = (error) => {
                console.error('[WS] Error:', error);
                if (this.ws.readyState === WebSocket.CONNECTING) {
                    reject(new Error('No se pudo conectar al servidor de juego'));
                }
            };
        });
    }

    attemptReconnect(token) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[WS] Máximos intentos de reconexión alcanzados');
            this.emit('max_reconnect_failed');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
        console.log(`[WS] Reconectando en ${delay}ms... (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => this.connect(token).catch(() => {}), delay);
    }

    startPing() {
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.send('ping', { timestamp: Date.now() });
            }
        }, 25000);
    }

    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    handleMessage(data) {
        const callback = this.callbacks[data.type];
        if (callback) {
            try {
                callback(data);
            } catch (err) {
                console.error(`[WS] Error en callback ${data.type}:`, err);
            }
        }
    }

    on(type, callback) {
        this.callbacks[type] = callback;
    }

    off(type) {
        delete this.callbacks[type];
    }

    emit(type, data) {
        const callback = this.callbacks[type];
        if (callback) callback(data);
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
        this.send('chat', { text: message.substring(0, 200) });
    }

    disconnect() {
        this.stopPing();
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.roomId = null;
    }

    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

window.gameNetwork = new GameNetwork();