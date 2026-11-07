-- FAFI 1.6: deja la base de datos en cero (sin jugadores) conservando el catalogo (tienda, skins, logros, estadisticas de armas).
-- ATENCION: BORRA TODOS los usuarios, monedas, inventarios, amigos, partidas y progreso. No se puede deshacer.
-- Uso (en el servidor, con backup previo):   mysql -u root -p fafi_1_6 < database/reset_desde_cero_2_0_0v.sql
-- Para una base totalmente nueva con Docker:   docker compose down -v && docker compose up -d --build   (recrea el volumen y vuelve a cargar los seeds)

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `logros_desbloqueados`;
TRUNCATE TABLE `partidas_jugadores`;
TRUNCATE TABLE `historial_partidas`;
TRUNCATE TABLE `historial_compras`;
TRUNCATE TABLE `inventario_jugador`;
TRUNCATE TABLE `lista_amigos`;
TRUNCATE TABLE `monedas_jugador`;
TRUNCATE TABLE `estadisticas_jugador`;
TRUNCATE TABLE `configuraciones_jugador`;
TRUNCATE TABLE `progreso_campana`;
TRUNCATE TABLE `sesiones_juego`;
TRUNCATE TABLE `usuarios`;
SET FOREIGN_KEY_CHECKS = 1;
