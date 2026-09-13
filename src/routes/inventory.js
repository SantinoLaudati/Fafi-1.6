import express from 'express';
import { query } from '../database/config.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get user inventory with skin details
router.get('/inventory', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT ij.articulo_id, ij.fecha_adquisicion,
              art.nombre, art.descripcion, art.precio, art.tipo_moneda,
              sa.arma_base, sa.rareza, sa.ruta_modelo
       FROM inventario_jugador ij
       JOIN articulos_tienda art ON ij.articulo_id = art.id
       LEFT JOIN skins_armas sa ON art.id = sa.articulo_id
       WHERE ij.usuario_id = $1
       ORDER BY ij.fecha_adquisicion DESC`,
      [req.user.id]
    );
    
    res.json({ inventory: result.rows });
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Equip/unequip skin
router.post('/inventory/equip', authenticate, async (req, res) => {
  try {
    const { articulo_id, arma_base } = req.body;
    
    if (!articulo_id || !arma_base) {
      return res.status(400).json({ error: 'articulo_id y arma_base son requeridos' });
    }
    
    // Verify ownership
    const ownership = await query(
      'SELECT 1 FROM inventario_jugador WHERE usuario_id = $1 AND articulo_id = $2',
      [req.user.id, articulo_id]
    );
    
    if (ownership.rows.length === 0) {
      return res.status(403).json({ error: 'No posees este artículo' });
    }
    
    // Verify it's a skin for the correct weapon
    const skin = await query(
      'SELECT 1 FROM skins_armas WHERE articulo_id = $1 AND arma_base = $2',
      [articulo_id, arma_base]
    );
    
    if (skin.rows.length === 0) {
      return res.status(400).json({ error: 'Esta skin no es compatible con el arma seleccionada' });
    }
    
    // Store equipped skin in configuraciones_jugador as JSON
    const configResult = await query(
      'SELECT preferencias_ui FROM configuraciones_jugador WHERE usuario_id = $1',
      [req.user.id]
    );
    
    const prefs = configResult.rows[0]?.preferencias_ui || {};
    const equipped = prefs.equipped_skins || {};
    
    if (equipped[arma_base] === articulo_id) {
      delete equipped[arma_base];
    } else {
      equipped[arma_base] = articulo_id;
    }
    
    prefs.equipped_skins = equipped;
    
    await query(
      'UPDATE configuraciones_jugador SET preferencias_ui = $1 WHERE usuario_id = $2',
      [JSON.stringify(prefs), req.user.id]
    );
    
    res.json({ 
      message: equipped[arma_base] ? 'Skin equipada' : 'Skin desequipada',
      equipped_skins: equipped
    });
  } catch (err) {
    console.error('Equip skin error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get equipped skins
router.get('/inventory/equipped', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT preferencias_ui FROM configuraciones_jugador WHERE usuario_id = $1',
      [req.user.id]
    );
    
    const prefs = result.rows[0]?.preferencias_ui || {};
    res.json({ equipped_skins: prefs.equipped_skins || {} });
  } catch (err) {
    console.error('Get equipped error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get store items
router.get('/store', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT art.*, sa.arma_base, sa.rareza, sa.ruta_modelo
       FROM articulos_tienda art
       LEFT JOIN skins_armas sa ON art.id = sa.articulo_id
       WHERE art.activo = true
       ORDER BY art.precio ASC`
    );
    
    res.json({ items: result.rows });
  } catch (err) {
    console.error('Get store error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get user coins
router.get('/coins', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT moneda_gratuita, moneda_premium FROM monedas_jugador WHERE usuario_id = $1',
      [req.user.id]
    );
    
    res.json({ 
      coins: result.rows[0]?.moneda_gratuita || 0,
      premium_coins: result.rows[0]?.moneda_premium || 0
    });
  } catch (err) {
    console.error('Get coins error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Purchase item (open box)
router.post('/store/purchase', authenticate, async (req, res) => {
  const client = await query('BEGIN');
  
  try {
    const { articulo_id } = req.body;
    
    if (!articulo_id) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'articulo_id es requerido' });
    }
    
    // Get item details
    const itemResult = await query(
      'SELECT * FROM articulos_tienda WHERE id = $1 AND activo = true',
      [articulo_id]
    );
    
    if (itemResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    
    const item = itemResult.rows[0];
    
    // Get user coins
    const coinsResult = await query(
      'SELECT moneda_gratuita FROM monedas_jugador WHERE usuario_id = $1 FOR UPDATE',
      [req.user.id]
    );
    
    const userCoins = coinsResult.rows[0]?.moneda_gratuita || 0;
    
    if (userCoins < item.precio) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'Fondos insuficientes' });
    }
    
    // Deduct coins
    await query(
      'UPDATE monedas_jugador SET moneda_gratuita = moneda_gratuita - $1 WHERE usuario_id = $2',
      [item.precio, req.user.id]
    );
    
    // Record purchase
    await query(
      `INSERT INTO historial_compras (usuario_id, articulo_id, monto_gastado, tipo_moneda)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, item.id, item.precio, item.tipo_moneda]
    );
    
    // If it's a loot box, determine reward
    let reward = null;
    if (item.nombre.includes('Caja')) {
      reward = await openLootBox(req.user.id, item.nombre);
    } else {
      // Direct purchase - add to inventory
      await query(
        'INSERT INTO inventario_jugador (usuario_id, articulo_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, item.id]
      );
      reward = { articulo_id: item.id, nombre: item.nombre };
    }
    
    // Check achievements
    await checkAndUnlockAchievements(req.user.id, 'purchase');
    
    await query('COMMIT');
    
    // Get updated coins
    const updatedCoins = await query(
      'SELECT moneda_gratuita FROM monedas_jugador WHERE usuario_id = $1',
      [req.user.id]
    );
    
    res.json({
      message: 'Compra realizada con éxito',
      reward,
      coins: updatedCoins.rows[0].moneda_gratuita
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Purchase error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

async function openLootBox(userId, boxName) {
  // Define drop rates based on box type
  let rarities = [];
  if (boxName.includes('Básica')) {
    rarities = ['comun', 'comun', 'comun', 'comun', 'comun', 'comun', 'comun', 'comun', 'comun', 'epica'];
  } else if (boxName.includes('Avanzada')) {
    rarities = ['comun', 'comun', 'comun', 'epica', 'epica', 'epica', 'epica', 'epica', 'legendaria', 'legendaria'];
  } else if (boxName.includes('Clasificada')) {
    rarities = ['epica', 'epica', 'epica', 'legendaria', 'legendaria'];
  }
  
  const rolledRarity = rarities[Math.floor(Math.random() * rarities.length)];
  
  // Get possible skins of that rarity
  const skinsResult = await query(
    `SELECT sa.articulo_id, art.nombre, sa.arma_base, sa.rareza
     FROM skins_armas sa
     JOIN articulos_tienda art ON sa.articulo_id = art.id
     WHERE sa.rareza = $1 AND art.activo = true`,
    [rolledRarity]
  );
  
  if (skinsResult.rows.length === 0) {
    return null;
  }
  
  const wonSkin = skinsResult.rows[Math.floor(Math.random() * skinsResult.rows.length)];
  
  // Check if already owned
  const owned = await query(
    'SELECT 1 FROM inventario_jugador WHERE usuario_id = $1 AND articulo_id = $2',
    [userId, wonSkin.articulo_id]
  );
  
  if (owned.rows.length > 0) {
    // Duplicate - give refund
    const refundAmount = rolledRarity === 'legendaria' ? 400 : rolledRarity === 'epica' ? 150 : 50;
    await query(
      'UPDATE monedas_jugador SET moneda_gratuita = moneda_gratuita + $1 WHERE usuario_id = $2',
      [refundAmount, userId]
    );
    return { ...wonSkin, duplicate: true, refund: refundAmount };
  }
  
  // Add to inventory
  await query(
    'INSERT INTO inventario_jugador (usuario_id, articulo_id) VALUES ($1, $2)',
    [userId, wonSkin.articulo_id]
  );
  
  return { ...wonSkin, duplicate: false };
}

async function checkAndUnlockAchievements(userId, trigger) {
  const achievementsToCheck = {
    purchase: ['rich_boy'],
    // Add more triggers as needed
  };
  
  const achievementNames = achievementsToCheck[trigger] || [];
  
  for (const name of achievementNames) {
    const achResult = await query('SELECT id FROM logros WHERE nombre = $1', [name]);
    if (achResult.rows.length > 0) {
      await query(
        `INSERT INTO logros_desbloqueados (usuario_id, logro_id) 
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, achResult.rows[0].id]
      );
    }
  }
}

// Get purchase history
router.get('/history/purchases', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT hc.*, art.nombre as articulo_nombre
       FROM historial_compras hc
       JOIN articulos_tienda art ON hc.articulo_id = art.id
       WHERE hc.usuario_id = $1
       ORDER BY hc.fecha_compra DESC
       LIMIT 50`,
      [req.user.id]
    );
    
    res.json({ history: result.rows });
  } catch (err) {
    console.error('Get purchase history error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;