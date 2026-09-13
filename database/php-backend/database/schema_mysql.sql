-- Fafi-1.6 MySQL Database Schema
-- Compatible with MySQL 5.7+ and MariaDB 10.2+

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables if exist (for clean install)
DROP TABLE IF EXISTS `partidas_jugadores`;
DROP TABLE IF EXISTS `historial_partidas`;
DROP TABLE IF EXISTS `logros_desbloqueados`;
DROP TABLE IF EXISTS `logros`;
DROP TABLE IF EXISTS `lista_amigos`;
DROP TABLE IF EXISTS `sesiones_juego`;
DROP TABLE IF EXISTS `monedas_jugador`;
DROP TABLE IF EXISTS `estadisticas_jugador`;
DROP TABLE IF EXISTS `estadisticas_armas`;
DROP TABLE IF EXISTS `historial_compras`;
DROP TABLE IF EXISTS `inventario_jugador`;
DROP TABLE IF EXISTS `skins_soldados`;
DROP TABLE IF EXISTS `skins_armas`;
DROP TABLE IF EXISTS `articulos_tienda`;
DROP TABLE IF EXISTS `progreso_campana`;
DROP TABLE IF EXISTS `configuraciones_jugador`;
DROP TABLE IF EXISTS `usuarios`;

-- Users table
CREATE TABLE `usuarios` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'activo',
    `fecha_creacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`),
    UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Player configurations
CREATE TABLE `configuraciones_jugador` (
    `usuario_id` BIGINT UNSIGNED NOT NULL,
    `preferencias_ui` JSON DEFAULT NULL,
    `sensibilidad_mouse` DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    `fov` INT NOT NULL DEFAULT 90,
    `atajos_teclado` JSON DEFAULT NULL,
    `mira` JSON DEFAULT NULL,
    PRIMARY KEY (`usuario_id`),
    CONSTRAINT `fk_config_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Campaign progress
CREATE TABLE `progreso_campana` (
    `usuario_id` BIGINT UNSIGNED NOT NULL,
    `ultimo_nivel` INT NOT NULL DEFAULT 1,
    `dificultad` VARCHAR(20) NOT NULL DEFAULT 'normal',
    `misiones_completadas` JSON DEFAULT NULL,
    PRIMARY KEY (`usuario_id`),
    CONSTRAINT `fk_progreso_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Store items
CREATE TABLE `articulos_tienda` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` TEXT DEFAULT NULL,
    `precio` DECIMAL(10,2) NOT NULL,
    `tipo_moneda` VARCHAR(20) NOT NULL DEFAULT 'gratuita',
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Weapon skins
CREATE TABLE `skins_armas` (
    `articulo_id` BIGINT UNSIGNED NOT NULL,
    `arma_base` VARCHAR(50) NOT NULL,
    `rareza` VARCHAR(20) DEFAULT NULL,
    `ruta_modelo` VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (`articulo_id`),
    CONSTRAINT `fk_skins_armas_art` FOREIGN KEY (`articulo_id`) REFERENCES `articulos_tienda` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Soldier skins
CREATE TABLE `skins_soldados` (
    `articulo_id` BIGINT UNSIGNED NOT NULL,
    `nombre_traje` VARCHAR(100) NOT NULL,
    `faccion` VARCHAR(50) DEFAULT NULL,
    `caracteristicas_modelo` JSON DEFAULT NULL,
    PRIMARY KEY (`articulo_id`),
    CONSTRAINT `fk_skins_soldados_art` FOREIGN KEY (`articulo_id`) REFERENCES `articulos_tienda` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Player inventory
CREATE TABLE `inventario_jugador` (
    `usuario_id` BIGINT UNSIGNED NOT NULL,
    `articulo_id` BIGINT UNSIGNED NOT NULL,
    `fecha_adquisicion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`usuario_id`, `articulo_id`),
    KEY `idx_inv_user` (`usuario_id`),
    KEY `idx_inv_art` (`articulo_id`),
    CONSTRAINT `fk_inv_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_inv_art` FOREIGN KEY (`articulo_id`) REFERENCES `articulos_tienda` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Purchase history
CREATE TABLE `historial_compras` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `usuario_id` BIGINT UNSIGNED DEFAULT NULL,
    `articulo_id` BIGINT UNSIGNED DEFAULT NULL,
    `monto_gastado` DECIMAL(10,2) NOT NULL,
    `tipo_moneda` VARCHAR(20) NOT NULL,
    `fecha_compra` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_historial_user` (`usuario_id`),
    KEY `idx_historial_art` (`articulo_id`),
    CONSTRAINT `fk_compra_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_compra_art` FOREIGN KEY (`articulo_id`) REFERENCES `articulos_tienda` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Weapon stats
CREATE TABLE `estadisticas_armas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre_arma` VARCHAR(50) NOT NULL,
    `dano_base` DECIMAL(5,2) NOT NULL,
    `cadencia_tiro` INT NOT NULL,
    `retroceso_vertical` DECIMAL(5,2) DEFAULT NULL,
    `retroceso_horizontal` DECIMAL(5,2) DEFAULT NULL,
    `dispersion` DECIMAL(5,2) DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_nombre_arma` (`nombre_arma`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Player stats
CREATE TABLE `estadisticas_jugador` (
    `usuario_id` BIGINT UNSIGNED NOT NULL,
    `bajas` INT NOT NULL DEFAULT 0,
    `muertes` INT NOT NULL DEFAULT 0,
    `partidas_ganadas` INT NOT NULL DEFAULT 0,
    `precision_general` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `tiempo_jugado_minutos` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`usuario_id`),
    CONSTRAINT `fk_stats_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Player coins
CREATE TABLE `monedas_jugador` (
    `usuario_id` BIGINT UNSIGNED NOT NULL,
    `moneda_gratuita` BIGINT NOT NULL DEFAULT 0,
    `moneda_premium` BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (`usuario_id`),
    CONSTRAINT `fk_monedas_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Match history
CREATE TABLE `historial_partidas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `mapa` VARCHAR(50) NOT NULL,
    `modo_juego` VARCHAR(50) NOT NULL,
    `duracion_segundos` INT NOT NULL,
    `equipo_ganador` VARCHAR(50) DEFAULT NULL,
    `fecha` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_historial_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Match players
CREATE TABLE `partidas_jugadores` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `partida_id` BIGINT UNSIGNED NOT NULL,
    `usuario_id` BIGINT UNSIGNED NOT NULL,
    `equipo` VARCHAR(20) DEFAULT NULL,
    `bajas` INT NOT NULL DEFAULT 0,
    `muertes` INT NOT NULL DEFAULT 0,
    `asistencias` INT NOT NULL DEFAULT 0,
    `dano_infligido` INT NOT NULL DEFAULT 0,
    `precision` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (`id`),
    KEY `idx_partidas_jugadores_partida` (`partida_id`),
    KEY `idx_partidas_jugadores_user` (`usuario_id`),
    CONSTRAINT `fk_pj_partida` FOREIGN KEY (`partida_id`) REFERENCES `historial_partidas` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pj_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Friends list
CREATE TABLE `lista_amigos` (
    `usuario_id` BIGINT UNSIGNED NOT NULL,
    `amigo_id` BIGINT UNSIGNED NOT NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    `fecha_solicitud` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`usuario_id`, `amigo_id`),
    KEY `idx_amigos_user` (`usuario_id`),
    KEY `idx_amigos_amigo` (`amigo_id`),
    CONSTRAINT `fk_amigo_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_amigo_amigo` FOREIGN KEY (`amigo_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Achievements
CREATE TABLE `logros` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` TEXT DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Unlocked achievements
CREATE TABLE `logros_desbloqueados` (
    `usuario_id` BIGINT UNSIGNED NOT NULL,
    `logro_id` BIGINT UNSIGNED NOT NULL,
    `fecha_desbloqueo` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`usuario_id`, `logro_id`),
    KEY `idx_logros_user` (`usuario_id`),
    KEY `idx_logros_logro` (`logro_id`),
    CONSTRAINT `fk_logros_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_logros_logro` FOREIGN KEY (`logro_id`) REFERENCES `logros` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Game sessions (for analytics)
CREATE TABLE `sesiones_juego` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `usuario_id` BIGINT UNSIGNED NOT NULL,
    `ip_inicio` VARCHAR(45) DEFAULT NULL,
    `user_agent` TEXT DEFAULT NULL,
    `fecha_inicio` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `fecha_fin` TIMESTAMP NULL DEFAULT NULL,
    `duracion_segundos` INT DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_sesiones_user` (`usuario_id`),
    CONSTRAINT `fk_sesiones_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Additional indexes for performance
CREATE INDEX `idx_usuarios_estado` ON `usuarios` (`estado`);
CREATE INDEX `idx_inventario_fecha` ON `inventario_jugador` (`fecha_adquisicion`);
CREATE INDEX `idx_historial_compra_fecha` ON `historial_compras` (`fecha_compra`);
CREATE INDEX `idx_partidas_fecha` ON `historial_partidas` (`fecha`);
CREATE INDEX `idx_lista_amigos_estado` ON `lista_amigos` (`estado`);

SET FOREIGN_KEY_CHECKS = 1;