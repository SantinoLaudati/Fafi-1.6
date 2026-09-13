-- Fafi-1.6 MySQL Seed Data
-- Run after schema_mysql.sql

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