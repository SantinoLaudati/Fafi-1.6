<?php
/**
 * Game API Handlers (Campaign, Stats, Leaderboards, Matches, Config)
 */

function handleGame($method, $id, $action, $input, $user) {
    switch ($method) {
        case 'GET':
            switch ($action) {
                case 'campaign':
                    handleGetCampaign($user);
                    break;
                case 'stats':
                    handleGetStats($user);
                    break;
                case 'leaderboard':
                    handleLeaderboard($_GET['type'] ?? 'kills', $_GET['limit'] ?? 50);
                    break;
                case 'matches':
                    handleGetMatches($user, $_GET['limit'] ?? 20);
                    break;
                case 'config':
                    handleGetConfig($user);
                    break;
                default:
                    http_response_code(404);
                    echo json_encode(['error' => 'Endpoint no encontrado']);
            }
            break;
        case 'POST':
            switch ($action) {
                case 'complete':
                    if ($id === 'campaign') {
                        handleCompleteCampaign($input, $user);
                    } else {
                        http_response_code(404);
                        echo json_encode(['error' => 'Endpoint no encontrado']);
                    }
                    break;
                case 'update':
                    if ($id === 'stats') {
                        handleUpdateStats($input, $user);
                    } else {
                        http_response_code(404);
                        echo json_encode(['error' => 'Endpoint no encontrado']);
                    }
                    break;
                case 'matches':
                    handleSaveMatch($input, $user);
                    break;
                case 'earn':
                    if ($id === 'coins') {
                        handleAwardCoins($input, $user);
                    } else {
                        http_response_code(404);
                        echo json_encode(['error' => 'Endpoint no encontrado']);
                    }
                    break;
                default:
                    http_response_code(404);
                    echo json_encode(['error' => 'Endpoint no encontrado']);
            }
            break;
        case 'PUT':
            if ($action === 'config') {
                handleUpdateConfig($input, $user);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Endpoint no encontrado']);
            }
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Método no permitido']);
    }
}

function handleGetCampaign($user) {
    $result = db()->fetchOne(
        'SELECT * FROM progreso_campana WHERE usuario_id = ?',
        [$user['id']]
    );
    
    $progress = $result ?? [
        'usuario_id' => $user['id'],
        'ultimo_nivel' => 1,
        'dificultad' => 'normal',
        'misiones_completadas' => []
    ];
    
    // Parse JSON field
    if (isset($progress['misiones_completadas']) && is_string($progress['misiones_completadas'])) {
        $progress['misiones_completadas'] = json_decode($progress['misiones_completadas'], true) ?? [];
    }
    
    echo json_encode(['progress' => $progress]);
}

function handleCompleteCampaign($input, $user) {
    $nivel = (int)($input['nivel'] ?? 0);
    $dificultad = $input['dificultad'] ?? 'normal';
    
    if ($nivel < 1) {
        http_response_code(400);
        echo json_encode(['error' => 'Nivel inválido']);
        return;
    }
    
    // Get current progress
    $current = db()->fetchOne(
        'SELECT * FROM progreso_campana WHERE usuario_id = ?',
        [$user['id']]
    );
    
    $currentLevel = $current['ultimo_nivel'] ?? 1;
    $misiones = $current['misiones_completadas'] ? json_decode($current['misiones_completadas'], true) : [];
    
    // Only allow completing next level or replaying completed
    if ($nivel > $currentLevel + 1) {
        http_response_code(400);
        echo json_encode(['error' => 'Debes completar los niveles en orden']);
        return;
    }
    
    // Add to completed missions if not already
    if (!in_array($nivel, $misiones)) {
        $misiones[] = $nivel;
    }
    
    // Update progress
    if ($nivel >= $currentLevel) {
        $currentLevel = $nivel + 1;
    }
    
    db()->query(
        'INSERT INTO progreso_campana (usuario_id, ultimo_nivel, dificultad, misiones_completadas)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           ultimo_nivel = VALUES(ultimo_nivel),
           dificultad = VALUES(dificultad),
           misiones_completadas = VALUES(misiones_completadas)',
        [$user['id'], $currentLevel, $dificultad, json_encode($misiones)]
    );
    
    // Award coins for completion
    $coinReward = $nivel * 100;
    db()->query(
        'UPDATE monedas_jugador SET moneda_gratuita = moneda_gratuita + ? WHERE usuario_id = ?',
        [$coinReward, $user['id']]
    );
    
    // Check achievement
    $ach = db()->fetchOne('SELECT id FROM logros WHERE nombre = ?', ['campaign_hero']);
    if ($ach) {
        db()->query(
            'INSERT IGNORE INTO logros_desbloqueados (usuario_id, logro_id) VALUES (?, ?)',
            [$user['id'], $ach['id']]
        );
    }
    
    $coinsResult = db()->fetchOne(
        'SELECT moneda_gratuita FROM monedas_jugador WHERE usuario_id = ?',
        [$user['id']]
    );
    
    echo json_encode([
        'message' => "¡Nivel {$nivel} completado!",
        'progress' => ['ultimo_nivel' => $currentLevel, 'misiones_completadas' => $misiones],
        'reward' => ['coins' => $coinReward],
        'total_coins' => $coinsResult['moneda_gratuita']
    ]);
}

function handleGetStats($user) {
    $result = db()->fetchOne(
        'SELECT e.*, u.username
         FROM estadisticas_jugador e
         JOIN usuarios u ON e.usuario_id = u.id
         WHERE e.usuario_id = ?',
        [$user['id']]
    );
    
    // Get weapon stats
    $weaponStats = db()->fetchAll(
        'SELECT nombre_arma, dano_base, cadencia_tiro, retroceso_vertical, retroceso_horizontal, dispersion
         FROM estadisticas_armas
         ORDER BY nombre_arma'
    );
    
    echo json_encode([
        'stats' => $result ?? [],
        'weapons' => $weaponStats
    ]);
}

function handleUpdateStats($input, $user) {
    $bajas = (int)($input['bajas'] ?? 0);
    $muertes = (int)($input['muertes'] ?? 0);
    $partidasGanadas = (int)($input['partidas_ganadas'] ?? 0);
    $precision = (float)($input['precision'] ?? 0);
    $tiempoJugado = (int)($input['tiempo_jugado'] ?? 0);
    $danoInfligido = (int)($input['dano_infligido'] ?? 0);
    
    // Calculate new precision
    $currentStats = db()->fetchOne(
        'SELECT bajas, muertes FROM estadisticas_jugador WHERE usuario_id = ?',
        [$user['id']]
    );
    
    $totalKills = ($currentStats['bajas'] ?? 0) + $bajas;
    $totalDeaths = ($currentStats['muertes'] ?? 0) + $muertes;
    $newPrecision = ($totalKills + $totalDeaths > 0) 
        ? round(($totalKills / ($totalKills + $totalDeaths)) * 100, 2)
        : 0;
    
    db()->query(
        'UPDATE estadisticas_jugador SET
            bajas = bajas + ?,
            muertes = muertes + ?,
            partidas_ganadas = partidas_ganadas + ?,
            precision_general = ?,
            tiempo_jugado_minutos = tiempo_jugado_minutos + ?
         WHERE usuario_id = ?',
        [$bajas, $muertes, $partidasGanadas, $newPrecision, $tiempoJugado, $user['id']]
    );
    
    // Check achievements
    $stats = db()->fetchOne('SELECT bajas, partidas_ganadas FROM estadisticas_jugador WHERE usuario_id = ?', [$user['id']]);
    $achievementsToUnlock = [];
    
    if ($stats['bajas'] >= 100) $achievementsToUnlock[] = 'sharpshooter';
    if ($stats['partidas_ganadas'] >= 100) $achievementsToUnlock[] = 'veteran';
    if (($coinsResult = db()->fetchOne('SELECT moneda_gratuita FROM monedas_jugador WHERE usuario_id = ?', [$user['id']])) && $coinsResult['moneda_gratuita'] >= 10000) {
        $achievementsToUnlock[] = 'rich';
    }
    
    foreach ($achievementsToUnlock as $achName) {
        $ach = db()->fetchOne('SELECT id FROM logros WHERE nombre = ?', [$achName]);
        if ($ach) {
            db()->query(
                'INSERT IGNORE INTO logros_desbloqueados (usuario_id, logro_id) VALUES (?, ?)',
                [$user['id'], $ach['id']]
            );
        }
    }
    
    echo json_encode(['message' => 'Estadísticas actualizadas']);
}

function handleLeaderboard($type, $limit) {
    $limit = min((int)$limit, 100);
    
    $orderBy = match($type) {
        'wins' => 'e.partidas_ganadas DESC',
        'kd' => 'CASE WHEN e.muertes > 0 THEN e.bajas / e.muertes ELSE e.bajas END DESC',
        default => 'e.bajas DESC'
    };
    
    $result = db()->fetchAll(
        "SELECT u.username, e.bajas, e.muertes, e.partidas_ganadas, e.precision_general,
                CASE WHEN e.muertes > 0 THEN ROUND(e.bajas / e.muertes, 2) ELSE e.bajas END as kd_ratio
         FROM estadisticas_jugador e
         JOIN usuarios u ON e.usuario_id = u.id
         WHERE u.estado = 'activo'
         ORDER BY {$orderBy}
         LIMIT ?",
        [$limit]
    );
    
    echo json_encode(['leaderboard' => $result]);
}

function handleGetMatches($user, $limit) {
    $limit = min((int)$limit, 50);
    
    $result = db()->fetchAll(
        'SELECT pj.*, hp.mapa, hp.modo_juego, hp.duracion_segundos, hp.equipo_ganador, hp.fecha
         FROM partidas_jugadores pj
         JOIN historial_partidas hp ON pj.partida_id = hp.id
         WHERE pj.usuario_id = ?
         ORDER BY hp.fecha DESC
         LIMIT ?',
        [$user['id'], $limit]
    );
    
    echo json_encode(['matches' => $result]);
}

function handleSaveMatch($input, $user) {
    $mapa = $input['mapa'] ?? '';
    $modoJuego = $input['modo_juego'] ?? '';
    $duracion = (int)($input['duracion_segundos'] ?? 0);
    $equipoGanador = $input['equipo_ganador'] ?? '';
    $equipo = $input['equipo'] ?? '';
    $bajas = (int)($input['bajas'] ?? 0);
    $muertes = (int)($input['muertes'] ?? 0);
    $asistencias = (int)($input['asistencias'] ?? 0);
    $danoInfligido = (int)($input['dano_infligido'] ?? 0);
    $precision = (float)($input['precision'] ?? 0);
    
    if (!$mapa || !$modoJuego || !$duracion) {
        http_response_code(400);
        echo json_encode(['error' => 'Datos de partida incompletos']);
        return;
    }
    
    db()->beginTransaction();
    try {
        // Create match record
        $matchId = db()->insert('historial_partidas', [
            'mapa' => $mapa,
            'modo_juego' => $modoJuego,
            'duracion_segundos' => $duracion,
            'equipo_ganador' => $equipoGanador
        ]);
        
        // Create player match record
        db()->insert('partidas_jugadores', [
            'partida_id' => $matchId,
            'usuario_id' => $user['id'],
            'equipo' => $equipo,
            'bajas' => $bajas,
            'muertes' => $muertes,
            'asistencias' => $asistencias,
            'dano_infligido' => $danoInfligido,
            'precision' => $precision
        ]);
        
        // Update player stats
        db()->query(
            'UPDATE estadisticas_jugador SET
                bajas = bajas + ?,
                muertes = muertes + ?,
                partidas_ganadas = partidas_ganadas + ?
             WHERE usuario_id = ?',
            [$bajas, $muertes, $equipo === $equipoGanador ? 1 : 0, $user['id']]
        );
        
        db()->commit();
        
        http_response_code(201);
        echo json_encode(['match_id' => $matchId, 'message' => 'Partida guardada']);
    } catch (Exception $e) {
        db()->rollback();
        throw $e;
    }
}

function handleAwardCoins($input, $user) {
    $coins = (int)($input['coins'] ?? 0);

    if ($coins <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Cantidad inválida']);
        return;
    }

    $coins = min($coins, 500);

    db()->query(
        'UPDATE monedas_jugador SET moneda_gratuita = moneda_gratuita + ? WHERE usuario_id = ?',
        [$coins, $user['id']]
    );

    $result = db()->fetchOne(
        'SELECT moneda_gratuita FROM monedas_jugador WHERE usuario_id = ?',
        [$user['id']]
    );

    echo json_encode([
        'message' => 'Coins añadidos',
        'coins' => $result['moneda_gratuita']
    ]);
}

function handleGetConfig($user) {
    $result = db()->fetchOne(
        'SELECT * FROM configuraciones_jugador WHERE usuario_id = ?',
        [$user['id']]
    );
    
    // Parse JSON fields
    if ($result) {
        foreach (['preferencias_ui', 'atajos_teclado', 'mira'] as $field) {
            if (isset($result[$field]) && is_string($result[$field])) {
                $result[$field] = json_decode($result[$field], true) ?? [];
            }
        }
    }
    
    echo json_encode(['config' => $result ?? []]);
}

function handleUpdateConfig($input, $user) {
    $data = [];
    
    if (isset($input['sensibilidad_mouse'])) $data['sensibilidad_mouse'] = (float)$input['sensibilidad_mouse'];
    if (isset($input['fov'])) $data['fov'] = (int)$input['fov'];
    if (isset($input['atajos_teclado'])) $data['atajos_teclado'] = json_encode($input['atajos_teclado']);
    if (isset($input['mira'])) $data['mira'] = json_encode($input['mira']);
    if (isset($input['preferencias_ui'])) $data['preferencias_ui'] = json_encode($input['preferencias_ui']);
    
    if (empty($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'No hay datos para actualizar']);
        return;
    }
    
    // Build dynamic update
    $setParts = [];
    $params = [];
    foreach ($data as $key => $value) {
        $setParts[] = "{$key} = ?";
        $params[] = $value;
    }
    $params[] = $user['id'];
    
    db()->query(
        "INSERT INTO configuraciones_jugador (usuario_id, " . implode(', ', array_keys($data)) . ") 
         VALUES (?, " . str_repeat('?,', count($data) - 1) . "?)
         ON DUPLICATE KEY UPDATE " . implode(', ', $setParts),
        $params
    );
    
    echo json_encode(['message' => 'Configuración guardada']);
}