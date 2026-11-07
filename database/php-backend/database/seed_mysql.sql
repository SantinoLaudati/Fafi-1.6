-- Fafi-1.6 MySQL Seed Data
-- Run after Fafi_1_6.sql (schema canónico)

USE `fafi_1_6`;

-- Insert default weapon stats
INSERT INTO `estadisticas_armas` (`nombre_arma`, `dano_base`, `cadencia_tiro`, `retroceso_vertical`, `retroceso_horizontal`, `dispersion`) VALUES
('vandal', 40, 600, 0.015, 0.012, 0.01),
('ak47', 25, 600, 0.02, 0.016, 0.015),
('deagle', 40, 150, 0.04, 0.032, 0.005),
('sniper', 80, 40, 0.08, 0.064, 0.001),
('pistol', 20, 300, 0.01, 0.008, 0.005),
('knife', 40, 120, 0, 0, 0),
('grenade', 100, 60, 0, 0, 0)
ON DUPLICATE KEY UPDATE
    `dano_base` = VALUES(`dano_base`),
    `cadencia_tiro` = VALUES(`cadencia_tiro`),
    `retroceso_vertical` = VALUES(`retroceso_vertical`),
    `retroceso_horizontal` = VALUES(`retroceso_horizontal`),
    `dispersion` = VALUES(`dispersion`);

-- Insert default achievements
INSERT INTO `logros` (`nombre`, `descripcion`) VALUES
('first_blood', 'Entra a tu primera partida'),
('rich_boy', 'Realiza tu primera compra de caja'),
('campaign_hero', 'Completa un nivel en la Campaña WWII'),
('sharpshooter', 'Consigue 100 bajas totales'),
('veteran', 'Gana 100 partidas'),
('collector', 'Consigue 50 skins diferentes'),
('social', 'Añade 10 amigos'),
('rich', 'Acumula 10000 FafiCoins')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`);

-- Insert default store items (skins and boxes)
INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`) VALUES
('Vandal Neón', 'Skin épica para Vandal con colores neón', 200, 'gratuita', 1),
('Vandal Magma', 'Skin legendaria para Vandal con efecto magma', 1000, 'gratuita', 1),
('Vandal Desierto', 'Skin común para Vandal camuflaje desierto', 50, 'gratuita', 1),
('AK-47 Oro Macizo', 'Skin legendaria para AK-47 dorada', 1000, 'gratuita', 1),
('AK-47 Glaciar', 'Skin épica para AK-47 temática hielo', 500, 'gratuita', 1),
('AK-47 Táctica', 'Skin común para AK-47 táctica', 50, 'gratuita', 1),
('Sniper Vacío', 'Skin legendaria para Sniper temática void', 1000, 'gratuita', 1),
('Sniper Camuflaje', 'Skin común para Sniper camuflaje', 50, 'gratuita', 1),
('Deagle Carmesí', 'Skin épica para Deagle color carmesí', 500, 'gratuita', 1),
('Cuchillo Zafiro', 'Skin legendaria para cuchillo zafiro', 1000, 'gratuita', 1),
('Cuchillo Sangre', 'Skin épica para cuchillo temática sangre', 500, 'gratuita', 1),
('Caja Básica', 'Contiene skins comunes, pequeña chance de épicas', 200, 'gratuita', 1),
('Caja Avanzada', 'Alta probabilidad de skins épicas', 500, 'gratuita', 1),
('Caja Clasificada', 'Garantiza épica o legendaria', 1000, 'gratuita', 1)
ON DUPLICATE KEY UPDATE
    `descripcion` = VALUES(`descripcion`),
    `precio` = VALUES(`precio`),
    `tipo_moneda` = VALUES(`tipo_moneda`),
    `activo` = VALUES(`activo`);

-- Link skins to weapons
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'vandal', 'epica', 'models/vandal_neon.glb' FROM `articulos_tienda` WHERE `nombre` = 'Vandal Neón'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'vandal', 'legendaria', 'models/vandal_magma.glb' FROM `articulos_tienda` WHERE `nombre` = 'Vandal Magma'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'vandal', 'comun', 'models/vandal_desert.glb' FROM `articulos_tienda` WHERE `nombre` = 'Vandal Desierto'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'ak47', 'legendaria', 'models/ak47_gold.glb' FROM `articulos_tienda` WHERE `nombre` = 'AK-47 Oro Macizo'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'ak47', 'epica', 'models/ak47_glacier.glb' FROM `articulos_tienda` WHERE `nombre` = 'AK-47 Glaciar'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'ak47', 'comun', 'models/ak47_tactical.glb' FROM `articulos_tienda` WHERE `nombre` = 'AK-47 Táctica'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'sniper', 'legendaria', 'models/sniper_void.glb' FROM `articulos_tienda` WHERE `nombre` = 'Sniper Vacío'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'sniper', 'comun', 'models/sniper_camo.glb' FROM `articulos_tienda` WHERE `nombre` = 'Sniper Camuflaje'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'deagle', 'epica', 'models/deagle_crimson.glb' FROM `articulos_tienda` WHERE `nombre` = 'Deagle Carmesí'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'knife', 'legendaria', 'models/knife_sapphire.glb' FROM `articulos_tienda` WHERE `nombre` = 'Cuchillo Zafiro'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'knife', 'epica', 'models/knife_blood.glb' FROM `articulos_tienda` WHERE `nombre` = 'Cuchillo Sangre'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);
-- =====================================================================
-- Catalogo de skins del juego actual (37 skins: AK-47, M4A4, AWP, Desert Eagle, cuchillo).
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar articulos (usa NOT EXISTS,
-- porque articulos_tienda no tiene clave unica por nombre). No modifica la estructura de las tablas.
-- ruta_modelo = 'skin:<id>' es la clave que usa el juego para reconocer cada skin.
-- =====================================================================

-- Skins del catalogo anterior que tienen equivalente en el juego actual: solo se les asigna la clave.
UPDATE `skins_armas` sa JOIN `articulos_tienda` art ON art.`id` = sa.`articulo_id`
   SET sa.`ruta_modelo` = 'skin:ak_barroco' WHERE art.`nombre` = 'AK-47 Oro Macizo';
UPDATE `skins_armas` sa JOIN `articulos_tienda` art ON art.`id` = sa.`articulo_id`
   SET sa.`ruta_modelo` = 'skin:ak_urbana' WHERE art.`nombre` = 'AK-47 Táctica';
UPDATE `skins_armas` sa JOIN `articulos_tienda` art ON art.`id` = sa.`articulo_id`
   SET sa.`ruta_modelo` = 'skin:ak_vulcano' WHERE art.`nombre` = 'AK-47 Glaciar';
UPDATE `skins_armas` sa JOIN `articulos_tienda` art ON art.`id` = sa.`articulo_id`
   SET sa.`ruta_modelo` = 'skin:awp_camo' WHERE art.`nombre` = 'Sniper Camuflaje';
UPDATE `skins_armas` sa JOIN `articulos_tienda` art ON art.`id` = sa.`articulo_id`
   SET sa.`ruta_modelo` = 'skin:awp_vacio' WHERE art.`nombre` = 'Sniper Vacío';
UPDATE `skins_armas` sa JOIN `articulos_tienda` art ON art.`id` = sa.`articulo_id`
   SET sa.`ruta_modelo` = 'skin:d_carmesi' WHERE art.`nombre` = 'Deagle Carmesí';
UPDATE `skins_armas` sa JOIN `articulos_tienda` art ON art.`id` = sa.`articulo_id`
   SET sa.`ruta_modelo` = 'skin:k_sangre' WHERE art.`nombre` = 'Cuchillo Sangre';
UPDATE `skins_armas` sa JOIN `articulos_tienda` art ON art.`id` = sa.`articulo_id`
   SET sa.`ruta_modelo` = 'skin:k_zafiro' WHERE art.`nombre` = 'Cuchillo Zafiro';

-- Skins de armas que ya no existen en el juego (Vandal): se desactivan para que las cajas no las sorteen.
UPDATE `articulos_tienda` SET `activo` = 0 WHERE `nombre` IN ('Vandal Neón', 'Vandal Magma', 'Vandal Desierto');

-- Skins nuevas
INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'AK-47 | Selva Tropical', 'Skin comun para AK-47', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'AK-47 | Selva Tropical');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'ak47', 'comun', 'skin:ak_selva' FROM `articulos_tienda` WHERE `nombre` = 'AK-47 | Selva Tropical'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'AK-47 | Tormenta de Arena', 'Skin comun para AK-47', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'AK-47 | Tormenta de Arena');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'ak47', 'comun', 'skin:ak_arena' FROM `articulos_tienda` WHERE `nombre` = 'AK-47 | Tormenta de Arena'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'AK-47 | Línea Roja', 'Skin epica para AK-47', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'AK-47 | Línea Roja');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'ak47', 'epica', 'skin:ak_linea' FROM `articulos_tienda` WHERE `nombre` = 'AK-47 | Línea Roja'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'AK-47 | Serpiente de Fuego', 'Skin epica para AK-47', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'AK-47 | Serpiente de Fuego');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'ak47', 'epica', 'skin:ak_serpiente' FROM `articulos_tienda` WHERE `nombre` = 'AK-47 | Serpiente de Fuego'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'AK-47 | Circuito Neón', 'Skin legendaria para AK-47', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'AK-47 | Circuito Neón');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'ak47', 'legendaria', 'skin:ak_neon' FROM `articulos_tienda` WHERE `nombre` = 'AK-47 | Circuito Neón'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'M4A4 | Degradado Ártico', 'Skin comun para M4A4', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Degradado Ártico');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'm4', 'comun', 'skin:m4_artico' FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Degradado Ártico'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'M4A4 | Píxel del Desierto', 'Skin comun para M4A4', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Píxel del Desierto');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'm4', 'comun', 'skin:m4_desierto' FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Píxel del Desierto'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'M4A4 | Bosque Profundo', 'Skin comun para M4A4', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Bosque Profundo');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'm4', 'comun', 'skin:m4_bosque' FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Bosque Profundo'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'M4A4 | Colmena Cobalto', 'Skin epica para M4A4', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Colmena Cobalto');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'm4', 'epica', 'skin:m4_cobalto' FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Colmena Cobalto'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'M4A4 | Carbono Carmesí', 'Skin epica para M4A4', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Carbono Carmesí');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'm4', 'epica', 'skin:m4_carbono' FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Carbono Carmesí'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'M4A4 | Tigre de Bengala', 'Skin epica para M4A4', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Tigre de Bengala');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'm4', 'epica', 'skin:m4_tigre' FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Tigre de Bengala'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'M4A4 | Placas Doradas', 'Skin legendaria para M4A4', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Placas Doradas');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'm4', 'legendaria', 'skin:m4_placas' FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Placas Doradas'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'M4A4 | Residuo Tóxico', 'Skin legendaria para M4A4', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Residuo Tóxico');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'm4', 'legendaria', 'skin:m4_toxico' FROM `articulos_tienda` WHERE `nombre` = 'M4A4 | Residuo Tóxico'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'AWP | Degradado Nevado', 'Skin comun para AWP', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'AWP | Degradado Nevado');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'sniper', 'comun', 'skin:awp_nieve' FROM `articulos_tienda` WHERE `nombre` = 'AWP | Degradado Nevado'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'AWP | Dunas Rojizas', 'Skin comun para AWP', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'AWP | Dunas Rojizas');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'sniper', 'comun', 'skin:awp_dunas' FROM `articulos_tienda` WHERE `nombre` = 'AWP | Dunas Rojizas'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'AWP | Oleaje del Océano', 'Skin epica para AWP', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'AWP | Oleaje del Océano');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'sniper', 'epica', 'skin:awp_oceano' FROM `articulos_tienda` WHERE `nombre` = 'AWP | Oleaje del Océano'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'AWP | Colada de Magma', 'Skin epica para AWP', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'AWP | Colada de Magma');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'sniper', 'epica', 'skin:awp_magma' FROM `articulos_tienda` WHERE `nombre` = 'AWP | Colada de Magma'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'AWP | Placas de Titanio', 'Skin epica para AWP', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'AWP | Placas de Titanio');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'sniper', 'epica', 'skin:awp_titanio' FROM `articulos_tienda` WHERE `nombre` = 'AWP | Placas de Titanio'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'AWP | Dragón Esmeralda', 'Skin legendaria para AWP', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'AWP | Dragón Esmeralda');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'sniper', 'legendaria', 'skin:awp_dragon' FROM `articulos_tienda` WHERE `nombre` = 'AWP | Dragón Esmeralda'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Desert Eagle | Carbono Negro', 'Skin comun para Desert Eagle', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Desert Eagle | Carbono Negro');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'deagle', 'comun', 'skin:d_carbono' FROM `articulos_tienda` WHERE `nombre` = 'Desert Eagle | Carbono Negro'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Desert Eagle | Camuflaje del Desierto', 'Skin comun para Desert Eagle', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Desert Eagle | Camuflaje del Desierto');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'deagle', 'comun', 'skin:d_desierto' FROM `articulos_tienda` WHERE `nombre` = 'Desert Eagle | Camuflaje del Desierto'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Desert Eagle | Marea Profunda', 'Skin comun para Desert Eagle', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Desert Eagle | Marea Profunda');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'deagle', 'comun', 'skin:d_oceano' FROM `articulos_tienda` WHERE `nombre` = 'Desert Eagle | Marea Profunda'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Desert Eagle | Colmena Amatista', 'Skin epica para Desert Eagle', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Desert Eagle | Colmena Amatista');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'deagle', 'epica', 'skin:d_amatista' FROM `articulos_tienda` WHERE `nombre` = 'Desert Eagle | Colmena Amatista'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Desert Eagle | Escamas Doradas', 'Skin legendaria para Desert Eagle', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Desert Eagle | Escamas Doradas');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'deagle', 'legendaria', 'skin:d_oro' FROM `articulos_tienda` WHERE `nombre` = 'Desert Eagle | Escamas Doradas'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Desert Eagle | Circuito Cian', 'Skin legendaria para Desert Eagle', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Desert Eagle | Circuito Cian');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'deagle', 'legendaria', 'skin:d_neon' FROM `articulos_tienda` WHERE `nombre` = 'Desert Eagle | Circuito Cian'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Cuchillo | Camuflaje Táctico', 'Skin comun para cuchillo', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Cuchillo | Camuflaje Táctico');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'knife', 'comun', 'skin:k_tactico' FROM `articulos_tienda` WHERE `nombre` = 'Cuchillo | Camuflaje Táctico'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Cuchillo | Bosque Profundo', 'Skin comun para cuchillo', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Cuchillo | Bosque Profundo');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'knife', 'comun', 'skin:k_bosque' FROM `articulos_tienda` WHERE `nombre` = 'Cuchillo | Bosque Profundo'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Cuchillo | Escamas Doradas', 'Skin legendaria para cuchillo', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Cuchillo | Escamas Doradas');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'knife', 'legendaria', 'skin:k_oro' FROM `articulos_tienda` WHERE `nombre` = 'Cuchillo | Escamas Doradas'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Cuchillo | Filo Neón', 'Skin legendaria para cuchillo', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Cuchillo | Filo Neón');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'knife', 'legendaria', 'skin:k_neon' FROM `articulos_tienda` WHERE `nombre` = 'Cuchillo | Filo Neón'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);


-- =====================================================================
-- Skins de las armas adicionales (Five-SeveN, P90, SMG, escopetas, M4 Tactico, Vandal, VSS, Negev): 45 skins.
-- Idempotente: se puede ejecutar mas de una vez. No modifica la estructura de las tablas.
-- =====================================================================

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Five-SeveN | Camuflaje Urbano', 'Skin comun para Five-SeveN', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Five-SeveN | Camuflaje Urbano');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'five', 'comun', 'skin:five_urbano' FROM `articulos_tienda` WHERE `nombre` = 'Five-SeveN | Camuflaje Urbano'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Five-SeveN | Selva Tropical', 'Skin comun para Five-SeveN', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Five-SeveN | Selva Tropical');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'five', 'comun', 'skin:five_selva' FROM `articulos_tienda` WHERE `nombre` = 'Five-SeveN | Selva Tropical'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Five-SeveN | Colmena Cobalto', 'Skin epica para Five-SeveN', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Five-SeveN | Colmena Cobalto');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'five', 'epica', 'skin:five_cobalto' FROM `articulos_tienda` WHERE `nombre` = 'Five-SeveN | Colmena Cobalto'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Five-SeveN | Serpiente de Fuego', 'Skin epica para Five-SeveN', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Five-SeveN | Serpiente de Fuego');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'five', 'epica', 'skin:five_fuego' FROM `articulos_tienda` WHERE `nombre` = 'Five-SeveN | Serpiente de Fuego'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Five-SeveN | Oro Barroco', 'Skin legendaria para Five-SeveN', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Five-SeveN | Oro Barroco');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'five', 'legendaria', 'skin:five_oro' FROM `articulos_tienda` WHERE `nombre` = 'Five-SeveN | Oro Barroco'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'P90 | Selva Tropical', 'Skin comun para P90', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'P90 | Selva Tropical');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'p90', 'comun', 'skin:p90_selva' FROM `articulos_tienda` WHERE `nombre` = 'P90 | Selva Tropical'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'P90 | Tormenta de Arena', 'Skin comun para P90', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'P90 | Tormenta de Arena');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'p90', 'comun', 'skin:p90_arena' FROM `articulos_tienda` WHERE `nombre` = 'P90 | Tormenta de Arena'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'P90 | Serpiente de Fuego', 'Skin epica para P90', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'P90 | Serpiente de Fuego');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'p90', 'epica', 'skin:p90_fuego' FROM `articulos_tienda` WHERE `nombre` = 'P90 | Serpiente de Fuego'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'P90 | Carbono Carmesí', 'Skin epica para P90', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'P90 | Carbono Carmesí');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'p90', 'epica', 'skin:p90_carbono' FROM `articulos_tienda` WHERE `nombre` = 'P90 | Carbono Carmesí'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'P90 | Circuito Neón', 'Skin legendaria para P90', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'P90 | Circuito Neón');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'p90', 'legendaria', 'skin:p90_neon' FROM `articulos_tienda` WHERE `nombre` = 'P90 | Circuito Neón'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'SMG Silenciada | Tormenta de Arena', 'Skin comun para SMG Silenciada', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'SMG Silenciada | Tormenta de Arena');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'smg', 'comun', 'skin:smg_arena' FROM `articulos_tienda` WHERE `nombre` = 'SMG Silenciada | Tormenta de Arena'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'SMG Silenciada | Degradado Ártico', 'Skin comun para SMG Silenciada', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'SMG Silenciada | Degradado Ártico');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'smg', 'comun', 'skin:smg_artico' FROM `articulos_tienda` WHERE `nombre` = 'SMG Silenciada | Degradado Ártico'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'SMG Silenciada | Carbono Carmesí', 'Skin epica para SMG Silenciada', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'SMG Silenciada | Carbono Carmesí');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'smg', 'epica', 'skin:smg_carbono' FROM `articulos_tienda` WHERE `nombre` = 'SMG Silenciada | Carbono Carmesí'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'SMG Silenciada | Tigre de Bengala', 'Skin epica para SMG Silenciada', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'SMG Silenciada | Tigre de Bengala');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'smg', 'epica', 'skin:smg_tigre' FROM `articulos_tienda` WHERE `nombre` = 'SMG Silenciada | Tigre de Bengala'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'SMG Silenciada | Nebulosa del Vacío', 'Skin legendaria para SMG Silenciada', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'SMG Silenciada | Nebulosa del Vacío');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'smg', 'legendaria', 'skin:smg_galaxia' FROM `articulos_tienda` WHERE `nombre` = 'SMG Silenciada | Nebulosa del Vacío'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Escopeta Pump | Degradado Ártico', 'Skin comun para Escopeta Pump', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Escopeta Pump | Degradado Ártico');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'shotgun', 'comun', 'skin:shotgun_artico' FROM `articulos_tienda` WHERE `nombre` = 'Escopeta Pump | Degradado Ártico'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Escopeta Pump | Camuflaje Urbano', 'Skin comun para Escopeta Pump', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Escopeta Pump | Camuflaje Urbano');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'shotgun', 'comun', 'skin:shotgun_urbano' FROM `articulos_tienda` WHERE `nombre` = 'Escopeta Pump | Camuflaje Urbano'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Escopeta Pump | Tigre de Bengala', 'Skin epica para Escopeta Pump', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Escopeta Pump | Tigre de Bengala');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'shotgun', 'epica', 'skin:shotgun_tigre' FROM `articulos_tienda` WHERE `nombre` = 'Escopeta Pump | Tigre de Bengala'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Escopeta Pump | Oleaje del Océano', 'Skin epica para Escopeta Pump', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Escopeta Pump | Oleaje del Océano');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'shotgun', 'epica', 'skin:shotgun_oceano' FROM `articulos_tienda` WHERE `nombre` = 'Escopeta Pump | Oleaje del Océano'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Escopeta Pump | Residuo Tóxico', 'Skin legendaria para Escopeta Pump', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Escopeta Pump | Residuo Tóxico');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'shotgun', 'legendaria', 'skin:shotgun_toxico' FROM `articulos_tienda` WHERE `nombre` = 'Escopeta Pump | Residuo Tóxico'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Shorty | Camuflaje Urbano', 'Skin comun para Shorty', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Shorty | Camuflaje Urbano');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'shorty', 'comun', 'skin:shorty_urbano' FROM `articulos_tienda` WHERE `nombre` = 'Shorty | Camuflaje Urbano'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Shorty | Selva Tropical', 'Skin comun para Shorty', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Shorty | Selva Tropical');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'shorty', 'comun', 'skin:shorty_selva' FROM `articulos_tienda` WHERE `nombre` = 'Shorty | Selva Tropical'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Shorty | Oleaje del Océano', 'Skin epica para Shorty', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Shorty | Oleaje del Océano');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'shorty', 'epica', 'skin:shorty_oceano' FROM `articulos_tienda` WHERE `nombre` = 'Shorty | Oleaje del Océano'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Shorty | Colmena Cobalto', 'Skin epica para Shorty', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Shorty | Colmena Cobalto');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'shorty', 'epica', 'skin:shorty_cobalto' FROM `articulos_tienda` WHERE `nombre` = 'Shorty | Colmena Cobalto'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Shorty | Oro Barroco', 'Skin legendaria para Shorty', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Shorty | Oro Barroco');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'shorty', 'legendaria', 'skin:shorty_oro' FROM `articulos_tienda` WHERE `nombre` = 'Shorty | Oro Barroco'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'M4 Táctico | Selva Tropical', 'Skin comun para M4 Táctico', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'M4 Táctico | Selva Tropical');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'm4b', 'comun', 'skin:m4b_selva' FROM `articulos_tienda` WHERE `nombre` = 'M4 Táctico | Selva Tropical'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'M4 Táctico | Tormenta de Arena', 'Skin comun para M4 Táctico', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'M4 Táctico | Tormenta de Arena');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'm4b', 'comun', 'skin:m4b_arena' FROM `articulos_tienda` WHERE `nombre` = 'M4 Táctico | Tormenta de Arena'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'M4 Táctico | Colmena Cobalto', 'Skin epica para M4 Táctico', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'M4 Táctico | Colmena Cobalto');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'm4b', 'epica', 'skin:m4b_cobalto' FROM `articulos_tienda` WHERE `nombre` = 'M4 Táctico | Colmena Cobalto'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'M4 Táctico | Serpiente de Fuego', 'Skin epica para M4 Táctico', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'M4 Táctico | Serpiente de Fuego');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'm4b', 'epica', 'skin:m4b_fuego' FROM `articulos_tienda` WHERE `nombre` = 'M4 Táctico | Serpiente de Fuego'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'M4 Táctico | Circuito Neón', 'Skin legendaria para M4 Táctico', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'M4 Táctico | Circuito Neón');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'm4b', 'legendaria', 'skin:m4b_neon' FROM `articulos_tienda` WHERE `nombre` = 'M4 Táctico | Circuito Neón'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Vandal | Tormenta de Arena', 'Skin comun para Vandal', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Vandal | Tormenta de Arena');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'vandal', 'comun', 'skin:vandal_arena' FROM `articulos_tienda` WHERE `nombre` = 'Vandal | Tormenta de Arena'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Vandal | Degradado Ártico', 'Skin comun para Vandal', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Vandal | Degradado Ártico');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'vandal', 'comun', 'skin:vandal_artico' FROM `articulos_tienda` WHERE `nombre` = 'Vandal | Degradado Ártico'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Vandal | Serpiente de Fuego', 'Skin epica para Vandal', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Vandal | Serpiente de Fuego');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'vandal', 'epica', 'skin:vandal_fuego' FROM `articulos_tienda` WHERE `nombre` = 'Vandal | Serpiente de Fuego'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Vandal | Carbono Carmesí', 'Skin epica para Vandal', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Vandal | Carbono Carmesí');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'vandal', 'epica', 'skin:vandal_carbono' FROM `articulos_tienda` WHERE `nombre` = 'Vandal | Carbono Carmesí'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Vandal | Nebulosa del Vacío', 'Skin legendaria para Vandal', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Vandal | Nebulosa del Vacío');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'vandal', 'legendaria', 'skin:vandal_galaxia' FROM `articulos_tienda` WHERE `nombre` = 'Vandal | Nebulosa del Vacío'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'VSS Vintorez | Degradado Ártico', 'Skin comun para VSS Vintorez', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'VSS Vintorez | Degradado Ártico');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'vss', 'comun', 'skin:vss_artico' FROM `articulos_tienda` WHERE `nombre` = 'VSS Vintorez | Degradado Ártico'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'VSS Vintorez | Camuflaje Urbano', 'Skin comun para VSS Vintorez', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'VSS Vintorez | Camuflaje Urbano');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'vss', 'comun', 'skin:vss_urbano' FROM `articulos_tienda` WHERE `nombre` = 'VSS Vintorez | Camuflaje Urbano'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'VSS Vintorez | Carbono Carmesí', 'Skin epica para VSS Vintorez', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'VSS Vintorez | Carbono Carmesí');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'vss', 'epica', 'skin:vss_carbono' FROM `articulos_tienda` WHERE `nombre` = 'VSS Vintorez | Carbono Carmesí'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'VSS Vintorez | Tigre de Bengala', 'Skin epica para VSS Vintorez', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'VSS Vintorez | Tigre de Bengala');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'vss', 'epica', 'skin:vss_tigre' FROM `articulos_tienda` WHERE `nombre` = 'VSS Vintorez | Tigre de Bengala'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'VSS Vintorez | Residuo Tóxico', 'Skin legendaria para VSS Vintorez', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'VSS Vintorez | Residuo Tóxico');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'vss', 'legendaria', 'skin:vss_toxico' FROM `articulos_tienda` WHERE `nombre` = 'VSS Vintorez | Residuo Tóxico'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Negev | Camuflaje Urbano', 'Skin comun para Negev', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Negev | Camuflaje Urbano');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'negev', 'comun', 'skin:negev_urbano' FROM `articulos_tienda` WHERE `nombre` = 'Negev | Camuflaje Urbano'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Negev | Selva Tropical', 'Skin comun para Negev', 50, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Negev | Selva Tropical');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'negev', 'comun', 'skin:negev_selva' FROM `articulos_tienda` WHERE `nombre` = 'Negev | Selva Tropical'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Negev | Tigre de Bengala', 'Skin epica para Negev', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Negev | Tigre de Bengala');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'negev', 'epica', 'skin:negev_tigre' FROM `articulos_tienda` WHERE `nombre` = 'Negev | Tigre de Bengala'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Negev | Oleaje del Océano', 'Skin epica para Negev', 500, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Negev | Oleaje del Océano');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'negev', 'epica', 'skin:negev_oceano' FROM `articulos_tienda` WHERE `nombre` = 'Negev | Oleaje del Océano'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

INSERT INTO `articulos_tienda` (`nombre`, `descripcion`, `precio`, `tipo_moneda`, `activo`)
SELECT 'Negev | Oro Barroco', 'Skin legendaria para Negev', 1000, 'gratuita', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `articulos_tienda` WHERE `nombre` = 'Negev | Oro Barroco');
INSERT INTO `skins_armas` (`articulo_id`, `arma_base`, `rareza`, `ruta_modelo`)
SELECT `id`, 'negev', 'legendaria', 'skin:negev_oro' FROM `articulos_tienda` WHERE `nombre` = 'Negev | Oro Barroco'
ON DUPLICATE KEY UPDATE `arma_base` = VALUES(`arma_base`), `rareza` = VALUES(`rareza`), `ruta_modelo` = VALUES(`ruta_modelo`);

