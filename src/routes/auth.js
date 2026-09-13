import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../database/config.js';
import { generateToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Usuario, email y contraseña son requeridos' });
    }
    
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'El usuario debe tener entre 3 y 20 caracteres' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    
    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM usuarios WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'El usuario o email ya está registrado' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user
    const result = await query(
      `INSERT INTO usuarios (username, email, password_hash) 
       VALUES ($1, $2, $3) RETURNING id, username`,
      [username, email, passwordHash]
    );
    
    const user = result.rows[0];
    
    // Create default related records
    await query('INSERT INTO configuraciones_jugador (usuario_id) VALUES ($1)', [user.id]);
    await query('INSERT INTO progreso_campana (usuario_id) VALUES ($1)', [user.id]);
    await query('INSERT INTO estadisticas_jugador (usuario_id) VALUES ($1)', [user.id]);
    await query('INSERT INTO monedas_jugador (usuario_id, moneda_gratuita) VALUES ($1, 2000)', [user.id]);
    
    // Give starter items
    const starterItems = await query(
      `SELECT id FROM articulos_tienda WHERE nombre IN ('Vandal Desierto', 'AK-47 Táctica', 'Sniper Camuflaje') AND activo = true`
    );
    
    for (const item of starterItems.rows) {
      await query(
        'INSERT INTO inventario_jugador (usuario_id, articulo_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [user.id, item.id]
      );
    }
    
    const token = generateToken({ userId: user.id, username: user.username });
    
    res.status(201).json({
      user: { id: user.id, username: user.username },
      token,
      message: 'Cuenta creada exitosamente'
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }
    
    const result = await query(
      'SELECT id, username, password_hash, estado FROM usuarios WHERE username = $1 OR email = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const user = result.rows[0];
    
    if (user.estado !== 'activo') {
      return res.status(403).json({ error: 'Cuenta suspendida o baneada' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const token = generateToken({ userId: user.id, username: user.username });
    
    res.json({
      user: { id: user.id, username: user.username },
      token,
      message: 'Inicio de sesión exitoso'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.email, u.estado, u.fecha_creacion,
              e.bajas, e.muertes, e.partidas_ganadas, e.precision_general, e.tiempo_jugado_minutos,
              m.moneda_gratuita, m.moneda_premium
       FROM usuarios u
       JOIN estadisticas_jugador e ON u.id = e.usuario_id
       JOIN monedas_jugador m ON u.id = m.usuario_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }
    
    const result = await query(
      'SELECT password_hash FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    
    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }
    
    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);
    
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;