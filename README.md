# Fafi-1.6
Fafi-1.6

> Un FPS táctico multijugador desarrollado en HTML, inspirado en la precisión competitiva de Valorant y Counter‑Strike, combinado con una estética arcade y cartoon moderna.




---

Descripción

Fafi-1.6 es un videojuego FPS (First Person Shooter) desarrollado para navegador utilizando tecnologías web modernas. El juego combina mecánicas tácticas de disparo con una estética visual colorida y caricaturesca.

El objetivo principal es ofrecer una experiencia rápida, competitiva y accesible directamente desde el navegador, sin necesidad de instalación.


---

Características

Combate FPS táctico por equipos

Estilo visual arcade/cartoon

Juego optimizado para navegador

Partidas rápidas y dinámicas

Sistema de puntería competitivo

Personajes con habilidades únicas

Mapas diseñados para juego estratégico

Sonidos inmersivos y efectos arcade

Sistema de rondas estilo competitivo

Ranking y estadísticas



---

Gameplay

El juego se basa en enfrentamientos por equipos donde los jugadores deben:

1. Elegir un personaje.


2. Ingresar a una partida online.


3. Coordinar estrategias con el equipo.


4. Completar objetivos del mapa.


5. Eliminar enemigos para ganar rondas.



Modos de Juego

Team Deathmatch — Eliminación por equipos.

Bomb Mode — Colocar o desactivar objetivos.


---

Estilo Visual

El apartado artístico utiliza una combinación entre:

Diseño cartoon low-poly

Colores vibrantes

Efectos arcade

Animaciones suaves

Interfaces modernas tipo eSports


Inspirado visualmente en juegos como:

Valorant

Counter-Strike

Team Fortress 2

Overwatch



---

Tecnologías Utilizadas

Tecnología	Uso

Base del juego	HTML5 + Three.js
Backend y servidor	PHP 8 + MySQL
WebSocket multijugador	PHP Ratchet
Estilo de la pagina	CSS


---

Estructura del Proyecto

    database/php-backend/   Backend PHP (API REST + WebSocket Ratchet)
        api/                Endpoints de auth, inventario, social y juego
        websocket/          Servidor de partidas WebSocket
        config/             Configuración de DB y JWT
        database/           Esquema MySQL y datos iniciales (schema/seed)
        docker/             Nginx, PHP y supervisor del contenedor
    game-client/            Juego (frontend estático HTML/CSS/JS + Three.js)
    dev-website/            Sitio del equipo (frontend estático)
    docker-compose.yml      Stack de producción (PHP-FPM + Nginx + MySQL + Redis)
    deploy.sh               Script de despliegue

---

Instalación (desarrollo)

1. Clonar el repositorio: git clone <repo>
2. Instalar dependencias PHP:
   cd database/php-backend
   composer install
3. Crear la base de datos MySQL (importar database/Fafi_1_6.sql y
   database/php-backend/database/seed_mysql.sql) o usar Docker: docker compose up -d db
4. Configurar variables de entorno:
   - Para el stack Docker: copiar `.env.docker` a `.env` en la raíz y
     ajustar valores (DB_ROOT_PASSWORD, DB_PASSWORD, JWT_SECRET, DOMAIN).
   - Para backend sin Docker: copiar database/php-backend/.env.example
     a database/php-backend/.env y ajustar credenciales.
5. Levantar el backend:
   docker compose up --build
6. Verificar: http://localhost/health
7. Abrir el juego en la misma URL raíz (lo sirve el nginx del contenedor):
   http://localhost/   (y dev-website en /dev-website/)
   El frontend usa la misma URL de donde se sirve (apiBaseUrl y wsUrl se
   derivan de la página), así que no hay que editar game-client/js/config.js.

Para desarrollo local rápido (sin Docker):
   php -S localhost:3000 -t database/php-backend/api
   php database/php-backend/websocket/server.php   # WebSocket en puerto 8080
   (ojo: el servidor integrado de PHP no expone /api; para probar la API
   conviene usar el stack Docker o nginx con la configuración del repo)

---

Despliegue (producción)

Requisitos: Docker y Docker Compose en el servidor.

1. Copiar el proyecto al servidor (por ejemplo /var/www/fafi-1.6) y crear
   el archivo .env en la raíz a partir de .env.docker:
   cp .env.docker .env
   Ajustar DB_PASSWORD, JWT_SECRET y DOMAIN.
   (para una demo escolar, DOMAIN = IP o hostname del servidor)
2. Levantar el stack:
   docker compose up -d --build
   (Los scripts database/Fafi_1_6.sql y seed_mysql.sql se importan automáticamente
   en la primera creación de la base de datos.)
3. Verificar: http://<IP>/health
4. El nginx del contenedor ya sirve: API (/api), WebSocket (/game), el juego
   (/) y dev-website (/dev-website/). No requiere más configuración.
   La DB y Redis quedan internos en la red Docker (puerto 80 expuesto).

Demo escolar (2 horas): repetir los pasos 1-2 con la IP del servidor de la
escuela; los jugadores entran a http://<IP>/ desde la misma red.

Alternativa: script de despliegue ./deploy.sh (rama master, requiere root;
hace backup, git pull, composer install y levanta el stack).

---

Controles

Acción	Tecla

Moverse	WASD
Saltar	Espacio
Disparar	Click Izquierdo
Apuntar	Click Derecho
Recargar	R
Agacharse	Ctrl
Correr	Shift
Cambiar Arma	Scroll Mouse 

---

---

Cómo jugar en local (Windows)

Doble clic en `iniciar-juego.bat` (levanta `servidor.ps1` y abre el navegador en http://localhost:5173).
No hace falta Python ni Node. Abrir `index.html` con doble clic NO funciona (el navegador bloquea los .glb y los módulos JS).
En el login hay un botón "JUGAR SIN CONEXIÓN" (el progreso se guarda en localStorage).

---

Modos

- Campo de tiro (AIM 30 s) y mapa de campaña.
- DEFUSE 5v5: T vs CT con bots. Rondas de 1:45 (compra 10 s), plantar/desactivar con E (mantener), bomba de 40 s,
  economía (empiezas con $800), primero en ganar 4 rondas. TAB = marcador, B = tienda (solo en tu zona de spawn).
- Exploración libre: Dust II, Italy y Office sin reglas.

Mapas (game-client/assets/Mapas para tt vs ct) y logos (assets/Logos mapas): Dust II (`de_dust2_-_cs_map.glb`), Italy, Office.
Italy y Office vienen con texturas de 8192/4096 px: se usan versiones reducidas en `optimizados/`
(`herramientas/optimizar-mapas.bat` las regenera si cambias los originales).
Las zonas de cada mapa (spawn T/CT y sitios A/B) están en `game-client/js/zonas.js`.
Si un mapa está en `null` se calculan solas.
Los mapas reducidos (Office) generan la malla de navegación de los bots con celda fina (`nav:{cell, headroom}` en `MAPS`).

Vista en primera persona (viewmodel): arma y cuchillo se dibujan en un segundo pase (capa 1) con su propia cámara de FOV
fijo (84° horizontal ≈ viewmodel_fov de CS), así no se deforman con el FOV del mundo ni atraviesan paredes. Las poses
de cada arma y del cuchillo se ajustan en `buildPackWeapons` / `loadKnifeAnim` (`js/game.js`).
El pack de armas no trae colores ni texturas (un único material negro): `js/characters.js` pinta cada triángulo por
zona (madera / metal / polímero). `js/loaders.js` convierte `KHR_materials_pbrSpecularGlossiness` (r160 ya no lo soporta).

Personajes: T = Phoenix y Leet, CT = FBI y ST6 (por el nombre interno del modelo: ctm_* = CT, tm_* = T).
Armas: AK-47 (T), M4A4 (CT), AWP, Desert Eagle, cuchillo; granadas: flash (7), humo (8), HE (9), molotov (0); kit de defusa (CT).
Los bots usan el pack "low poly weapon free pack". Las armas no llevan brazos; el cuchillo (`cuchillo_de_combate.glb`) trae los suyos: estático, y con click derecho reproduce su animación de ataque.

Calidad gráfica (Ajustes): BAJA / MEDIA / ALTA — resolución, sombras (el sol sigue al jugador), tone mapping, niebla y
resolución de texturas de los mapas.

Teclas: WASD, SHIFT agacharse, ESPACIO saltar, 1 AK · 2 cuchillo · 3 AWP · 4 Deagle · 5 M4A4 · 7-0 granadas,
click izq disparar/lanzar, click der mirar, R recargar, F inspeccionar, E plantar/desactivar, TAB marcador.


Contribuciones

Las contribuciones son bienvenidas.

1. Haz un fork del proyecto.


2. Crea una rama.


3. Realiza cambios.


4. Haz commit.


5. Envía un pull request.




---


Autor

Desarrollado por TeamTStudio estudio independiente.

Integrado por 
Dante Iglesias 
Santino Laudati
Ian Quiroga

---

Inspiración

Fafi-1.6 toma inspiración en la jugabilidad táctica y precisión competitiva de shooters modernos, mezclándolo con un diseño artístico divertido y accesible para jugadores casuales y competitivos.

> "Precisión táctica + diversión arcade = experiencia FPS única"

Modo historia · mapa de hechos de la Segunda Guerra Mundial (`game-client/js/historia.js`, `storymap.js`, `mapa.js`)
El modo historia es un mapa de Europa con 7 hechos; por ahora solo está desbloqueado el primero, «El desembarco de Normandía» (6 de junio de 1944), una cinemática de 8 planos con modelos GLB (`assets/WW2`), música, sonido real y locución. Los otros 6 aparecen con candado (próximamente).

- Contenido: `assets/WW2` (lancha Higgins LCVP, acorazado Bismarck, bombardero, soldado alemán, MP-40 en primera persona y las tres fotos). El bombardero,
  el soldado y las texturas pesadas se usan en versión de 1024 px (`assets/WW2/optimizados`, generada con `herramientas/optimizar-glb.ps1`).
- Guion y locución: `assets/historia/guion.json` (texto de cada plano) y `assets/historia/audio/cN_M.wav`. La duración de cada plano la marca el audio.
  Para regenerar la voz con Piper: `herramientas/generar-voz-piper.ps1`; para grabar una voz humana: `herramientas/grabar-locucion.html` (usa los mismos nombres).
- Para añadir un capítulo: añade su entrada al guion, genera sus `.wav` y escribe su constructor `CH[n]` en `historia.js` (planos de mapa, foto o 3D).

Sonido del juego (`game-client/js/sfx.js`, muestras en `assets/audio/sfx`)
Disparos por arma, recarga, cerrojo, cuchillo, impactos, granadas (rebote, flash, humo, HE, molotov), bomba (plantar, pitidos que se aceleran,
desactivar, explosión), pasos del jugador y de los bots según el mapa, muertes y clics de interfaz. Los sonidos de bots y granadas son
posicionales (se atenúan con la distancia y suenan por el lado correcto). El audio se activa con el primer clic o tecla.

Realismo (sombras, agua, físicas)
- Sombras: sesgo adaptativo al tamaño del texel (sin acné), mapa de 2048 px en MEDIA, y sombras de contacto bajo cada personaje estiradas en la dirección
  opuesta al sol (también en mapas con luz horneada). Ver `js/quality.js` (`alignBlobToSun`).
- Agua de la cinemática: shader en GPU con olas, normales de detalle, reflejo del cielo con Fresnel, brillo del sol, color por profundidad y espuma
  en crestas y orilla (`js/historia.js`).
- Físicas: el jugador tiene inercia (acelera, frena con fricción, casi no controla el aire y pierde la velocidad contra las paredes); los bots caen
  por gravedad con vuelco, rebote y deslizamiento según la dirección del disparo; las granadas tienen resistencia del aire, rebote según la
  velocidad de impacto y giro al rodar; los impactos en paredes sueltan polvo y chispas con gravedad y dejan agujeros de bala.

Cajas y skins
- Tienda y Equipamiento activos (pestañas del menú). Tres cajas (200 / 500 / 1000 coins). Al abrir una se reproduce la animación de tapa del modelo
  `assets/Cajas/…glb` (`js/cajas.js`) y el arma ganada sale flotando de la caja, con luz, haz y chispas del color de su rareza.
- 32 skins (AK-47, M4A4, AWP, Desert Eagle, cuchillo) que recolorean las zonas del modelo de cada arma (madera, metal, polímero, corredera…): ver `fafiSkinsDB`
  en `js/game.js` y `repaintWeapon` en `js/characters.js`. Las duplicadas se reembolsan (50 / 150 / 400). Se equipan en Equipamiento y se ven en primera persona.

Optimización para PC básicos (4 GB de RAM)
- Calidad nueva **MÍNIMA** (Ajustes): 70 % de resolución, sin antialiasing ni sombras, niebla corta, 4 bots, texturas de mapa reducidas, menos partículas y 30 FPS fijos.
  La primera vez el juego elige la calidad según la memoria y los núcleos del navegador (`js/quality.js`); en equipos de 4 GB o 2 núcleos arranca en MÍNIMA.
- Los sonidos se descodifican solo la primera vez que suenan (antes se cargaban los 80 al abrir el juego y ocupaban cientos de MB de RAM): `js/sfx.js`.
- Los mapas pesados usan siempre las versiones de 1k/2k de `assets/Mapas para tt vs ct/optimizados`, y los modelos grandes de WW2 se usan reducidos (`assets/WW2/optimizados`).
