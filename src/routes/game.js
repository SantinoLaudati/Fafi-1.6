import express from 'express';
import { query } from '../database/config.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get campaign progress
router.get('/campaign', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM progreso_campana WHERE usuario_id = $1',
      [req.user.id]
    );
    
    let progress = result.rows[0] || { 
      usuario_id: req.user.id, 
      ultimo_nivel: 1, 
      dificultad: 'normal', 
      misiones_completadas: [] 
    };
    
    res.json({ progress });
  } catch (err) {
    console.error('Get campaign error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Complete campaign level
router.post('/campaign/complete', authenticate, async (req, res) => {
  try {
    const { nivel, dificultad } = req.body;
    
    if (!nivel || nivel < 1) {
      return res.status(400).json({ error: 'Nivel inválido' });
    }
    
    // Get current progress
    const currentResult = await query(
      'SELECT * FROM progreso_campana WHERE usuario_id = $1',
      [req.user.id]
    );
    
    let currentLevel = currentResult.rows[0]?.ultimo_nivel || 1;
    let misiones = currentResult.rows[0]?.misiones_completadas || [];
    
    // Only allow completing next level or replaying completed
    if (nivel > currentLevel + 1) {
      return res.status(400).json({ error: 'Debes completar los niveles en orden' });
    }
    
    // Add to completed missions if not already
    if (!misiones.includes(nivel)) {
      misiones.push(nivel);
    }
    
    // Update progress
    if (nivel >= currentLevel) {
      currentLevel = nivel + 1;
    }
    
    await query(
      `INSERT INTO progreso_campana (usuario_id, ultimo_nivel, dificultad, misiones_completadas)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (usuario_id) DO UPDATE SET
         ultimo_nivel = $2,
         dificultad = $3,
         misiones_completadas = $4`,
      [req.user.id, currentLevel, dificultad || 'normal', JSON.stringify(misiones)]
    );
    
    // Award coins for completion
    const coinReward = nivel * 100;
    await query(
      'UPDATE monedas_jugador SET moneda_gratuita = moneda_gratuita + $1 WHERE usuario_id = $2',
      [coinReward, req.user.id]
    );
    
    // Check achievement
    await query(
      `INSERT INTO logros_desbloqueados (usuario_id, logro_id)
       SELECT $1, id FROM logros WHERE nombre = 'campaign_hero'
       ON CONFLICT DO NOTHING`,
      [req.user.id]
    );
    
    const coinsResult = await query(
      'SELECT moneda_gratuita FROM monedas_jugador WHERE usuario_id = $1',
      [req.user.id]
    );
    
    res.json({
      message: `¡Nivel ${nivel} completado!`,
      progress: { ultimo_nivel: currentLevel, misiones_completadas: misiones },
      reward: { coins: coinReward },
      total_coins: coinsResult.rows[0].moneda_gratuita
    });
  } catch (err) {
    console.error('Complete campaign error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get player stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, u.username
       FROM estadisticas_jugador e
       JOIN usuarios u ON e.usuario_id = u.id
       WHERE e.usuario_id = $1`,
      [req.user.id]
    );
    
    // Get weapon stats
    const weaponStats = await query(
      `SELECT sa.nombre_arma, sa.dano_base, sa.cadencia_tiro, sa.retroceso_vertical, sa.retroceso_horizontal, sa.dispersion
       FROM estadisticas_armas sa
       ORDER BY sa.nombre_arma`
    );
    
    res.json({ 
      stats: result.rows[0] || {},
      weapons: weaponStats.rows
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update stats (called after match)
router.post('/stats/update', authenticate, async (req, res) => {
  try {
    const { bajas, muertes, partidas_ganadas, precision, tiempo_jugado, dano_infligido } = req.body;
    
    await query(
      `UPDATE estadisticas_jugador SET
         bajas = bajas + COALESCE($1, 0),
         muertes = muertes + COALESCE($2, 0),
         partidas_ganadas = partidas_ganadas + COALESCE($3, 0),
         precision_general = CASE 
           WHEN (bajas + COALESCE($1, 0)) + (muertes + COALESCE($2, 0)) > 0
           THEN ROUND(((bajas + COALESCE($1, 0))::numeric / ((bajas + COALESCE($1, 0)) + (muertes + COALESCE($2, 0)))) * 100, 2)
           ELSE precision_general
         END,
         tiempo_jugado_minutos = tiempo_jugado_minutos + COALESCE($6, 0)
       WHERE usuario_id = $7`,
      [bajas, muertes, partidas_ganadas, precision, dano_infligido, tiempo_jugado, req.user.id]
    );
    
    // Check achievements
    const statsResult = await query(
      'SELECT bajas, partidas_ganadas FROM estadisticas_jugador WHERE usuario_id = $1',
      [req.user.id]
    );
    
    const stats = statsResult.rows[0];
    const achievementsToUnlock = [];
    
    if (stats.bajas >= 100) achievementsToUnlock.push('sharpshooter');
    if (stats.partidas_ganadas >= 100) achievementsToUnlock.push('veteran');
    
    for (const achName of achievementsToUnlock) {
      await query(
        `INSERT INTO logros_desbloqueados (usuario_id, logro_id)
         SELECT $1, id FROM logros WHERE nombre = $2
         ON CONFLICT DO NOTHING`,
        [req.user.id, achName]
      );
    }
    
    res.json({ message: 'Estadísticas actualizadas' });
  } catch (err) {
    console.error('Update stats error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'kills', limit = 50 } = req.query;
    
    let orderBy = 'e.bajas DESC';
    if (type === 'wins') orderBy = 'e.partidas_ganadas DESC';
    else if (type === 'kd') orderBy = 'CASE WHEN e.muertes > 0 THEN e.bajas::numeric / e.muertes ELSE e.bajas END DESC';
    
    const result = await query(
      `SELECT u.username, e.bajas, e.muertes, e.partidas_ganadas, e.precision_general,
              CASE WHEN e.muertes > 0 THEN ROUND(e.bajas::numeric / e.muertes, 2) ELSE e.bajas END as kd_ratio
       FROM estadisticas_jugador e
       JOIN usuarios u ON e.usuario_id = u.id
       WHERE u.estado = 'activo'
       ORDER BY ${orderBy}
       LIMIT $1`,
      [parseInt(limit)]
    );
    
    res.json({ leaderboard: result.rows });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Match history
router.get('/matches', authenticate, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const result = await query(
      `SELECT pj.*, hp.mapa, hp.modo_juego, hp.duracion_segundos, hp.equipo_ganador, hp.fecha
       FROM partidas_jugadores pj
       JOIN historial_partidas hp ON pj.partida_id = hp.id
       WHERE pj.usuario_id = $1
       ORDER BY hp.fecha DESC
       LIMIT $2`,
      [req.user.id, parseInt(limit)]
    );
    
    res.json({ matches: result.rows });
  } catch (err) {
    console.error('Match history error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Save match result (called by game server)
router.post('/matches', authenticate, async (req, res) => {
  try {
    const { mapa, modo_juego, duracion_segundos, equipo_ganador, 
            equipo, bajas, muertes, asistencias, dano_infligido, precision } = req.body;
    
    // Create match record
    const matchResult = await query(
      `INSERT INTO historial_partidas (mapa, modo_juego, duracion_segundos, equipo_ganador)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [mapa, modo_juego, duracion_segundos, equipo_ganador]
    );
    
    const matchId = matchResult.rows[0].id;
    
    // Create player match record
    await query(
      `INSERT INTO partidas_jugadores 
       (partida_id, usuario_id, equipo, bajas, muertes, asistencias, dano_infligido, precision)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [matchId, req.user.id, equipo, bajas, muertes, asistencias, dano_infligido, precision]
    );
    
    // Update player stats
    await query(
      `UPDATE estadisticas_jugador SET
         bajas = bajas + $1,
         muertes = muertes + $2,
         partidas_ganadas = partidas_ganadas + $3
       WHERE usuario_id = $4`,
      [bajas, muertes, equipo === equipo_ganador ? 1 : 0, req.user.id]
    );
    
    res.status(201).json({ match_id: matchId, message: 'Partida guardada' });
  } catch (err) {
    console.error('Save match error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get player config
router.get('/config', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM configuraciones_jugador WHERE usuario_id = $1',
      [req.user.id]
    );
    
    res.json({ config: result.rows[0] || {} });
  } catch (err) {
    console.error('Get config error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update player config
router.put('/config', authenticate, async (req, res) => {
  try {
    const { sensibilidad_mouse, fov, atajos_teclado, mira, preferencias_ui } = req.body;
    
    await query(
      `INSERT INTO configuraciones_jugador (usuario_id, sensibilidad_mouse, fov, atajos_teclado, mira, preferencias_ui)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (usuario_id) DO UPDATE SET
         sensibilidad_mouse = COALESCE($2, configuraciones_jugador.sensibilidad_mouse),
         fov = COALESCE($3, configuraciones_jugador.fov),
         atajos_teclado = COALESCE($4, configuraciones_jugador.atajos_teclado),
         mira = COALESCE($5, configuraciones_jugador.mira),
         preferencias_ui = COALESCE($6, configuraciones_jugador.preferencias_ui)`,
      [req.user.id, sensibilidad_mouse, fov, 
       atajos_teclado ? JSON.stringify(atajos_teclado) : null,
       mira ? JSON.stringify(mira) : null,
       preferencias_ui ? JSON.stringify(preferencias_ui) : null]
    );
    
    res.json({ message: 'Configuración guardada' });
  } catch (err) {
    console.error('Update config error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;