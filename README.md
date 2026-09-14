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
3. Crear la base de datos MySQL (importar database/schema_mysql.sql y
   database/seed_mysql.sql) o usar Docker: docker compose up -d db
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
   (Los scripts schema_mysql.sql y seed_mysql.sql se importan automáticamente
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


Contribuciones

Las contribuciones son bienvenidas.

1. Haz un fork del proyecto.


2. Crea una rama.


3. Realiza cambios.


4. Haz commit.


5. Envía un pull request.




---


Autor

Desarrollado por TeamT estudio independiente.

Integrado por 
Dante Iglesias 
Santino Laudati
Ian Quiroga

---

Inspiración

Fafi-1.6 toma inspiración en la jugabilidad táctica y precisión competitiva de shooters modernos, mezclándolo con un diseño artístico divertido y accesible para jugadores casuales y competitivos.

> "Precisión táctica + diversión arcade = experiencia FPS única"
