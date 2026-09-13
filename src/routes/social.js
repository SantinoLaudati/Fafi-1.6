import express from 'express';
import { query } from '../database/config.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get friends list
router.get('/friends', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT la.amigo_id, la.estado, la.fecha_solicitud,
              u.username, u.estado as user_estado
       FROM lista_amigos la
       JOIN usuarios u ON la.amigo_id = u.id
       WHERE la.usuario_id = $1
       ORDER BY 
         CASE la.estado WHEN 'aceptada' THEN 0 WHEN 'pendiente' THEN 1 ELSE 2 END,
         la.fecha_solicitud DESC`,
      [req.user.id]
    );
    
    res.json({ friends: result.rows });
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Send friend request
router.post('/friends', authenticate, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Nombre de usuario requerido' });
    }
    
    if (username === req.user.username) {
      return res.status(400).json({ error: 'No puedes agregarte a ti mismo' });
    }
    
    // Find target user
    const targetResult = await query(
      'SELECT id FROM usuarios WHERE username = $1',
      [username]
    );
    
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const targetId = targetResult.rows[0].id;
    
    // Check if already friends or pending
    const existing = await query(
      `SELECT * FROM lista_amigos 
       WHERE (usuario_id = $1 AND amigo_id = $2) OR (usuario_id = $2 AND amigo_id = $1)`,
      [req.user.id, targetId]
    );
    
    if (existing.rows.length > 0) {
      const status = existing.rows[0].estado;
      if (status === 'aceptada') {
        return res.status(409).json({ error: 'Ya son amigos' });
      } else if (status === 'pendiente') {
        return res.status(409).json({ error: 'Solicitud ya enviada o pendiente' });
      } else if (status === 'bloqueada') {
        return res.status(403).json({ error: 'No puedes agregar a este usuario' });
      }
    }
    
    // Create friend request
    await query(
      'INSERT INTO lista_amigos (usuario_id, amigo_id, estado) VALUES ($1, $2, $3)',
      [req.user.id, targetId, 'pendiente']
    );
    
    res.status(201).json({ message: 'Solicitud de amistad enviada' });
  } catch (err) {
    console.error('Add friend error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Accept friend request
router.put('/friends/:friendId/accept', authenticate, async (req, res) => {
  try {
    const friendId = parseInt(req.params.friendId);
    
    // Check if request exists (friend sent request to user)
    const request = await query(
      'SELECT * FROM lista_amigos WHERE usuario_id = $1 AND amigo_id = $2 AND estado = $3',
      [friendId, req.user.id, 'pendiente']
    );
    
    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    
    // Update both directions to accepted
    await query(
      `INSERT INTO lista_amigos (usuario_id, amigo_id, estado) VALUES ($1, $2, 'aceptada')
       ON CONFLICT (usuario_id, amigo_id) DO UPDATE SET estado = 'aceptada'`,
      [req.user.id, friendId]
    );
    
    await query(
      `UPDATE lista_amigos SET estado = 'aceptada' WHERE usuario_id = $1 AND amigo_id = $2`,
      [friendId, req.user.id]
    );
    
    res.json({ message: 'Solicitud aceptada, ahora son amigos' });
  } catch (err) {
    console.error('Accept friend error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Reject/remove friend
router.delete('/friends/:friendId', authenticate, async (req, res) => {
  try {
    const friendId = parseInt(req.params.friendId);
    
    // Remove both directions
    await query(
      'DELETE FROM lista_amigos WHERE (usuario_id = $1 AND amigo_id = $2) OR (usuario_id = $2 AND amigo_id = $1)',
      [req.user.id, friendId]
    );
    
    res.json({ message: 'Amistad eliminada / solicitud rechazada' });
  } catch (err) {
    console.error('Remove friend error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Block user
router.put('/friends/:friendId/block', authenticate, async (req, res) => {
  try {
    const friendId = parseInt(req.params.friendId);
    
    await query(
      `INSERT INTO lista_amigos (usuario_id, amigo_id, estado) VALUES ($1, $2, 'bloqueada')
       ON CONFLICT (usuario_id, amigo_id) DO UPDATE SET estado = 'bloqueada'`,
      [req.user.id, friendId]
    );
    
    // Remove reverse if exists
    await query(
      'DELETE FROM lista_amigos WHERE usuario_id = $1 AND amigo_id = $2',
      [friendId, req.user.id]
    );
    
    res.json({ message: 'Usuario bloqueado' });
  } catch (err) {
    console.error('Block user error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get achievements
router.get('/achievements', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT l.id, l.nombre, l.descripcion,
              ld.fecha_desbloqueo,
              CASE WHEN ld.usuario_id IS NOT NULL THEN true ELSE false END as unlocked
       FROM logros l
       LEFT JOIN logros_desbloqueados ld ON l.id = ld.logro_id AND ld.usuario_id = $1
       ORDER BY unlocked DESC, l.nombre`,
      [req.user.id]
    );
    
    res.json({ achievements: result.rows });
  } catch (err) {
    console.error('Get achievements error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Search users (for adding friends)
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Consulta muy corta (mínimo 2 caracteres)' });
    }
    
    const result = await query(
      `SELECT id, username, estado 
       FROM usuarios 
       WHERE username ILIKE $1 AND id != $2
       LIMIT 10`,
      [`%${q}%`, req.user.id]
    );
    
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;