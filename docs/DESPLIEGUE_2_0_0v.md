# Despliegue de FAFI 1.6 en el servidor

El repositorio ya trae la base de datos **sin jugadores**: `database/Fafi_1_6.sql` crea las tablas y los seeds de `database/php-backend/database/` cargan solo el catalogo (tienda, skins, logros). Al levantar el servidor por primera vez la base queda en cero.

## Pasos
1. Copiar `.env.docker` a `.env` y poner contrasenas propias (`DB_ROOT_PASSWORD`, `DB_PASSWORD`, secreto JWT de 32+ caracteres).
2. `docker compose up -d --build` con el `docker-compose.yml`, el `Dockerfile` y los archivos de `database/php-backend/docker/` de la raiz del repo (son los mismos que ya estan en la rama `main`; no se creo ninguna estructura nueva). Levanta `app` (nginx + PHP-FPM + websocket por supervisord, puerto 80), `db` (MySQL 8, carga `Fafi_1_6.sql` y `seed_mysql.sql` solo la primera vez) y `redis`.
3. Abrir la direccion del servidor. El juego usa la misma direccion para `/api` y `/game` (ver `game-client/js/config_2_0_0v.js`), no hay que editar URLs.
4. Registrar la primera cuenta desde el juego: empieza con 400 Fafi Coins.

## Dejar la base en cero de nuevo
- Con Docker: `docker compose down -v && docker compose up -d --build` (borra el volumen de MySQL).
- Sin borrar el volumen: `mysql -u root -p fafi_1_6 < database/reset_desde_cero_2_0_0v.sql` (vacia usuarios y progreso, conserva el catalogo). Hacer backup antes.

## Antes de publicar
- Usar HTTPS (el juego cambia solo a `wss://`).
- `APP_DEBUG=false` y contrasenas reales en `.env`.
- El juego bloquea F12 siempre y, fuera de `?dev=1`, tambien clic derecho y los atajos de herramientas. Es solo disuasion: la seguridad real es validar en el servidor.
- Pendiente conocido: el progreso del Fafi Pass y el codigo oculto de coins viven en el navegador; para que no se puedan manipular hay que moverlos al servidor.
- El Fafi Pass Premium de pago esta solo en la interfaz, sin cobro.
- El multijugador en linea todavia no tiene netcode (solo salas, votos e invitaciones).
