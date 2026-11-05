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

