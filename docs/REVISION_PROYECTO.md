# Revisión técnica del proyecto FAFI 1.6

**Fecha de revisión:** 30 de octubre de 2026
**Alcance:** código del cliente web, API PHP, base de datos, WebSocket, despliegue con Docker, sitio de desarrollo y documentación.
**Documento relacionado:** [Manual de Usuario FAFI 1.6](Manual_de_Usuario_FAFI_1.6.md)

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Qué es realmente esta build](#2-qué-es-realmente-esta-build)
3. [Arquitectura del proyecto](#3-arquitectura-del-proyecto)
4. [Flujos verificados](#4-flujos-verificados)
5. [Hallazgos y correcciones aplicadas](#5-hallazgos-y-correcciones-aplicadas)
6. [Problemas pendientes](#6-problemas-pendientes)
7. [Diferencias entre el README y el juego real](#7-diferencias-entre-el-readme-y-el-juego-real)
8. [Recomendaciones](#8-recomendaciones)
9. [Cómo ejecutar y probar](#9-cómo-ejecutar-y-probar)
10. [Conclusión](#10-conclusión)

---

## 1. Resumen ejecutivo

FAFI 1.6 es un FPS táctico para navegador construido con HTML, CSS y JavaScript sobre Three.js, con una API REST en PHP y MySQL, y un servidor WebSocket opcional para multijugador.

La documentación original (README y sitio de desarrollo) describe un juego multijugador por equipos con personajes, habilidades, rondas competitivas, tienda, inventario, bots y sonido. **Esa descripción no coincide con el código que realmente se ejecuta.** La build actual es una experiencia para un solo jugador centrada en tres modos:

- **AIM Practice** de 30 segundos.
- **Dust II — Exploración** (sin enemigos ni rondas).
- **Campaña de 5 niveles** con dificultad progresiva.

Además, la build original **no arrancaba** por un error de JavaScript en el módulo del jugador, y el inicio de sesión mostraba el objeto de respuesta completo en lugar del nombre de usuario. Ambos problemas se corrigieron durante esta revisión, junto con errores de enrutamiento de la API.

El proyecto queda en un estado **demostrable y jugable en local**, pero sigue siendo un prototipo: el multijugador no está conectado al cliente, la tienda y el inventario están desactivados a propósito, y el audio no está implementado.

---

## 2. Qué es realmente esta build

### Modos disponibles

| Modo | Estado | Descripción real |
|---|---|---|
| AIM Practice | Funcional | 30 segundos, objetivos que aparecen y desaparecen, puntuación y precisión. |
| Dust II — Exploración | Funcional | Recorrido libre del mapa con cuchillo y compra de armas. Sin enemigos, sin temporizador, sin rondas. |
| Campaña | Funcional | 5 niveles de AIM con velocidad creciente. Se avanza con 600 puntos o más. |
| Multijugador | No cargado | Existe servidor WebSocket y código de red, pero `index.html` no los carga. |
| Team Deathmatch / Bomb Mode | Inexistente | Solo aparecen como texto en la documentación antigua. |
| Bots | Inexistentes | No hay IA de enemigos en el cliente. |
| Tienda / Inventario | Desactivados | La interfaz existe, pero muestra «PRÓXIMAMENTE». |
| Sonido | No implementado | `playSound()` no hace nada. |

### Contenido real

- **Armas:** cuchillo, Deagle, AK-47 y AWP, con modelos GLB.
- **Economía:** monedas calculadas como `floor(puntuación / 10)`.
- **Progresión:** rangos en 300, 600, 1000, 1500 y 2000 puntos.
- **Logros mostrados en el cliente:** `first_blood`, `rich_boy`, `campaign_hero`, `dust_explorer`, `aim_pro`.
- **Ajustes:** sensibilidad (1–20) y calidad gráfica.

---

## 3. Arquitectura del proyecto

```
Fafi-1.6-main/
├── game-client/            Cliente del juego (Three.js)
│   ├── index.html          Interfaz, menús y HUD
│   ├── css/style.css       Estilos del juego
│   ├── js/
│   │   ├── config.js       URL de la API y constantes
│   │   ├── api.js          Cliente HTTP de la API
│   │   ├── auth.js         Registro, login y sesión
│   │   ├── player.js       Armas, munición, retroceso, daño
│   │   ├── controls.js     Movimiento, bindings, minimapa, debug
│   │   ├── main.js         Lógica de menús, modos y HUD
│   │   ├── network.js      Código de red (modo online desactivado)
│   │   └── game.js         Bundle generado que carga el navegador
│   └── assets/models/      Modelos 3D (.glb)
├── database/
│   ├── Fafi_1_6.sql        Esquema principal
│   └── php-backend/
│       ├── api/            Endpoints REST (auth, game, inventory, social)
│       ├── config/         Conexión a MySQL y JWT
│       ├── websocket/      Servidor WebSocket
│       └── docker/         Configuración de PHP-FPM y Nginx
├── dev-website/            Sitio promocional del equipo
├── docs/                   Manual, revisión y documentos académicos
├── scripts/build-game.js   Generador del bundle del cliente
├── docker-compose.yml      Stack de producción
└── deploy.sh               Script de despliegue
```

### Flujo de una partida

1. El jugador abre `game-client/index.html`.
2. `game.js` inicializa la escena, la cámara y los controles.
3. El menú principal permite elegir AIM, Dust II o Campaña.
4. Al terminar, la puntuación se envía a la API (`/game/score`, `/game/coins/earn`).
5. El perfil, las monedas y los logros se consultan mediante los endpoints de `social.php` y `game.php`.

### Backend

- **PHP 8** con PDO y MySQL 8.
- **JWT** para autenticación.
- **Nginx** como servidor web y proxy.
- **WebSocket** en PHP para el modo online (no conectado al cliente actual).

---

## 4. Flujos verificados

Se probó el cliente en un navegador real, en modo de desarrollo local.

| Flujo | Resultado |
|---|---|
| Carga inicial de la página | Correcta, sin errores de consola. |
| Inicio de sesión en modo desarrollo | Correcto; el nombre `Tester` se muestra en la interfaz. |
| Inicio de AIM Practice | Correcto; temporizador y munición se actualizan. |
| Disparo y recarga | Correctos. |
| Cambio de arma | Correcto con teclas 1–4 y rueda del ratón. |
| Pausa y salida al menú | Correcta. |
| Compra en Dust II | Correcta; descuenta dinero y equipa el arma. |
| Campaña | Correcta; la velocidad aumenta por nivel. |
| Tienda e inventario | Muestran «PRÓXIMAMENTE», como se esperaba. |

> Nota: en el navegador de pruebas el *pointer lock* no se concedió por una restricción del entorno, lo que generó avisos de `PointerLockControls`. No son fallos del código del juego.

---

## 5. Hallazgos y correcciones aplicadas

### 5.1 Error fatal al iniciar el juego (corregido)

**Síntoma:** `TypeError: Assignment to constant variable` en `player.js:763`.
**Causa:** el código intentaba reasignar una importación de módulo ES, lo cual es ilegal.
**Solución:** se creó `scripts/build-game.js`, que concatena `player.js`, `controls.js` y `main.js` en un único módulo `game.js`. `index.html` ahora carga ese bundle.
**Estado:** corregido y verificado.

### 5.2 Nombre de usuario incorrecto tras el login (corregido)

**Síntoma:** tras iniciar sesión se mostraba `[object Object]` en lugar del nombre.
**Causa:** `main.js` pasaba la respuesta completa de la API a `fafiFinalizeAuth()` en vez de `data.user`.
**Solución:** se pasa `data.user`.
**Estado:** corregido y verificado.

### 5.3 Rutas de la API mal resueltas (corregido)

**Síntoma:** varias rutas devolvían 404 o se enrutaban al handler equivocado.
**Causa:** el router de `api/index.php` no contemplaba rutas de dos segmentos, rutas sociales de cuatro segmentos, `DELETE` de amigos ni `/inventory/history/purchases`.
**Solución:** se reescribió la resolución de rutas para cubrir esos casos.
**Estado:** corregido.

### 5.4 README desactualizado (corregido)

**Síntoma:** el README describía modos y funciones que no existen.
**Solución:** se añadió un aviso destacado de «Estado real de esta build (V2)» y se corrigieron los modos y la tabla de controles.
**Estado:** corregido.

### 5.5 Documentación duplicada o contradictoria (mitigado)

El README, el sitio de desarrollo y los documentos académicos describen versiones distintas del proyecto. Se añadió el manual como fuente de verdad para el comportamiento actual.

---

## 6. Problemas pendientes

Estos puntos **no bloquean** la ejecución, pero conviene resolverlos antes de presentar el proyecto como producto final.

| Prioridad | Problema | Impacto |
|---|---|---|
| Alta | El multijugador no está conectado: `index.html` no carga `network.js` y el modo online está desactivado. | La función principal anunciada no existe en la práctica. |
| Alta | El WebSocket modifica copias de arrays al aplicar daño y respawn, por lo que los cambios pueden no persistir. | El online sería inconsistente aunque se activara. |
| Media | `config/jwt.php` usa una clave secreta por defecto si no hay variable de entorno. | Riesgo de seguridad en producción. |
| Media | La campaña podría otorgar monedas dos veces: `handleCompleteCampaign` suma `nivel * 100` y el cliente también llama a `/game/coins/earn`. | Economía inflada. |
| Media | Los logros del seed no coinciden con todos los logros que muestra el cliente. | Logros que nunca se desbloquean o se muestran vacíos. |
| Baja | `network.js` dice «single-player contra bots» en un comentario, lo que confunde. | Documentación interna incorrecta. |
| Baja | `playSound()` está vacío. | Sin audio, pese a lo que afirma el README. |
| Baja | No hay pruebas automatizadas ni CI de calidad. | Regresiones fáciles de introducir. |

---

## 7. Diferencias entre el README y el juego real

| README afirma | Realidad |
|---|---|
| FPS multijugador por equipos | Un jugador; el online no está cargado. |
| Personajes con habilidades únicas | No existen habilidades ni selección de personaje. |
| Sistema de rondas competitivo | No hay rondas ni economía por rondas. |
| Bots | No hay bots. |
| Sonidos inmersivos | Sin audio. |
| Tienda e inventario | Desactivados con «PRÓXIMAMENTE». |
| Team Deathmatch y Bomb Mode | No implementados. |

El README conserva la visión original del proyecto, pero ahora advierte de forma explícita que no describe la build actual.

---

## 8. Recomendaciones

1. **Definir el alcance:** decidir si el proyecto se presenta como demo para un jugador o si se completará el multijugador.
2. **Conectar o retirar el online:** si no se va a terminar, quitar el código de red de la interfaz y de la documentación para evitar expectativas falsas.
3. **Corregir la economía:** unificar el otorgamiento de monedas en un solo lugar (servidor).
4. **Asegurar el JWT:** exigir una clave secreta real y fallar al arrancar si no está definida.
5. **Sincronizar logros:** alinear el seed de la base de datos con los logros del cliente.
6. **Añadir pruebas:** al menos pruebas de humo para el router de la API y para la carga del cliente.
7. **Mantener un único README:** mover la visión original a una sección «Roadmap» y dejar el estado actual como fuente principal.
8. **Revisar licencias de los modelos 3D** antes de publicar el repositorio.

---

## 9. Cómo ejecutar y probar

### Opción A: stack completo con Docker

```bash
docker compose up --build
```

- Cliente: `http://localhost:8080`
- API: `http://localhost:8080/api`
- Base de datos: MySQL en el puerto interno del stack

### Opción B: cliente solamente

Abrir `game-client/index.html` con un servidor estático. Para probar sin backend, activar el modo desarrollo en la consola del navegador:

```js
localStorage.setItem('fafi_dev_mode', 'true');
location.reload();
```

### Regenerar el bundle del cliente

Después de modificar `player.js`, `controls.js` o `main.js`:

```bash
node scripts/build-game.js
```

---

## 10. Conclusión

FAFI 1.6 tiene una base técnica interesante: un cliente 3D funcional, una API estructurada y un despliegue con Docker. Sin embargo, la distancia entre lo que promete la documentación y lo que hace el código es grande.

Tras esta revisión, la build **arranca, permite iniciar sesión y jugar los tres modos reales**. Los errores críticos están corregidos y la documentación principal ya distingue entre la visión original y el estado actual. Lo que queda por delante es una decisión de producto: consolidar la demo para un jugador o completar el multijugador y la economía antes de presentarla como juego terminado.
