CREATE DATABASE fafi_1_6;
USE fafi_1_6;
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    estado VARCHAR(20) DEFAULT 'activo', -- 'activo', 'baneado', 'inactivo'
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE configuraciones_jugador (
    usuario_id INT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    preferencias_ui TEXT, -- Puede ser un JSON con los ajustes
    sensibilidad_mouse DECIMAL(5,2) DEFAULT 1.00,
    fov INT DEFAULT 90,
    atajos_teclado TEXT, -- JSON con los keybinds
    mira TEXT -- JSON o String con color, tamaño, etc.
);
CREATE TABLE progreso_campana (
    usuario_id INT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    ultimo_nivel VARCHAR(50),
    dificultad VARCHAR(20) DEFAULT 'normal',
    misiones_completadas TEXT -- JSON con el array de misiones pasadas
);
CREATE TABLE articulos_tienda (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    tipo_moneda VARCHAR(20) DEFAULT 'gratuita', -- 'gratuita' o 'premium'
    activo BOOLEAN DEFAULT TRUE
);
CREATE TABLE skins_armas (
    articulo_id INT PRIMARY KEY REFERENCES articulos_tienda(id) ON DELETE CASCADE,
    arma_base VARCHAR(50) NOT NULL,
    rareza VARCHAR(20), -- 'comun', 'epico', 'legendario'
    ruta_modelo VARCHAR(255) NOT NULL
);
CREATE TABLE skins_soldados (
    articulo_id INT PRIMARY KEY REFERENCES articulos_tienda(id) ON DELETE CASCADE,
    nombre_traje VARCHAR(100) NOT NULL,
    faccion VARCHAR(50),
    caracteristicas_modelo TEXT
);
CREATE TABLE inventario_jugador (
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    articulo_id INT REFERENCES articulos_tienda(id) ON DELETE CASCADE,
    fecha_adquisicion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, articulo_id)
);
CREATE TABLE historial_compras (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    articulo_id INT REFERENCES articulos_tienda(id) ON DELETE SET NULL,
    monto_gastado DECIMAL(10,2) NOT NULL,
    tipo_moneda VARCHAR(20) NOT NULL,
    fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE estadisticas_armas (
    id SERIAL PRIMARY KEY,
    nombre_arma VARCHAR(50) UNIQUE NOT NULL,
    dano_base DECIMAL(5,2) NOT NULL,
    cadencia_tiro INT NOT NULL, -- Ej: balas por minuto
    retroceso_vertical DECIMAL(5,2),
    retroceso_horizontal DECIMAL(5,2),
    dispersion DECIMAL(5,2)
);
CREATE TABLE estadisticas_jugador (
    usuario_id INT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    bajas INT DEFAULT 0,
    muertes INT DEFAULT 0,
    partidas_ganadas INT DEFAULT 0,
    precision_general DECIMAL(5,2) DEFAULT 0.00, -- Porcentaje
    tiempo_jugado_minutos INT DEFAULT 0
);
CREATE TABLE monedas_jugador (
    usuario_id INT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    moneda_gratuita INT DEFAULT 0,
    moneda_premium INT DEFAULT 0
);
CREATE TABLE historial_partidas (
    id SERIAL PRIMARY KEY,
    mapa VARCHAR(50) NOT NULL,
    modo_juego VARCHAR(50) NOT NULL,
    duracion_segundos INT NOT NULL,
    equipo_ganador VARCHAR(50),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE lista_amigos (
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    amigo_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'aceptada', 'bloqueada'
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, amigo_id)
);
CREATE TABLE logros (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);
CREATE TABLE logros_desbloqueados (
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    logro_id INT REFERENCES logros(id) ON DELETE CASCADE,
    fecha_desbloqueo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, logro_id)
);
-- Igualar los tipos de datos en las tablas
ALTER TABLE configuraciones_jugador MODIFY usuario_id BIGINT UNSIGNED;
ALTER TABLE progreso_campana MODIFY usuario_id BIGINT UNSIGNED;
ALTER TABLE estadisticas_jugador MODIFY usuario_id BIGINT UNSIGNED;
ALTER TABLE monedas_jugador MODIFY usuario_id BIGINT UNSIGNED;
ALTER TABLE skins_armas MODIFY articulo_id BIGINT UNSIGNED;
ALTER TABLE skins_soldados MODIFY articulo_id BIGINT UNSIGNED;
ALTER TABLE inventario_jugador MODIFY usuario_id BIGINT UNSIGNED, MODIFY articulo_id BIGINT UNSIGNED;
ALTER TABLE historial_compras MODIFY usuario_id BIGINT UNSIGNED, MODIFY articulo_id BIGINT UNSIGNED;
ALTER TABLE lista_amigos MODIFY usuario_id BIGINT UNSIGNED, MODIFY amigo_id BIGINT UNSIGNED;
ALTER TABLE logros_desbloqueados MODIFY usuario_id BIGINT UNSIGNED, MODIFY logro_id BIGINT UNSIGNED;

-- Relaciones
ALTER TABLE configuraciones_jugador 
    ADD CONSTRAINT fk_config_user FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;

ALTER TABLE progreso_campana 
    ADD CONSTRAINT fk_progreso_user FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;

ALTER TABLE estadisticas_jugador 
    ADD CONSTRAINT fk_stats_user FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;

ALTER TABLE monedas_jugador 
    ADD CONSTRAINT fk_monedas_user FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;

ALTER TABLE skins_armas 
    ADD CONSTRAINT fk_skins_armas_art FOREIGN KEY (articulo_id) REFERENCES articulos_tienda(id) ON DELETE CASCADE;

ALTER TABLE skins_soldados 
    ADD CONSTRAINT fk_skins_soldados_art FOREIGN KEY (articulo_id) REFERENCES articulos_tienda(id) ON DELETE CASCADE;

ALTER TABLE inventario_jugador 
    ADD CONSTRAINT fk_inv_user FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_inv_art FOREIGN KEY (articulo_id) REFERENCES articulos_tienda(id) ON DELETE CASCADE;

ALTER TABLE historial_compras 
    ADD CONSTRAINT fk_compra_user FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_compra_art FOREIGN KEY (articulo_id) REFERENCES articulos_tienda(id) ON DELETE SET NULL;

ALTER TABLE lista_amigos 
    ADD CONSTRAINT fk_amigo_user FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_amigo_amigo FOREIGN KEY (amigo_id) REFERENCES usuarios(id) ON DELETE CASCADE;

ALTER TABLE logros_desbloqueados 
    ADD CONSTRAINT fk_logros_user FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_logros_logro FOREIGN KEY (logro_id) REFERENCES logros(id) ON DELETE CASCADE;
--Consultas para cargar los datos del perfil principal al hacer Login
SELECT 
    u.username, 
    u.estado,
    e.bajas, 
    e.muertes, 
    m.moneda_gratuita, 
    m.moneda_premium
FROM usuarios u
JOIN estadisticas_jugador e ON u.id = e.usuario_id
JOIN monedas_jugador m ON u.id = m.usuario_id
WHERE u.id = 1;
--Ver el Inventario de un Jugador (Skins de armas que posee)
SELECT 
    art.nombre AS nombre_skin, 
    art.descripcion, 
    sa.arma_base, 
    sa.rareza
FROM inventario_jugador ij
JOIN articulos_tienda art ON ij.articulo_id = art.id
JOIN skins_armas sa ON art.id = sa.articulo_id
WHERE ij.usuario_id = 1;
--Tabla de Clasificación (Leaderboard - Top 5 jugadores con más bajas)
SELECT 
    u.username, 
    e.bajas, 
    e.partidas_ganadas
FROM estadisticas_jugador e
JOIN usuarios u ON e.usuario_id = u.id
ORDER BY e.bajas DESC
LIMIT 5;
--Ver la lista de amigos aceptados de un jugador
SELECT 
    u.username AS nombre_amigo, 
    la.fecha_solicitud
FROM lista_amigos la
JOIN usuarios u ON la.amigo_id = u.id
WHERE la.usuario_id = 1 AND la.estado = 'aceptada';
