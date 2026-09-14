window.FAFI_CONFIG = {
    // Se usa la misma URL desde donde se sirve el juego.
    // API y WebSocket se sirven por el mismo nginx (ver docker/nginx-site.conf),
    // asi funciona en cualquier IP/puerto sin editar nada.
    apiBaseUrl: (function () {
        var proto = window.location.protocol;
        var host = window.location.host;
        return proto + '//' + host + '/api';
    })(),
    wsUrl: (function () {
        var wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        var host = window.location.host;
        return wsProto + '://' + host + '/game';
    })(),
    // Para desarrollo local con el stack docker o un nginx local:
    // apiBaseUrl: 'http://localhost:3000/api',
    // wsUrl: 'ws://localhost:8080/game'
};