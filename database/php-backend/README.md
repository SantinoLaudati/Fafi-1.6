# Fafi-1.6 PHP Backend

Backend completo en PHP 8.2+ para el juego Fafi-1.6 FPS Multijugador.

## 🚀 Características

- **API REST** completa para autenticación, inventario, tienda, social, juego
- **WebSocket Server** autoritario para multijugador en tiempo real
- **Base de datos MySQL** optimizada con índices y claves foráneas
- **JWT Authentication** seguro con expiración configurable
- **Docker** listo para producción con Nginx + PHP-FPM + Supervisor
- **Despliegue** automatizado con docker-compose

## 📁 Estructura

```
php-backend/
├── api/                    # REST API Endpoints
│   ├── index.php          # Router principal
│   ├── auth.php           # Login/Register/Profile
│   ├── inventory.php      # Inventario/Tienda/Cajas
│   ├── social.php         # Amigos/Logros/Búsqueda
│   └── game.php           # Campaña/Stats/Leaderboards/Partidas
├── websocket/
│   └── server.php         # Servidor WebSocket (Ratchet)
├── config/
│   ├── db.php             # Conexión PDO Singleton
│   ├── database.php       # Configuración DB
│   └── jwt.php            # Manejo JWT nativo
├── database/
│   ├── schema_mysql.sql   # Esquema completo MySQL
│   └── seed_mysql.sql     # Datos iniciales
├── docker/                # Configuración Docker
│   ├── php.ini
│   ├── opcache.ini
│   ├── nginx.conf
│   ├── nginx-site.conf
│   └── supervisord.conf
├── .env.example           # Variables de entorno
├── composer.json          # Dependencias PHP
├── Dockerfile             # Imagen multi-stage
└── fafi-websocket.service # Systemd service
```

## 🛠 Requisitos

- **PHP 8.2+** con extensiones: pdo, pdo_mysql, json, openssl
- **MySQL 5.7+** o **MariaDB 10.2+**
- **Composer 2+**
- **Node.js 18+** (opcional, para herramientas)
- **Docker & Docker Compose** (para contenedores)

## ⚡ Instalación Rápida (Docker)

```bash
# 1. Clonar y configurar
cd php-backend
cp .env.example .env
# Editar .env con tus credenciales

# 2. Construir y levantar
docker-compose up -d --build

# 3. Verificar
curl http://localhost/health
# {"status":"ok"}
```

## 🔧 Instalación Manual

```bash
# 1. Base de datos
mysql -u root -p < database/schema_mysql.sql
mysql -u root -p fafi_1_6 < database/seed_mysql.sql

# 2. Dependencias PHP
composer install --no-dev --optimize-autoloader

# 3. Configuración
cp .env.example .env
# Editar .env

# 4. Servidor Web (Nginx/Apache)
# Apuntar document root a php-backend/
# Configurar PHP-FPM en puerto 9000 o socket

# 5. WebSocket Server (terminal separado)
php websocket/server.php

# 6. Systemd service (opcional)
sudo cp fafi-websocket.service /etc/systemd/system/
sudo systemctl enable --now fafi-websocket
```

## 📚 API Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Inicio de sesión |
| GET | `/api/auth/me` | Perfil actual |
| PUT | `/api/auth/password` | Cambiar contraseña |

### Inventario y Tienda
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/inventory` | Obtener inventario |
| GET | `/api/inventory/equipped` | Skins equipadas |
| POST | `/api/inventory/equip` | Equipar/desequipar skin |
| GET | `/api/inventory/store` | Items de la tienda |
| GET | `/api/inventory/coins` | Monedas del usuario |
| POST | `/api/inventory/store/purchase` | Comprar/abrir caja |
| GET | `/api/inventory/history/purchases` | Historial de compras |

### Social
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/social/friends` | Lista de amigos |
| POST | `/api/social/friends` | Enviar solicitud |
| PUT | `/api/social/friends/{id}/accept` | Aceptar solicitud |
| DELETE | `/api/social/friends/{id}` | Eliminar/bloquear |
| PUT | `/api/social/friends/{id}/block` | Bloquear usuario |
| GET | `/api/social/achievements` | Logros |
| GET | `/api/social/search?q=` | Buscar usuarios |

### Juego
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/game/campaign` | Progreso campaña |
| POST | `/api/game/campaign/complete` | Completar nivel |
| GET | `/api/game/stats` | Estadísticas jugador |
| POST | `/api/game/stats/update` | Actualizar stats |
| GET | `/api/game/leaderboard` | Tabla de clasificación |
| GET | `/api/game/matches` | Historial partidas |
| POST | `/api/game/matches` | Guardar partida |
| GET | `/api/game/config` | Configuración |
| PUT | `/api/game/config` | Actualizar config |

### WebSocket
```
wss://your-domain.com/game?token=JWT_TOKEN
```

**Tipos de mensaje:**
- `join_room` - Unirse a sala
- `leave_room` - Salir de sala
- `player_update` - Posición/rotación/arma
- `shoot` - Disparo
- `damage` - Daño a jugador
- `chat` - Mensaje chat

## 🔐 Seguridad

- **JWT** con HS256, expiración 7 días (configurable)
- **Password hashing** con bcrypt (cost 12)
- **Prepared statements** en todas las queries
- **Validación** de entrada en todos los endpoints
- **Rate limiting** recomendado en Nginx
- **HTTPS obligatorio** en producción

## 🐳 Docker Production

```yaml
# docker-compose.yml incluye:
# - app: PHP-FPM + Nginx + WebSocket (puertos 80, 443, 8080)
# - db: MySQL 8.0 con volúmenes persistentes
# - redis: Cache/sesiones (opcional)

# Variables requeridas en .env:
DB_ROOT_PASSWORD=secure_root_password
DB_PASSWORD=secure_user_password
JWT_SECRET=super-secret-32-char-minimum-key
DOMAIN=your-domain.com
```

## 📊 Monitoreo

```bash
# Logs
docker-compose logs -f app
docker-compose logs -f db

# Salud
curl http://localhost/health

# Base de datos
docker-compose exec db mysql -u root -p fafi_1_6

# WebSocket
docker-compose exec app php websocket/server.php
```

## 🔄 Despliegue

```bash
# Script automatizado
./deploy.sh production

# O manual:
docker-compose pull
docker-compose up -d --build
docker-compose exec app php-fpm -t
```

## 🎮 Integración Frontend

Ver `FRONTEND_INTEGRATION.md` para conectar el `game-client` existente.

Cambios principales:
1. Reemplazar `localStorage` → API calls
2. Reemplazar `PeerJS` (P2P) → WebSocket autoritario
3. Usar `Authorization: Bearer <token>` en headers

## 📝 Licencia

MIT License - Ver LICENSE.MD

## 👥 Autores

TeamT Estudio Independiente
- Dante Iglesias
- Santino Laudati
- Ian Quiroga