# Manual de Usuario — FAFI 1.6

**Versión del documento:** 1.0  
**Build descrito:** FAFI 1.6 V2 — motor GLB, AIM Practice, Dust II (exploración) y campaña de 5 niveles  
**Plataforma:** navegador web de escritorio (HTML5 + Three.js)  
**Autor del proyecto:** TeamT Studio  
**Licencia:** uso personal y no comercial (ver `LICENSE`)

---

## Índice

1. [Introducción](#1-introducción)
2. [Requisitos del sistema](#2-requisitos-del-sistema)
3. [Instalación y acceso](#3-instalación-y-acceso)
   - [3.1. Opción A: Docker (recomendada)](#31-opción-a-docker-recomendada)
   - [3.2. Opción B: servidor local sin Docker](#32-opción-b-servidor-local-sin-docker)
   - [3.3. Comprobar que el sistema está en línea](#33-comprobar-que-el-sistema-está-en-línea)
4. [Creación de cuenta e inicio de sesión](#4-creación-de-cuenta-e-inicio-de-sesión)
   - [4.1. Registro](#41-registro)
   - [4.2. Inicio de sesión](#42-inicio-de-sesión)
   - [4.3. Cierre de sesión](#43-cierre-de-sesión)
   - [4.4. Modo local de emergencia](#44-modo-local-de-emergencia)
5. [Interfaz principal](#5-interfaz-principal)
6. [Modos de juego](#6-modos-de-juego)
   - [6.1. Campo de tiro (AIM 30 s)](#61-campo-de-tiro-aim-30-s)
   - [6.2. Dust II — exploración por bandos](#62-dust-ii--exploración-por-bandos)
   - [6.3. Mapa de campaña (5 niveles)](#63-mapa-de-campaña-5-niveles)
7. [Controles](#7-controles)
8. [Armas, munición y economía](#8-armas-munición-y-economía)
   - [8.1. Armas disponibles](#81-armas-disponibles)
   - [8.2. Puntuación en AIM y campaña](#82-puntuación-en-aim-y-campaña)
   - [8.3. Dinero en Dust II](#83-dinero-en-dust-ii)
   - [8.4. Fafi Coins](#84-fafi-coins)
9. [HUD y elementos en pantalla](#9-hud-y-elementos-en-pantalla)
10. [Ajustes](#10-ajustes)
11. [Perfil, monedas, logros y amigos](#11-perfil-monedas-logros-y-amigos)
12. [Tienda y equipamiento (estado actual)](#12-tienda-y-equipamiento-estado-actual)
13. [Consejos y estrategia](#13-consejos-y-estrategia)
14. [Solución de problemas](#14-solución-de-problemas)
15. [Preguntas frecuentes](#15-preguntas-frecuentes)
16. [Información técnica](#16-información-técnica)
17. [Glosario](#17-glosario)
18. [Créditos, licencia y contacto](#18-créditos-licencia-y-contacto)

---

## 1. Introducción

**FAFI 1.6** es un shooter en primera persona (FPS) jugable directamente en el navegador. Está construido con **HTML5, CSS, JavaScript y Three.js**, y cuenta con un backend en **PHP 8 + MySQL** para las cuentas, la progresión y los datos del perfil.

Esta versión (V2) se centra en tres experiencias:

| Modo | Qué es | Duración |
|---|---|---|
| **Campo de tiro (AIM)** | Práctica de puntería contra blancos móviles con todas las armas desbloqueadas. | 30 segundos |
| **Dust II — Exploración** | Recorrido libre del mapa Dust II con física, saltos, agacharse y compra de armas. | Sin límite |
| **Campaña** | Cinco niveles de AIM con dificultad progresiva y desbloqueo secuencial. | 30 s por nivel |

> **Importante:** en esta build **no hay multijugador activo**, **no hay bots ni enemigos**, y la **tienda e inventario están deshabilitados**. El modo Dust II es de exploración, no de combate contra otros jugadores. El resto del manual describe exactamente lo que hace el juego actual.

### 1.1. Novedades de esta build

- Motor 3D V2 con modelos **GLB** para armas y mapa.
- Dust II real cargado desde `map_prueba.glb`, con colisiones, escaleras, saltos y minimapa.
- Sistema de compra estilo CS:GO dentro de Dust II.
- Campaña de 5 niveles con velocidad de blancos incremental.
- Perfil con monedas, logros, historial y lista de amigos.
- Ajustes de sensibilidad y calidad gráfica persistentes.

---

## 2. Requisitos del sistema

### 2.1. Mínimos

- **Sistema operativo:** Windows 10/11, macOS 12+ o Linux con entorno de escritorio.
- **Navegador:** Chrome, Edge, Firefox u Opera actualizados (se recomienda Chrome/Edge).
- **WebGL 2.0** habilitado (imprescindible para Three.js).
- **Teclado y ratón.** El juego no está pensado para pantallas táctiles.
- **Conexión a Internet** para cargar Three.js desde el CDN de jsDelivr la primera vez.
- **Resolución mínima:** 1280 × 720.

### 2.2. Recomendados

- **GPU dedicada o integrada reciente** (Intel Iris Xe, AMD Vega o superior).
- **8 GB de RAM.**
- **Chrome/Edge de 64 bits** con aceleración por hardware activada.
- **Conexión por cable** si se juega en una red escolar.

### 2.3. Software del servidor (solo para quien despliega)

- **Docker Desktop** + **Docker Compose** (opción recomendada).
- O bien: **PHP 8.1+**, **MySQL 8**, **Nginx/Apache** y **Composer**.
- Puertos libres: **80** (juego y API) y **8080** (WebSocket, aunque el multijugador no se usa en esta build).

---

## 3. Instalación y acceso

El juego se sirve como sitio web. No se ejecuta abriendo `index.html` con doble clic: los módulos ES y la API necesitan un servidor HTTP.

### 3.1. Opción A: Docker (recomendada)

1. Instala **Docker Desktop** y asegúrate de que esté iniciado.
2. Abre una terminal en la carpeta raíz del proyecto (`Fafi-1.6-main`).
3. Copia el archivo de variables de entorno:

   ```bash
   cp .env.docker .env
   ```

   En Windows PowerShell:

   ```powershell
   Copy-Item .env.docker .env
   ```

4. Edita `.env` y cambia como mínimo:
   - `DB_ROOT_PASSWORD`
   - `DB_PASSWORD`
   - `JWT_SECRET` (32 caracteres o más)
   - `DOMAIN` (puede ser `localhost` o la IP del servidor)

5. Levanta el stack:

   ```bash
   docker compose up -d --build
   ```

6. Espera a que MySQL termine de inicializarse (la primera vez puede tardar uno o dos minutos). El esquema y los datos iniciales se importan automáticamente.
7. Abre en el navegador:

   - Juego: **http://localhost/**
   - Comprobación de salud: **http://localhost/health**
   - Sitio del equipo: **http://localhost/dev-website/**

8. Para detener el stack:

   ```bash
   docker compose down
   ```

   Para detenerlo y borrar también la base de datos:

   ```bash
   docker compose down -v
   ```

> **Aviso:** `docker compose down -v` elimina la base de datos y las cuentas creadas. Úsalo solo si quieres empezar de cero.

### 3.2. Opción B: servidor local sin Docker

Requisitos: PHP 8.1+, MySQL 8 y Composer.

1. Instala dependencias del backend:

   ```bash
   cd database/php-backend
   composer install
   ```

2. Crea la base de datos e importa los scripts:

   ```bash
   mysql -u root -p < database/Fafi_1_6.sql
   mysql -u root -p fafi_1_6 < database/php-backend/database/seed_mysql.sql
   ```

3. Copia la configuración de ejemplo:

   ```bash
   cp database/php-backend/.env.example database/php-backend/.env
   ```

   Ajusta usuario, contraseña, nombre de base de datos y `JWT_SECRET`.

4. Sirve el frontend con cualquier servidor estático. Por ejemplo:

   ```bash
   npx serve game-client
   ```

5. Sirve la API con Nginx/Apache usando la configuración del repositorio (`database/php-backend/nginx.conf` o `.htaccess`). El servidor integrado de PHP no reproduce bien las rutas `/api/...`; para pruebas serias conviene Docker o Nginx.

> **Consejo:** si solo quieres probar la parte visual sin base de datos, usa el [modo local de emergencia](#44-modo-local-de-emergencia).

### 3.3. Comprobar que el sistema está en línea

- `http://localhost/health` debe responder `healthy`.
- `http://localhost/api/auth/login` con un `POST` vacío debe devolver un error JSON de validación (no un 404). Si devuelve 404, revisa la sección de [solución de problemas](#14-solución-de-problemas).
- En la pantalla de inicio debe aparecer el logo **FAFI 1.6** y el formulario de acceso.

---

## 4. Creación de cuenta e inicio de sesión

Al abrir el juego por primera vez verás una pantalla de acceso sobre un fondo oscuro con el logo **FAFI 1.6**.

### 4.1. Registro

1. Pulsa **“¿No tienes cuenta? Regístrate aquí”**.
2. Completa:
   - **Usuario:** entre 3 y 20 caracteres. Debe ser único.
   - **Email:** una dirección válida. También debe ser única.
   - **Contraseña:** mínimo **6 caracteres** (validación del backend).
3. Pulsa **CREAR CUENTA**.

Si todo es correcto, se crea la cuenta, se inicia sesión automáticamente y entras al menú principal.

**Errores habituales:**

| Mensaje | Causa | Solución |
|---|---|---|
| “El nombre de usuario debe tener entre 3 y 20 caracteres” | Usuario demasiado corto o largo | Ajusta la longitud |
| “La contraseña debe tener al menos 6 caracteres” | Contraseña corta | Usa 6 o más |
| “El usuario o email ya está registrado” | Datos duplicados | Usa otro usuario/email o inicia sesión |
| “Email inválido” | El email no contiene `@` | Corrige el email |
| “No se pudo conectar con el servidor” | Backend caído o API mal enrutada | Revisa Docker y la sección 14 |

### 4.2. Inicio de sesión

1. Escribe tu **usuario** (o tu email) y tu **contraseña**.
2. Pulsa **ENTRAR AL JUEGO** o presiona **Enter**.
3. Si las credenciales son correctas, entrarás al menú principal.

La sesión se guarda en el navegador mediante un token JWT en `localStorage` (`fafi_token`). Al recargar la página, el token se conserva, pero la pantalla de login vuelve a mostrarse: vuelve a introducir tus credenciales.

> **Nota:** el nombre que aparece en la esquina superior derecha debería ser tu usuario. Si ves siempre **“DevPlayer”**, consulta el problema correspondiente en la sección 14.

### 4.3. Cierre de sesión

1. Entra en la pestaña **Ajustes**.
2. Pulsa **CERRAR SESIÓN**.

Se borran el token y los datos de sesión del navegador y vuelve la pantalla de login. La cuenta y su progreso permanecen en la base de datos.

### 4.4. Modo local de emergencia

Si el backend no está disponible y solo quieres probar el juego, puedes activar el **modo local**. Este modo guarda el progreso únicamente en el navegador y **no** usa MySQL.

1. Abre la consola del navegador con **F12** → pestaña **Console**.
2. Escribe y pulsa Enter:

   ```js
   authService.enableDevMode('TuNombre');
   location.reload();
   ```

3. En la pantalla de login escribe cualquier usuario de 3 o más caracteres y una contraseña cualquiera. Entrarás en modo local.

Para desactivarlo:

```js
localStorage.removeItem('fafi_dev_mode');
localStorage.removeItem('fafi_dev_user');
location.reload();
```

> **Limitaciones del modo local:** no hay validación real de contraseña, no se sincroniza con la base de datos y los datos solo existen en ese navegador. Úsalo para demos o pruebas, no para producción.

---

## 5. Interfaz principal

Después de iniciar sesión verás el menú de FAFI 1.6 con una barra superior y cinco pestañas.

### 5.1. Barra superior

| Elemento | Descripción |
|---|---|
| **FAFI 1.6** | Logo del juego. |
| **Jugar** | Modos de juego y skin equipada. |
| **Equipamiento 🔒** | Deshabilitado en esta build. |
| **Tienda 🔒** | Deshabilitada en esta build. |
| **Perfil** | Historial, amigos y logros. |
| **Ajustes** | Sensibilidad, calidad y cierre de sesión. |
| **FAFI COINS** | Monedas disponibles (empiezas con 2000 en una cuenta nueva). |
| **JUGADOR** | Nombre de usuario y estado de la conexión. |

### 5.2. Pestaña Jugar

Contiene tres botones:

- **🎯 CAMPO DE TIRO (AIM 30s)**
- **🗺️ DUST II — EXPLORACIÓN POR BANDOS**
- **★ MAPA DE CAMPAÑA (5 niveles → AIM progresivo)**

Debajo se muestra la **skin equipada actual** para AK, AWP, Deagle y cuchillo. Si no has equipado ninguna, verás `default`.

---

## 6. Modos de juego

### 6.1. Campo de tiro (AIM 30 s)

**Objetivo:** conseguir la mayor puntuación posible en 30 segundos.

- Al empezar aparecen **4 blancos móviles** y se generan más con el tiempo.
- Todos los blancos se mueven y rebotan dentro de la galería.
- Tienes **todas las armas desbloqueadas** desde el inicio: AK-47, cuchillo, AWP y Desert Eagle.
- No hay dinero ni compras en este modo.
- Al terminar se muestra un resumen con **puntos, aciertos/disparos, precisión y rango**.

**Rangos de AIM:**

| Puntos | Rango |
|---|---|
| 0 – 299 | PRINCIPIANTE |
| 300 – 599 | EN PROGRESO |
| 600 – 999 | BUEN AIM |
| 1000 – 1499 | PRO |
| 1500 – 1999 | ELITE |
| 2000+ | ¡LEYENDA FAFI! |

**Monedas:** ganas **1 Fafi Coin por cada 10 puntos** (`floor(puntos / 10)`). Por ejemplo, 850 puntos = 85 coins.

**Consejos rápidos:**

- Los blancos valen distinto según el arma: cuchillo 150, Deagle 140, AWP 250, AK 100.
- El AWP es el que más puntúa, pero tiene cadencia lenta y mira telescópica.
- El cuchillo puntúa bien de cerca, pero exige acercarse.
- La precisión solo cuenta los disparos que impactan; no penaliza fallar, pero baja el porcentaje.

### 6.2. Dust II — exploración por bandos

**Objetivo:** recorrer el mapa Dust II y probar el movimiento, las armas y la compra.

1. Pulsa **DUST II — EXPLORACIÓN POR BANDOS**.
2. Espera a que cargue el mapa (la primera vez puede tardar; verás un porcentaje).
3. Elige bando:
   - **TERRORISTAS** → spawn terrorista.
   - **ANTITERRORISTAS** → spawn antiterrorista.
4. Aparecerás con **cuchillo** y **$3000**.
5. Pulsa **B** para abrir el menú de compra.
6. Pulsa **ESC** para pausar y ver las opciones.

**Características reales de este modo:**

- **No hay temporizador ni fin de partida.** Sales cuando quieras con ESC → menú.
- **No hay enemigos, bots ni objetivos.** Es un mapa de exploración.
- **Física completa:** colisiones con paredes, escaleras, saltos, agacharse y gravedad.
- **Minimapa circular** en la esquina superior izquierda.
- **Cambio de bando** desde la pausa (reinicia posición, dinero y armas).
- **Saltos con fatiga:** si saltas repetidamente, pierdes velocidad durante unos segundos.
- **Cuchillo siempre disponible.**

**Menú de pausa (ESC):**

| Botón | Acción |
|---|---|
| **CONTINUAR** | Vuelve al juego y bloquea el ratón. |
| **CAMBIAR DE BANDO** | Abre el selector T/CT y reinicia la partida. |
| **VOLVER AL MENÚ** | Sale de Dust II y vuelve al menú principal. |

> **Nota:** si el ratón no está capturado, haz clic sobre la pantalla del juego para recuperar el control de la cámara.

### 6.3. Mapa de campaña (5 niveles)

**Objetivo:** superar cinco niveles de AIM con dificultad creciente.

1. Pulsa **MAPA DE CAMPAÑA**.
2. Se abre el mapa **“Frente de Batalla — AIM progresivo”** con 5 nodos.
3. Solo están desbloqueados los niveles que hayas alcanzado. El nivel 1 siempre está disponible.
4. Pulsa un nodo desbloqueado para jugar.
5. Cada nivel es un **AIM de 30 segundos**.
6. Necesitas **600 puntos o más** para superar el nivel y desbloquear el siguiente.

**Dificultad:**

La velocidad de los blancos se multiplica por:

```text
velocidad = 1 + (nivel - 1) × 0.35
```

| Nivel | Multiplicador de velocidad |
|---|---|
| 1 | 1.00× |
| 2 | 1.35× |
| 3 | 1.70× |
| 4 | 2.05× |
| 5 | 2.40× |

**Progreso:**

- El nivel máximo es **5**.
- El progreso se guarda en `localStorage` y, si la base de datos está disponible, también en MySQL.
- Al superar un nivel se desbloquea el logro **Héroe de Guerra**.
- Las monedas ganadas en campaña funcionan igual que en AIM: `floor(puntos / 10)`.

> **Importante:** el nivel se guarda, pero en la build actual la lectura del progreso desde la base de datos puede fallar por un problema de enrutamiento de la API (ver sección 14). El progreso local del navegador sigue funcionando.

---

## 7. Controles

### 7.1. Tabla de controles

| Acción | Tecla / botón | Notas |
|---|---|---|
| Moverse | **W A S D** | Adelante, izquierda, atrás, derecha. |
| Saltar | **Espacio** | Solo en Dust II. |
| Agacharse | **Shift** | Mantener. Reduce la altura y mejora la precisión. |
| Disparar | **Clic izquierdo** | AK automática; Deagle semiautomática; AWP de cerrojo. |
| Atacar con cuchillo | **Clic izquierdo** | Con el cuchillo equipado. |
| Apuntar / mirar | **Clic derecho** | AK: mantener. AWP: alternar mira. Deagle: no tiene mira. |
| Recargar | **R** | Solo armas de fuego. |
| Inspeccionar arma | **F** | Animación de inspección. |
| Equipar AK-47 | **1** | Si la posees (en Dust II hay que comprarla). |
| Equipar cuchillo | **2** | Siempre disponible. |
| Equipar AWP | **3** | Si la posees. |
| Equipar Desert Eagle | **4** | Si la posees. |
| Cambiar de arma | **Q** o **rueda del ratón** | Cicla entre las armas que posees. |
| Abrir/cerrar compra | **B** | Solo en Dust II. |
| Pausa / menú | **ESC** | Si el ratón está capturado, lo libera; si no, vuelve al menú. |
| Panel de depuración | **F7** | Muestra y permite ajustar el arma/jugador. |
| Espectador (noclip) | **\|** | Solo con F7 activo y en Dust II. |
| Marcar spawn T | **<** | Solo con F7 activo y en Dust II. |
| Marcar spawn CT | **Z** | Solo con F7 activo y en Dust II. |

### 7.2. Controles de depuración (F7)

Estas teclas solo funcionan con el **modo debug activado** (F7). Están pensadas para ajustar modelos y no son necesarias para jugar.

| Tecla | Acción |
|---|---|
| **7 / 8** | Mover el arma a la izquierda / derecha. |
| **9 / 0** | Mover el arma hacia atrás / adelante. |
| **O / P** | Agrandar / achicar el arma. |
| **'** (comilla) | Rotar el arma. |
| **Alt + ↑ / ↓** | Subir / bajar el arma. |
| **, / .** | Agrandar / achicar el cuerpo del jugador. |
| **K / L** | Ensanchar / estrechar el ancho del jugador. |
| **V** | Reiniciar el tamaño del jugador. |
| **G** | Girar el modelo del AK. |
| **M** | Guardar la configuración del arma. |
| **N** | Borrar la configuración guardada y recargar. |
| **-** | Guardar la configuración del jugador. |

> **Recomendación:** si no sabes qué hacen estas teclas, deja F7 desactivado. Los cambios de depuración se guardan en `localStorage`.

### 7.3. Ratón y captura del puntero

- Al entrar en una partida, el juego captura el ratón (Pointer Lock).
- Pulsa **ESC** para liberarlo y abrir la pausa.
- Haz clic en la pantalla para volver a capturarlo.
- La **sensibilidad** se ajusta en Ajustes y afecta a AIM y Dust II.

---

## 8. Armas, munición y economía

### 8.1. Armas disponibles

| Arma | Tecla | Munición | Precio en Dust II | Modo de disparo | Mira | Puntos por impacto |
|---|---|---|---|---|---|---|
| **AK-47** | 1 | 30 / 90 | $2500 | Automático | Mantener clic derecho | 100 |
| **Cuchillo** | 2 | — | Incluido | Cuerpo a cuerpo | No | 150 |
| **AWP** | 3 | 10 / 30 | $4750 | Cerrojo, un tiro | Alternar clic derecho | 250 |
| **Desert Eagle** | 4 | 7 / 35 | $700 | Semiautomático | No | 140 |

**Notas:**

- La **primaria es excluyente**: si compras AK teniendo AWP, la AWP se reemplaza; y viceversa.
- La **Deagle** ocupa el slot secundario.
- El **cuchillo** siempre está en el inventario.
- Al comprar un arma, se recarga la munición completa.
- En **AIM y campaña** todas las armas están disponibles sin comprar.
- En **Dust II** empiezas solo con cuchillo y debes comprar las demás.

### 8.2. Puntuación en AIM y campaña

| Acción | Puntos |
|---|---|
| Impacto de AK-47 | +100 |
| Impacto de Desert Eagle | +140 |
| Impacto de AWP | +250 |
| Impacto de cuchillo | +150 |
| Blanco destruido con arma de fuego | Suma los puntos del arma |

La puntuación se acumula. Los impactos cuentan como acierto; los disparos fallidos cuentan para la precisión.

### 8.3. Dinero en Dust II

- Empiezas con **$3000**.
- El dinero **no se gana** durante la exploración: solo se gasta.
- No hay rondas, recompensas ni reembolsos.
- Al cambiar de bando o reiniciar Dust II, vuelves a **$3000** y pierdes las armas compradas.
- El HUD muestra el dinero en verde cuando estás en Dust II.

**Ejemplo de compra:**

1. Empiezas con $3000 y cuchillo.
2. Compras la **Deagle** ($700) → te quedan $2300.
3. Compras la **AK-47** ($2500) → no te alcanza.
4. Si hubieras comprado la AK primero, te quedarían $500 y no podrías comprar la Deagle.
5. La AWP ($4750) no se puede comprar con los $3000 iniciales; necesitarías empezar con más dinero o modificar la economía (no disponible en la interfaz).

### 8.4. Fafi Coins

- Moneda virtual del perfil.
- Una cuenta nueva empieza con **2000 coins**.
- Se ganan jugando AIM o campaña: **1 coin por cada 10 puntos**.
- Se conservan en `localStorage` y, si la base de datos funciona, en MySQL.
- Actualmente **no se pueden gastar**: la tienda está deshabilitada.

---

## 9. HUD y elementos en pantalla

Durante una partida verás los siguientes elementos:

| Elemento | Ubicación | Descripción |
|---|---|---|
| **PUNTOS** | Arriba a la izquierda | Puntuación actual. |
| **BLANCOS** | Arriba | Aciertos / disparos realizados. |
| **PRECISIÓN** | Arriba | Porcentaje de aciertos. |
| **DINERO** | Arriba | Solo en Dust II. |
| **F7 DEBUG** | Arriba | Indica si el modo debug está activo. |
| **TIEMPO** | Arriba a la derecha | Cuenta atrás en AIM/campaña. En Dust II no hay tiempo. |
| **FPS** | Esquina superior derecha | Fotogramas por segundo. |
| **Minimapa** | Esquina superior izquierda | Solo en Dust II. |
| **Mira (crosshair)** | Centro | Cambia al apuntar. |
| **Hit marker** | Centro | Aparece brevemente al impactar. |
| **Barra de recarga** | Centro inferior | Progreso de recarga. |
| **Información del arma** | Abajo a la derecha | Arma, modo y munición. |
| **Instrucciones** | Parte inferior | Recordatorio de controles. |
| **Menú de compra** | Centro | Solo en Dust II al pulsar B. |
| **Panel de debug** | Esquina | Solo con F7 activo. |

### 9.1. Minimapa

- Solo aparece en Dust II.
- Muestra tu posición y orientación.
- Es circular y se actualiza en tiempo real.
- No muestra enemigos porque no hay enemigos en esta build.

### 9.2. Mira y zoom

- **AK-47:** mantén el clic derecho para apuntar; al soltar, vuelve a la cadera.
- **AWP:** pulsa el clic derecho para entrar en la mira telescópica; vuelve a pulsar para salir.
- **Deagle:** no tiene mira; el clic derecho no hace nada.
- **Cuchillo:** no tiene mira.
- Al apuntar, la sensibilidad y el campo de visión cambian.

---

## 10. Ajustes

Entra en la pestaña **Ajustes** del menú principal.

### 10.1. Sensibilidad de la cámara

- Rango: **1 a 20**.
- Valor por defecto: **5**.
- Fórmula interna: `controls.pointerSpeed = valor / 5`.
  - 1 → 0.20×
  - 5 → 1.00× (base)
  - 10 → 2.00×
  - 20 → 4.00×
- Se aplica en AIM y Dust II, con y sin mira.
- Se guarda por usuario en `localStorage` y se intenta guardar en MySQL.

**Cómo ajustarla:**

1. Mueve el deslizador.
2. El número de la derecha muestra el valor actual.
3. Prueba en AIM o Dust II.
4. Si te cuesta apuntar, baja el valor; si el ratón va lento, súbelo.

### 10.2. Calidad gráfica

El botón **CALIDAD: ALTA / BAJA** alterna entre dos modos:

| Modo | Pixel ratio | Sombras |
|---|---|---|
| **ALTA** | Hasta 2× (limitado por el dispositivo) | Activadas |
| **BAJA** | 1× | Desactivadas |

- Si el juego va lento, usa **BAJA**.
- El cambio se aplica al instante y se guarda en `localStorage`.
- En equipos modestos, **BAJA** mejora bastante los FPS.

### 10.3. Cerrar sesión

- Botón **CERRAR SESIÓN** al final de la pestaña.
- Borra la sesión del navegador.
- No borra la cuenta ni el progreso de MySQL.

---

## 11. Perfil, monedas, logros y amigos

La pestaña **Perfil** muestra tres bloques.

### 11.1. Historial de compras

- Lista de compras de cajas realizadas.
- En esta build la tienda está deshabilitada, así que normalmente aparecerá **“No hay compras.”**
- Si en el futuro se activa la tienda, aquí se verán las cajas abiertas y su coste.

### 11.2. Lista de amigos

- Campo para escribir el **usuario del amigo** y botón **AÑADIR**.
- En esta build la lista es local: añade el nombre a la lista del navegador.
- No hay invitaciones, aceptación, chat ni estado online real.
- El backend tiene endpoints sociales, pero la interfaz actual no los usa de forma completa.

### 11.3. Logros

| Logro | Descripción | Cómo se desbloquea |
|---|---|---|
| **Recluta** | Entra a tu primera partida V2. | Inicia cualquier partida. |
| **Inversor de Fafi** | Abre tu primera caja. | No disponible: la tienda está deshabilitada. |
| **Héroe de Guerra** | Supera un nivel de campaña (600+ pts). | Consigue 600+ puntos en un nivel de campaña. |
| **Explorador Dust2** | Entra a Dust II por primera vez. | Inicia el modo Dust II. |
| **Aim Pro** | Consigue 1000+ pts en AIM. | Anota 1000+ puntos en una partida AIM. |

Los logros se guardan en `localStorage` y se intentan sincronizar con MySQL. En la lista aparecen con ✅ si están desbloqueados o 🔒 si no.

### 11.4. Monedas

- El contador **FAFI COINS** aparece en la barra superior y en la tienda.
- Empiezas con 2000.
- Ganas coins al terminar AIM o campaña.
- No hay forma de comprar coins con dinero real en esta build.
- No se pueden gastar mientras la tienda esté deshabilitada.

---

## 12. Tienda y equipamiento (estado actual)

### 12.1. Tienda

La pestaña **Tienda 🔒** está deshabilitada. Si haces clic:

> “🔒 Tienda deshabilitado — PRÓXIMAMENTE.”

También verás el aviso dentro de la pestaña:

> “La tienda de cajas está deshabilitada en esta versión. Tus Fafi Coins se conservan para cuando se active.”

Se muestran tres cajas como vista previa, pero **no se pueden abrir**:

| Caja | Precio | Contenido previsto |
|---|---|---|
| Caja Básica | 200 coins | Comunes, pequeña chance épica. |
| Caja Avanzada | 500 coins | Alta probabilidad de épicas. |
| Caja Clasificada | 1000 coins | Épica o legendaria. |

### 12.2. Equipamiento e inventario

La pestaña **Equipamiento 🔒** también está deshabilitada:

> “El inventario y las skins están deshabilitados en esta versión. Tus armas V2 funcionan con el aspecto por defecto.”

- No se pueden equipar skins.
- No se pueden abrir cajas.
- El botón **INVENTARIO DESHABILITADO** está desactivado.
- En la pestaña Jugar se muestra la skin equipada, pero será `default` salvo que se hayan equipado skins por código o mediante datos antiguos.

### 12.3. ¿Por qué están deshabilitadas?

Por decisión de diseño de esta build: se priorizó el motor V2, AIM, Dust II y la campaña. El código de tienda, ruleta, skins y previsualización 3D existe, pero la interfaz bloquea su uso. Los datos de monedas se conservan para una futura activación.

---

## 13. Consejos y estrategia

### 13.1. AIM

- **Empieza con la AK:** es la más equilibrada y perdona errores.
- **Usa ráfagas cortas:** el retroceso acumulado dispersa los disparos.
- **Agáchate (Shift):** reduce el retroceso y mejora la precisión.
- **No dispares sin apuntar:** la cadera tiene más dispersión.
- **Prioriza blancos cercanos al centro:** requieren menos movimiento de ratón.
- **El AWP es rentable si aciertas:** 250 puntos por impacto, pero solo 10 balas.
- **El cuchillo es para distancias cortas:** 150 puntos, pero te obliga a acercarte.

### 13.2. Campaña

- El nivel 1 es idéntico a AIM normal.
- A partir del nivel 2 los blancos se mueven más rápido; baja la sensibilidad si te cuesta seguirlos.
- Necesitas **600 puntos** para avanzar. Con la AK son unos 6 impactos; con AWP, 3.
- Si fallas un nivel, puedes repetirlo sin perder progreso.
- El progreso máximo es el nivel 5.

### 13.3. Dust II

- Explora primero sin comprar para familiarizarte con el mapa.
- Usa **Shift** para agacharte y pasar por zonas bajas.
- **Espacio** solo salta en Dust II; úsalo para subir escaleras o sortear obstáculos.
- El **minimapa** ayuda a orientarte.
- Si te pierdes, pulsa **ESC → CAMBIAR DE BANDO** para reaparecer en el spawn del otro bando.
- No hay enemigos: es un modo para practicar movimiento y compras.

### 13.4. Rendimiento

- Si los FPS bajan, pon **CALIDAD: BAJA**.
- Cierra otras pestañas y programas que usen GPU.
- Usa Chrome o Edge con aceleración por hardware.
- En portátiles, conecta el cargador y usa el perfil de alto rendimiento.

---

## 14. Solución de problemas

### 14.1. No puedo iniciar sesión y la API devuelve 404

**Síntoma:** al pulsar **ENTRAR AL JUEGO** aparece un error o la API responde `404 Endpoint no encontrado` para `/api/auth/login`.

**Causa conocida:** en esta build, el enrutador `database/php-backend/api/index.php` calcula la acción con `$segments[2]`, pero las rutas de dos segmentos como `/api/auth/login` dejan la acción en `$segments[1]`. Por eso muchas rutas devuelven 404.

**Solución provisional:**

1. Usa el [modo local de emergencia](#44-modo-local-de-emergencia) para jugar sin backend.
2. O corrige el enrutador (ver `docs/REVISION_PROYECTO.md`, sección de hallazgos) y reinicia el contenedor:

   ```bash
   docker compose restart app
   ```

**Rutas afectadas conocidas:**

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `GET /api/inventory/coins`
- `GET /api/inventory/equipped`
- `GET /api/inventory/store`
- `GET /api/inventory/history/purchases`
- `GET /api/game/campaign`
- `GET /api/game/stats`
- `GET /api/game/config`
- `GET /api/game/leaderboard`
- `GET /api/social/friends`
- `GET /api/social/achievements`
- `PUT /api/social/friends/{id}/accept`
- `PUT /api/social/friends/{id}/block`
- `DELETE /api/social/friends/{id}`

### 14.2. Aparezco como “DevPlayer” en lugar de mi usuario

**Síntoma:** después de iniciar sesión, la barra superior muestra **JUGADOR: DevPlayer**.

**Causa conocida:** `fafiDoLogin()` pasa a `fafiFinalizeAuth()` el objeto completo que devuelve `authService.login()` (`{ user, token, message }`) en lugar de `data.user`. Como ese objeto no tiene `username`, se usa el valor por defecto `DevPlayer`.

**Solución provisional:** inicia sesión en modo local con el nombre deseado, o corrige la llamada en `game-client/js/main.js`:

```js
// Antes
const user = await window.authService.login(u, p);
fafiFinalizeAuth(user, false);

// Después
const data = await window.authService.login(u, p);
fafiFinalizeAuth(data.user || data, false);
```

### 14.3. La página se queda en negro o no carga Three.js

- Comprueba tu conexión a Internet: Three.js se carga desde `cdn.jsdelivr.net`.
- Si tu red bloquea CDNs, descarga Three.js y cambia el `importmap` de `game-client/index.html`.
- Abre la consola (F12) y revisa errores de red.
- Verifica que estás usando `http://` o `https://`, no `file://`.

### 14.4. WebGL no disponible

**Síntoma:** mensaje de error de WebGL o pantalla vacía.

**Solución:**

1. Activa la aceleración por hardware en el navegador.
2. Actualiza los drivers de la GPU.
3. Prueba otro navegador (Chrome/Edge).
4. En Chrome: `chrome://gpu` para comprobar el estado de WebGL.

### 14.5. El ratón no controla la cámara

- Haz clic sobre la pantalla del juego para capturar el puntero.
- Si acabas de pulsar ESC, el juego está en pausa: pulsa **CONTINUAR**.
- Comprueba que no haya otro programa capturando el ratón.
- En algunos navegadores, la captura requiere una interacción del usuario.

### 14.6. Dust II tarda mucho en cargar

- El mapa es un GLB de varios MB; la primera carga puede tardar.
- Espera a que el porcentaje llegue al 100%.
- No cierres la pestaña durante la carga.
- Si se queda bloqueado, recarga la página y vuelve a intentarlo.
- En conexiones lentas, la descarga del modelo puede tardar más.

### 14.7. No se escuchan sonidos

**Causa:** en esta build los sonidos están desactivados intencionadamente (`playSound()` no reproduce audio). No es un fallo de tu equipo.

### 14.8. La tienda o el inventario no se abren

Es el comportamiento esperado en esta build: ambas secciones están marcadas como **PRÓXIMAMENTE**. No hay forma de activarlas desde la interfaz.

### 14.9. Perdí mi progreso

- Si jugabas en modo local, el progreso está en `localStorage` de ese navegador. Si borras los datos del sitio, se pierde.
- Si jugabas con cuenta y MySQL, el progreso puede no haberse guardado por el problema de enrutamiento de la API.
- Revisa `localStorage` en F12 → Application → Local Storage.
- Claves usadas:
  - `fafi_token`
  - `fafi_user`
  - `fafi_save_<usuario>`
  - `fafi_dev_mode`
  - `fafi_dev_user`
  - `fafi_spawn_t`
  - `fafi_spawn_ct`
  - `fafi_v2_weapons`

### 14.10. Reiniciar todos los datos locales

En la consola del navegador:

```js
localStorage.clear();
location.reload();
```

Esto borra sesión, progreso local, skins y ajustes de ese navegador. **No** borra la base de datos MySQL.

### 14.11. El contenedor no arranca

1. Comprueba que Docker Desktop está iniciado.
2. Revisa los logs:

   ```bash
   docker compose logs -f app
   docker compose logs -f db
   ```

3. Verifica que `.env` existe y tiene `DB_PASSWORD`, `DB_ROOT_PASSWORD` y `JWT_SECRET`.
4. Si el puerto 80 está ocupado, cambia el mapeo en `docker-compose.yml`:

   ```yaml
   ports:
     - "8080:80"
   ```

   Y abre `http://localhost:8080/`.

### 14.12. La base de datos no se inicializa

- La inicialización solo ocurre la **primera vez** que se crea el volumen.
- Si cambias los scripts SQL, borra el volumen y vuelve a levantar:

  ```bash
  docker compose down -v
  docker compose up -d --build
  ```

- Comprueba que los archivos `database/Fafi_1_6.sql` y `database/php-backend/database/seed_mysql.sql` existen.

---

## 15. Preguntas frecuentes

**¿FAFI 1.6 es multijugador?**  
No en esta build. El servidor WebSocket existe en el código, pero el cliente no lo carga y el modo online está desactivado. Los modos disponibles son AIM, Dust II (exploración) y campaña, todos para un jugador.

**¿Hay bots o enemigos?**  
No. Dust II es un mapa de exploración y AIM usa blancos móviles.

**¿Puedo jugar sin Internet?**  
No del todo: Three.js se carga desde un CDN. Si lo alojas localmente y usas el modo local, podrías jugar sin conexión, pero no es la configuración por defecto.

**¿Puedo jugar sin cuenta?**  
La interfaz exige iniciar sesión. Puedes usar el modo local de emergencia, pero no guarda en MySQL.

**¿Cómo gano coins?**  
Jugando AIM o campaña: 1 coin por cada 10 puntos. También empiezas con 2000 coins en una cuenta nueva.

**¿Puedo comprar skins?**  
No en esta build. La tienda y el inventario están deshabilitados.

**¿Las skins afectan al juego?**  
No. Son cosméticas y, además, están desactivadas en la interfaz.

**¿Cómo cambio de arma?**  
Con **1** (AK), **2** (cuchillo), **3** (AWP), **4** (Deagle), o con **Q**/rueda del ratón. En Dust II solo puedes usar las que hayas comprado.

**¿Por qué no puedo apuntar con la Deagle?**  
Por diseño: la Deagle no tiene mira en esta build.

**¿Cómo salgo de Dust II?**  
Pulsa **ESC** y luego **VOLVER AL MENÚ**.

**¿Se guarda el progreso de la campaña?**  
Sí, en `localStorage`. La sincronización con MySQL depende de que la API funcione correctamente.

**¿Dónde está el modo online?**  
Desactivado. El archivo `game-client/js/network.js` indica que el modo online no está disponible y `index.html` no lo carga.

**¿Puedo cambiar la resolución?**  
No hay un ajuste de resolución en la interfaz. Puedes usar el zoom del navegador o cambiar la calidad gráfica.

**¿Cómo reporto un error?**  
Consulta la sección de créditos y contacta con TeamT Studio. También puedes abrir un issue en el repositorio de GitHub.

---

## 16. Información técnica

Esta sección es para desarrolladores y para quien quiera entender la estructura del proyecto.

### 16.1. Arquitectura

```text
Navegador
  ├── game-client/            Frontend del juego (HTML + CSS + JS + Three.js)
  │   ├── index.html          Estructura de menús, HUD y overlays
  │   ├── css/style.css       Estilos
  │   └── js/
  │       ├── config.js       URLs de API y WebSocket
  │       ├── auth.js         Sesión, token y llamadas de autenticación
  │       ├── api.js          Cliente de la API REST
  │       ├── main.js         Lógica principal, modos, campaña, tienda, perfil
  │       ├── player.js       Armas, disparos, recarga, daño y puntuación
  │       ├── controls.js     Movimiento, colisiones, teclas, minimapa, debug
  │       └── network.js      Multijugador (no cargado en esta build)
  ├── dev-website/            Sitio estático del equipo
  └── database/
      ├── Fafi_1_6.sql        Esquema MySQL
      └── php-backend/
          ├── api/            Endpoints REST (auth, game, inventory, social)
          ├── websocket/      Servidor Ratchet (no usado por el cliente)
          ├── config/         DB y JWT
          ├── database/       Seed de datos
          └── docker/         Nginx, PHP-FPM, supervisord
```

### 16.2. Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, CSS3, JavaScript ES Modules |
| Motor 3D | Three.js 0.160.0 (CDN jsDelivr) |
| Modelos | GLB/glTF |
| Backend | PHP 8.1+ |
| Base de datos | MySQL 8.0 |
| Autenticación | JWT (HS256) + bcrypt |
| WebSocket | PHP Ratchet (no activo en el cliente) |
| Contenedores | Docker + Docker Compose |
| Servidor web | Nginx + PHP-FPM |
| Caché | Redis (interno, opcional) |

### 16.3. Configuración de URLs

`game-client/js/config.js` deriva las URLs de la página actual:

```js
apiBaseUrl = `${location.protocol}//${location.host}/api`;
wsUrl      = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/game`;
```

Por eso el juego funciona en cualquier IP o puerto sin editar el archivo, siempre que Nginx sirva `/api` y `/game`.

### 16.4. API REST

| Método | Ruta | Función |
|---|---|---|
| POST | `/api/auth/register` | Crear cuenta. |
| POST | `/api/auth/login` | Iniciar sesión. |
| GET | `/api/auth/me` | Datos del usuario. |
| PUT | `/api/auth/password` | Cambiar contraseña. |
| GET | `/api/inventory` | Inventario. |
| GET | `/api/inventory/equipped` | Skins equipadas. |
| POST | `/api/inventory/equip` | Equipar skin. |
| GET | `/api/inventory/store` | Catálogo de tienda. |
| GET | `/api/inventory/coins` | Monedas. |
| POST | `/api/inventory/store/purchase` | Comprar caja. |
| GET | `/api/inventory/history/purchases` | Historial. |
| GET | `/api/social/friends` | Amigos. |
| POST | `/api/social/friends` | Añadir amigo. |
| PUT | `/api/social/friends/{id}/accept` | Aceptar solicitud. |
| PUT | `/api/social/friends/{id}/block` | Bloquear. |
| DELETE | `/api/social/friends/{id}` | Eliminar amigo. |
| GET | `/api/social/achievements` | Logros. |
| GET | `/api/social/search?q=` | Buscar usuarios. |
| GET | `/api/game/campaign` | Progreso de campaña. |
| POST | `/api/game/campaign/complete` | Completar nivel. |
| GET | `/api/game/stats` | Estadísticas. |
| POST | `/api/game/stats/update` | Actualizar estadísticas. |
| GET | `/api/game/leaderboard` | Clasificación. |
| GET | `/api/game/matches` | Historial de partidas. |
| POST | `/api/game/matches` | Guardar partida. |
| GET | `/api/game/config` | Configuración. |
| PUT | `/api/game/config` | Actualizar configuración. |
| POST | `/api/game/coins/earn` | Sumar coins. |

> **Estado real:** muchas de estas rutas no responden correctamente en esta build por el problema de enrutamiento descrito en la sección 14.1. Las que sí funcionan son las de tres segmentos, como `POST /api/game/campaign/complete` y `POST /api/game/coins/earn`.

### 16.5. Base de datos

El esquema `database/Fafi_1_6.sql` incluye tablas para:

- Usuarios y autenticación.
- Progreso de campaña.
- Estadísticas de juego.
- Inventario y skins.
- Tienda y compras.
- Amigos y logros.
- Partidas e historial.
- Configuración por usuario.

El seed `database/php-backend/database/seed_mysql.sql` inserta datos iniciales (catálogo de artículos, logros, etc.).

### 16.6. WebSocket

- Servidor: `database/php-backend/websocket/server.php` (Ratchet).
- Nginx lo expone en `/game`.
- **No está conectado al cliente en esta build.** `network.js` declara el modo online como desactivado y `index.html` no lo importa.
- El servidor tiene lógica de salas, movimiento y disparos, pero no se usa en la experiencia actual.

### 16.7. Persistencia local

| Clave | Contenido |
|---|---|
| `fafi_token` | Token JWT. |
| `fafi_user` | Datos básicos del usuario. |
| `fafi_save_<usuario>` | Monedas, inventario, skins, compras, amigos, logros, nivel y ajustes. |
| `fafi_dev_mode` | Activa el modo local. |
| `fafi_dev_user` | Usuario del modo local. |
| `fafi_spawn_t` | Spawn terrorista marcado en Dust II. |
| `fafi_spawn_ct` | Spawn antiterrorista marcado en Dust II. |
| `fafi_v2_weapons` | Configuración de armas del modo debug. |

---

## 17. Glosario

| Término | Significado |
|---|---|
| **AIM** | Modo de práctica de puntería contra blancos. |
| **AWP** | Rifle francotirador de un solo tiro. |
| **Bando** | Equipo: Terroristas (T) o Antiterroristas (CT). |
| **Blanco** | Objetivo móvil del modo AIM. |
| **Campaña** | Cinco niveles de AIM con dificultad creciente. |
| **Coins** | Moneda virtual del perfil (Fafi Coins). |
| **Deagle** | Pistola Desert Eagle. |
| **Dust II** | Mapa clásico de Counter-Strike, aquí en modo exploración. |
| **FPS** | Fotogramas por segundo (rendimiento) o First Person Shooter (género). |
| **GLB** | Formato de modelo 3D binario basado en glTF. |
| **HUD** | Interfaz superpuesta durante la partida. |
| **JWT** | Token firmado usado para la sesión. |
| **Minimapa** | Representación reducida del mapa en pantalla. |
| **Pointer Lock** | Captura del ratón por parte del juego. |
| **Spawn** | Punto de aparición de un jugador. |
| **Skin** | Aspecto cosmético de un arma. |
| **Three.js** | Biblioteca JavaScript de renderizado 3D. |

---

## 18. Créditos, licencia y contacto

### 18.1. Créditos

**TeamT Studio** — proyecto FAFI 1.6.

Integrantes:

- Dante Iglesias
- Santino Laudati
- Ian Quiroga

### 18.2. Licencia

© 2026 TeamT Studio. Todos los derechos reservados.

El proyecto se distribuye bajo la licencia incluida en el archivo [`LICENSE`](../LICENSE):

- Uso permitido: descarga y ejecución para entretenimiento personal y no comercial.
- Prohibida la venta, reventa, distribución pago o explotación comercial sin autorización.
- Prohibida la alteración, ingeniería inversa o reutilización comercial del código y los activos.

### 18.3. Contacto

- **Email:** teamtitssstudio@gmail.com
- **Instagram:** [@teamtstudio](https://www.instagram.com/teamtstudio)
- **Repositorio:** consulta la URL del repositorio de GitHub donde se publicó este proyecto.

### 18.4. Documentos relacionados

- [`docs/REVISION_PROYECTO.md`](REVISION_PROYECTO.md) — revisión técnica, hallazgos y recomendaciones.
- [`docs/frontend-integration.md`](frontend-integration.md) — guía de integración del frontend.
- [`README.md`](../README.md) — descripción general del repositorio.

---

**Fin del manual.**
