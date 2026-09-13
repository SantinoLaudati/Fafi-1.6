import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';
import { query } from '../database/config.js';

export async function authenticate(req, res, next) {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  
  // Verify user still exists and is active
  const result = await query(
    'SELECT id, username, estado FROM usuarios WHERE id = $1',
    [decoded.userId]
  );
  
  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }
  
  if (result.rows[0].estado !== 'activo') {
    return res.status(403).json({ error: 'Cuenta suspendida o baneada' });
  }
  
  req.user = {
    id: result.rows[0].id,
    username: result.rows[0].username
  };
  
  next();
}

export function optionalAuth(req, res, next) {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = { id: decoded.userId, username: decoded.username };
    }
  }
  
  next();
}