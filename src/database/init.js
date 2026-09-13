import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaSQL = `
CREATE DATABASE fafi_1_6;
`;

const tablesSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    estado VARCHAR(20) DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS configuraciones_jugador (
    usuario_id BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    preferencias_ui JSONB DEFAULT '{}',
    sensibilidad_mouse DECIMAL(5,2) DEFAULT 1.00,
    fov INT DEFAULT 90,
    atajos_teclado JSONB DEFAULT '{}',
    mira JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS progreso_campana (
    usuario_id BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    ultimo_nivel INT DEFAULT 1,
    dificultad VARCHAR(20) DEFAULT 'normal',
    misiones_completadas JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS articulos_tienda (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    tipo_moneda VARCHAR(20) DEFAULT 'gratuita',
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS skins_armas (
    articulo_id BIGINT PRIMARY KEY REFERENCES articulos_tienda(id) ON DELETE CASCADE,
    arma_base VARCHAR(50) NOT NULL,
    rareza VARCHAR(20),
    ruta_modelo VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS skins_soldados (
    articulo_id BIGINT PRIMARY KEY REFERENCES articulos_tienda(id) ON DELETE CASCADE,
    nombre_traje VARCHAR(100) NOT NULL,
    faccion VARCHAR(50),
    caracteristicas_modelo JSONB
);

CREATE TABLE IF NOT EXISTS inventario_jugador (
    usuario_id BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
    articulo_id BIGINT REFERENCES articulos_tienda(id) ON DELETE CASCADE,
    fecha_adquisicion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, articulo_id)
);

CREATE TABLE IF NOT EXISTS historial_compras (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    articulo_id BIGINT REFERENCES articulos_tienda(id) ON DELETE SET NULL,
    monto_gastado DECIMAL(10,2) NOT NULL,
    tipo_moneda VARCHAR(20) NOT NULL,
    fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estadisticas_armas (
    id BIGSERIAL PRIMARY KEY,
    nombre_arma VARCHAR(50) UNIQUE NOT NULL,
    dano_base DECIMAL(5,2) NOT NULL,
    cadencia_tiro INT NOT NULL,
    retroceso_vertical DECIMAL(5,2),
    retroceso_horizontal DECIMAL(5,2),
    dispersion DECIMAL(5,2)
);

CREATE TABLE IF NOT EXISTS estadisticas_jugador (
    usuario_id BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    bajas INT DEFAULT 0,
    muertes INT DEFAULT 0,
    partidas_ganadas INT DEFAULT 0,
    precision_general DECIMAL(5,2) DEFAULT 0.00,
    tiempo_jugado_minutos INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS monedas_jugador (
    usuario_id BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    moneda_gratuita BIGINT DEFAULT 0,
    moneda_premium BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS historial_partidas (
    id BIGSERIAL PRIMARY KEY,
    mapa VARCHAR(50) NOT NULL,
    modo_juego VARCHAR(50) NOT NULL,
    duracion_segundos INT NOT NULL,
    equipo_ganador VARCHAR(50),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lista_amigos (
    usuario_id BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
    amigo_id BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
    estado VARCHAR(20) DEFAULT 'pendiente',
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, amigo_id)
);

CREATE TABLE IF NOT EXISTS logros (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS logros_desbloqueados (
    usuario_id BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
    logro_id BIGINT REFERENCES logros(id) ON DELETE CASCADE,
    fecha_desbloqueo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, logro_id)
);

CREATE TABLE IF NOT EXISTS partidas_jugadores (
    id BIGSERIAL PRIMARY KEY,
    partida_id BIGINT REFERENCES historial_partidas(id) ON DELETE CASCADE,
    usuario_id BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
    equipo VARCHAR(20),
    bajas INT DEFAULT 0,
    muertes INT DEFAULT 0,
    asistencias INT DEFAULT 0,
    dano_infligido INT DEFAULT 0,
    precision DECIMAL(5,2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS sesiones_juego (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
    ip_inicio VARCHAR(45),
    user_agent TEXT,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP,
    duracion_segundos INT
);

-- Insert default weapon stats
INSERT INTO estadisticas_armas (nombre_arma, dano_base, cadencia_tiro, retroceso_vertical, retroceso_horizontal, dispersion) VALUES
('vandal', 40, 600, 0.015, 0.012, 0.01),
('ak47', 25, 600, 0.02, 0.016, 0.015),
('deagle', 40, 150, 0.04, 0.032, 0.005),
('sniper', 80, 40, 0.08, 0.064, 0.001),
('pistol', 20, 300, 0.01, 0.008, 0.005),
('knife', 40, 120, 0, 0, 0),
('grenade', 100, 60, 0, 0, 0)
ON CONFLICT (nombre_arma) DO NOTHING;

-- Insert default achievements
INSERT INTO logros (nombre, descripcion) VALUES
('first_blood', 'Entra a tu primera partida'),
('rich_boy', 'Realiza tu primera compra de caja'),
('campaign_hero', 'Completa un nivel en la Campaña WWII'),
('sharpshooter', 'Consigue 10 headshots en una partida'),
('veteran', 'Juega 100 partidas'),
('collector', 'Consigue 50 skins diferentes'),
('social', 'Añade 10 amigos'),
('rich', 'Acumula 10000 FafiCoins')
ON CONFLICT DO NOTHING;

-- Insert default store items (skins)
INSERT INTO articulos_tienda (nombre, descripcion, precio, tipo_moneda, activo) VALUES
('Vandal Neón', 'Skin épica para Vandal con colores neón', 200, 'gratuita', true),
('Vandal Magma', 'Skin legendaria para Vandal con efecto magma', 1000, 'gratuita', true),
('Vandal Desierto', 'Skin común para Vandal camuflaje desierto', 50, 'gratuita', true),
('AK-47 Oro Macizo', 'Skin legendaria para AK-47 dorada', 1000, 'gratuita', true),
('AK-47 Glaciar', 'Skin épica para AK-47 temática hielo', 500, 'gratuita', true),
('AK-47 Táctica', 'Skin común para AK-47 táctica', 50, 'gratuita', true),
('Sniper Vacío', 'Skin legendaria para Sniper temática void', 1000, 'gratuita', true),
('Sniper Camuflaje', 'Skin común para Sniper camuflaje', 50, 'gratuita', true),
('Deagle Carmesí', 'Skin épica para Deagle color carmesí', 500, 'gratuita', true),
('Cuchillo Zafiro', 'Skin legendaria para cuchillo zafiro', 1000, 'gratuita', true),
('Cuchillo Sangre', 'Skin épica para cuchillo temática sangre', 500, 'gratuita', true),
('Caja Básica', 'Contiene skins comunes, pequeña chance de épicas', 200, 'gratuita', true),
('Caja Avanzada', 'Alta probabilidad de skins épicas', 500, 'gratuita', true),
('Caja Clasificada', 'Garantiza épica o legendaria', 1000, 'gratuita', true)
ON CONFLICT DO NOTHING;

-- Link skins to weapons
INSERT INTO skins_armas (articulo_id, arma_base, rareza, ruta_modelo) 
SELECT id, 'vandal', 'epica', 'models/vandal_neon.glb' FROM articulos_tienda WHERE nombre = 'Vandal Neón'
ON CONFLICT DO NOTHING;

INSERT INTO skins_armas (articulo_id, arma_base, rareza, ruta_modelo) 
SELECT id, 'vandal', 'legendaria', 'models/vandal_magma.glb' FROM articulos_tienda WHERE nombre = 'Vandal Magma'
ON CONFLICT DO NOTHING;

INSERT INTO skins_armas (articulo_id, arma_base, rareza, ruta_modelo) 
SELECT id, 'vandal', 'comun', 'models/vandal_desert.glb' FROM articulos_tienda WHERE nombre = 'Vandal Desierto'
ON CONFLICT DO NOTHING;

INSERT INTO skins_armas (articulo_id, arma_base, rareza, ruta_modelo) 
SELECT id, 'ak47', 'legendaria', 'models/ak47_gold.glb' FROM articulos_tienda WHERE nombre = 'AK-47 Oro Macizo'
ON CONFLICT DO NOTHING;

INSERT INTO skins_armas (articulo_id, arma_base, rareza, ruta_modelo) 
SELECT id, 'ak47', 'epica', 'models/ak47_glacier.glb' FROM articulos_tienda WHERE nombre = 'AK-47 Glaciar'
ON CONFLICT DO NOTHING;

INSERT INTO skins_armas (articulo_id, arma_base, rareza, ruta_modelo) 
SELECT id, 'ak47', 'comun', 'models/ak47_tactical.glb' FROM articulos_tienda WHERE nombre = 'AK-47 Táctica'
ON CONFLICT DO NOTHING;

INSERT INTO skins_armas (articulo_id, arma_base, rareza, ruta_modelo) 
SELECT id, 'sniper', 'legendaria', 'models/sniper_void.glb' FROM articulos_tienda WHERE nombre = 'Sniper Vacío'
ON CONFLICT DO NOTHING;

INSERT INTO skins_armas (articulo_id, arma_base, rareza, ruta_modelo) 
SELECT id, 'sniper', 'comun', 'models/sniper_camo.glb' FROM articulos_tienda WHERE nombre = 'Sniper Camuflaje'
ON CONFLICT DO NOTHING;

INSERT INTO skins_armas (articulo_id, arma_base, rareza, ruta_modelo) 
SELECT id, 'deagle', 'epica', 'models/deagle_crimson.glb' FROM articulos_tienda WHERE nombre = 'Deagle Carmesí'
ON CONFLICT DO NOTHING;

INSERT INTO skins_armas (articulo_id, arma_base, rareza, ruta_modelo) 
SELECT id, 'knife', 'legendaria', 'models/knife_sapphire.glb' FROM articulos_tienda WHERE nombre = 'Cuchillo Zafiro'
ON CONFLICT DO NOTHING;

INSERT INTO skins_armas (articulo_id, arma_base, rareza, ruta_modelo) 
SELECT id, 'knife', 'epica', 'models/knife_blood.glb' FROM articulos_tienda WHERE nombre = 'Cuchillo Sangre'
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_inventario_usuario ON inventario_jugador(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historial_compras_usuario ON historial_compras(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historial_partidas_fecha ON historial_partidas(fecha);
CREATE INDEX IF NOT EXISTS idx_lista_amigos_usuario ON lista_amigos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logros_desbloqueados_usuario ON logros_desbloqueados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_partidas_jugadores_partida ON partidas_jugadores(partida_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones_juego(usuario_id);
`;

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('Initializing database...');
    
    // Split by semicolon and execute each statement
    const statements = tablesSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
          console.log('✓ Executed:', statement.substring(0, 60) + '...');
        } catch (err) {
          if (!err.message.includes('already exists') && !err.message.includes('duplicate key')) {
            console.error('✗ Error:', err.message);
            console.error('Statement:', statement.substring(0, 100));
          }
        }
      }
    }
    
    console.log('Database initialization complete!');
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase().catch(console.error);