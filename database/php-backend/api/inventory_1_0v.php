<?php
/**
 * Inventory & Store API Handlers
 */

function handleInventory($method, $id, $action, $input, $user) {
    switch ($method) {
        case 'GET':
            switch ($action) {
                case 'equipped':
                    handleGetEquipped($user);
                    break;
                case 'store':
                    handleGetStore($user);
                    break;
                case 'coins':
                    handleGetCoins($user);
                    break;
                case 'history':
                    if ($id === 'purchases') {
                        handleGetPurchaseHistory($user);
                    } else {
                        http_response_code(404);
                        echo json_encode(['error' => 'Endpoint no encontrado']);
                    }
                    break;
                default:
                    if (!$action) {
                        handleGetInventory($user);
                    } else {
                        http_response_code(404);
                        echo json_encode(['error' => 'Endpoint no encontrado']);
                    }
            }
            break;
        case 'POST':
            switch ($action) {
                case 'equip':
                    handleEquipSkin($input, $user);
                    break;
                case 'purchase':
                    handlePurchase($input, $user);
                    break;
                default:
                    http_response_code(404);
                    echo json_encode(['error' => 'Endpoint no encontrado']);
            }
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Método no permitido']);
    }
}

function handleGetInventory($user) {
    $result = db()->fetchAll(
        'SELECT ij.articulo_id, ij.fecha_adquisicion,
                art.nombre, art.descripcion, art.precio, art.tipo_moneda,
                sa.arma_base, sa.rareza, sa.ruta_modelo
         FROM inventario_jugador ij
         JOIN articulos_tienda art ON ij.articulo_id = art.id
         LEFT JOIN skins_armas sa ON art.id = sa.articulo_id
         WHERE ij.usuario_id = ?
         ORDER BY ij.fecha_adquisicion DESC',
        [$user['id']]
    );
    
    echo json_encode(['inventory' => $result]);
}

function handleGetEquipped($user) {
    $result = db()->fetchOne(
        'SELECT preferencias_ui FROM configuraciones_jugador WHERE usuario_id = ?',
        [$user['id']]
    );
    
    $prefs = $result ? json_decode($result['preferencias_ui'] ?? '{}', true) : [];
    echo json_encode(['equipped_skins' => $prefs['equipped_skins'] ?? []]);
}

function handleEquipSkin($input, $user) {
    $articuloId = $input['articulo_id'] ?? null;
    $armaBase = $input['arma_base'] ?? null;
    
    if (!$articuloId || !$armaBase) {
        http_response_code(400);
        echo json_encode(['error' => 'articulo_id y arma_base son requeridos']);
        return;
    }
    
    // Verify ownership
    $ownership = db()->fetchOne(
        'SELECT 1 FROM inventario_jugador WHERE usuario_id = ? AND articulo_id = ?',
        [$user['id'], $articuloId]
    );
    
    if (!$ownership) {
        http_response_code(403);
        echo json_encode(['error' => 'No posees este artículo']);
        return;
    }
    
    // Verify it's a skin for the correct weapon
    $skin = db()->fetchOne(
        'SELECT 1 FROM skins_armas WHERE articulo_id = ? AND arma_base = ?',
        [$articuloId, $armaBase]
    );
    
    if (!$skin) {
        http_response_code(400);
        echo json_encode(['error' => 'Esta skin no es compatible con el arma seleccionada']);
        return;
    }
    
    // Update equipped skins in preferences
    $configResult = db()->fetchOne(
        'SELECT preferencias_ui FROM configuraciones_jugador WHERE usuario_id = ?',
        [$user['id']]
    );
    
    $prefs = $configResult ? json_decode($configResult['preferencias_ui'] ?? '{}', true) : [];
    $equipped = $prefs['equipped_skins'] ?? [];
    
    if (($equipped[$armaBase] ?? null) == $articuloId) {
        unset($equipped[$armaBase]);
        $message = 'Skin desequipada';
    } else {
        $equipped[$armaBase] = $articuloId;
        $message = 'Skin equipada';
    }
    
    $prefs['equipped_skins'] = $equipped;
    
    db()->query(
        'UPDATE configuraciones_jugador SET preferencias_ui = ? WHERE usuario_id = ?',
        [json_encode($prefs), $user['id']]
    );
    
    echo json_encode([
        'message' => $message,
        'equipped_skins' => $equipped
    ]);
}

function handleGetStore($user) {
    $result = db()->fetchAll(
        'SELECT art.*, sa.arma_base, sa.rareza, sa.ruta_modelo
         FROM articulos_tienda art
         LEFT JOIN skins_armas sa ON art.id = sa.articulo_id
         WHERE art.activo = 1
         ORDER BY art.precio ASC'
    );
    
    echo json_encode(['items' => $result]);
}

function handleGetCoins($user) {
    $result = db()->fetchOne(
        'SELECT moneda_gratuita, moneda_premium FROM monedas_jugador WHERE usuario_id = ?',
        [$user['id']]
    );
    
    echo json_encode([
        'coins' => $result['moneda_gratuita'] ?? 0,
        'premium_coins' => $result['moneda_premium'] ?? 0
    ]);
}

function handlePurchase($input, $user) {
    $articuloId = $input['articulo_id'] ?? null;
    
    if (!$articuloId) {
        http_response_code(400);
        echo json_encode(['error' => 'articulo_id es requerido']);
        return;
    }
    
    db()->beginTransaction();
    try {
        // Get item details
        $item = db()->fetchOne(
            'SELECT * FROM articulos_tienda WHERE id = ? AND activo = 1',
            [$articuloId]
        );
        
        if (!$item) {
            db()->rollback();
            http_response_code(404);
            echo json_encode(['error' => 'Artículo no encontrado']);
            return;
        }
        
        // Get user coins with lock
        $coinsResult = db()->fetchOne(
            'SELECT moneda_gratuita FROM monedas_jugador WHERE usuario_id = ? FOR UPDATE',
            [$user['id']]
        );
        
        $userCoins = $coinsResult['moneda_gratuita'] ?? 0;
        
        if ($userCoins < $item['precio']) {
            db()->rollback();
            http_response_code(400);
            echo json_encode(['error' => 'Fondos insuficientes']);
            return;
        }
        
        // Deduct coins
        db()->query(
            'UPDATE monedas_jugador SET moneda_gratuita = moneda_gratuita - ? WHERE usuario_id = ?',
            [$item['precio'], $user['id']]
        );
        
        // Record purchase
        db()->insert('historial_compras', [
            'usuario_id' => $user['id'],
            'articulo_id' => $item['id'],
            'monto_gastado' => $item['precio'],
            'tipo_moneda' => $item['tipo_moneda']
        ]);
        
        // If it's a loot box, determine reward
        $reward = null;
        if (strpos($item['nombre'], 'Caja') !== false) {
            $reward = openLootBox($user['id'], $item['nombre']);
        } else {
            // Direct purchase - add to inventory
            db()->query(
                'INSERT IGNORE INTO inventario_jugador (usuario_id, articulo_id) VALUES (?, ?)',
                [$user['id'], $item['id']]
            );
            $reward = ['articulo_id' => $item['id'], 'nombre' => $item['nombre']];
        }
        
        // Check achievements
        checkAndUnlockAchievements($user['id'], 'purchase');
        
        db()->commit();
        
        // Get updated coins
        $updatedCoins = db()->fetchOne(
            'SELECT moneda_gratuita FROM monedas_jugador WHERE usuario_id = ?',
            [$user['id']]
        );
        
        echo json_encode([
            'message' => 'Compra realizada con éxito',
            'reward' => $reward,
            'coins' => $updatedCoins['moneda_gratuita']
        ]);
    } catch (Exception $e) {
        db()->rollback();
        throw $e;
    }
}

function openLootBox($userId, $boxName) {
    // Define drop rates based on box type
    $rarities = [];
    if (strpos($boxName, 'Básica') !== false) {
        $rarities = ['comun', 'comun', 'comun', 'comun', 'comun', 'comun', 'comun', 'comun', 'comun', 'epica'];
    } elseif (strpos($boxName, 'Avanzada') !== false) {
        $rarities = ['comun', 'comun', 'comun', 'epica', 'epica', 'epica', 'epica', 'epica', 'legendaria', 'legendaria'];
    } elseif (strpos($boxName, 'Clasificada') !== false) {
        $rarities = ['epica', 'epica', 'epica', 'legendaria', 'legendaria'];
    }
    
    $rolledRarity = $rarities[array_rand($rarities)];
    
    // Get possible skins of that rarity
    $skins = db()->fetchAll(
        'SELECT sa.articulo_id, art.nombre, sa.arma_base, sa.rareza
         FROM skins_armas sa
         JOIN articulos_tienda art ON sa.articulo_id = art.id
         WHERE sa.rareza = ? AND art.activo = 1',
        [$rolledRarity]
    );
    
    if (empty($skins)) {
        return null;
    }
    
    $wonSkin = $skins[array_rand($skins)];
    
    // Check if already owned
    $owned = db()->fetchOne(
        'SELECT 1 FROM inventario_jugador WHERE usuario_id = ? AND articulo_id = ?',
        [$userId, $wonSkin['articulo_id']]
    );
    
    if ($owned) {
        // Duplicate - give refund
        $refundAmount = match($rolledRarity) {
            'legendaria' => 400,
            'epica' => 150,
            default => 50
        };
        db()->query(
            'UPDATE monedas_jugador SET moneda_gratuita = moneda_gratuita + ? WHERE usuario_id = ?',
            [$refundAmount, $userId]
        );
        return array_merge($wonSkin, ['duplicate' => true, 'refund' => $refundAmount]);
    }
    
    // Add to inventory
    db()->query(
        'INSERT INTO inventario_jugador (usuario_id, articulo_id) VALUES (?, ?)',
        [$userId, $wonSkin['articulo_id']]
    );
    
    return array_merge($wonSkin, ['duplicate' => false]);
}

function checkAndUnlockAchievements($userId, $trigger) {
    $achievementsToCheck = [
        'purchase' => ['rich_boy'],
    ];
    
    $achievementNames = $achievementsToCheck[$trigger] ?? [];
    
    foreach ($achievementNames as $name) {
        $ach = db()->fetchOne('SELECT id FROM logros WHERE nombre = ?', [$name]);
        if ($ach) {
            db()->query(
                'INSERT IGNORE INTO logros_desbloqueados (usuario_id, logro_id) VALUES (?, ?)',
                [$userId, $ach['id']]
            );
        }
    }
}

function handleGetPurchaseHistory($user) {
    $result = db()->fetchAll(
        'SELECT hc.*, art.nombre as articulo_nombre
         FROM historial_compras hc
         JOIN articulos_tienda art ON hc.articulo_id = art.id
         WHERE hc.usuario_id = ?
         ORDER BY hc.fecha_compra DESC
         LIMIT 50',
        [$user['id']]
    );
    
    echo json_encode(['history' => $result]);
}