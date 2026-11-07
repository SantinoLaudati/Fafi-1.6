<?php
/**
 * Social API Handlers (Friends, Achievements, Search)
 */

function handleSocial($method, $id, $action, $input, $user) {
    switch ($method) {
        case 'GET':
            switch ($action) {
                case 'friends':
                    handleGetFriends($user);
                    break;
                case 'achievements':
                    handleGetAchievements($user);
                    break;
                case 'profile':
                    handleGetProfile($user, $_GET['u'] ?? '');
                    break;
                case 'search':
                    handleSearchUsers($user, $_GET['q'] ?? '');
                    break;
                default:
                    http_response_code(404);
                    echo json_encode(['error' => 'Endpoint no encontrado']);
            }
            break;
        case 'POST':
            if ($action === 'friends') {
                handleAddFriend($input, $user);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Endpoint no encontrado']);
            }
            break;
        case 'PUT':
            if ($id && $action === 'accept') {
                handleAcceptFriend((int)$id, $user);
            } elseif ($id && $action === 'block') {
                handleBlockUser((int)$id, $user);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Endpoint no encontrado']);
            }
            break;
        case 'DELETE':
            if ($id && $action === 'friends') {
                handleRemoveFriend((int)$id, $user);
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

function handleGetFriends($user) {
    // amigos y solicitudes enviadas (usuario_id = yo) + solicitudes pendientes que me enviaron otros (amigo_id = yo).
    // amigo_id siempre es "la otra persona"; direccion indica quién inició la solicitud.
    $result = db()->fetchAll(
        'SELECT t.amigo_id, t.estado, t.fecha_solicitud, t.direccion, u.username, u.estado as user_estado
         FROM (
            SELECT la.amigo_id AS amigo_id, la.estado, la.fecha_solicitud, \'enviada\' AS direccion
              FROM lista_amigos la WHERE la.usuario_id = ?
            UNION ALL
            SELECT la.usuario_id AS amigo_id, la.estado, la.fecha_solicitud, \'recibida\' AS direccion
              FROM lista_amigos la WHERE la.amigo_id = ? AND la.estado = \'pendiente\'
         ) t
         JOIN usuarios u ON t.amigo_id = u.id
         ORDER BY
            CASE t.estado WHEN \'aceptada\' THEN 0 WHEN \'pendiente\' THEN 1 ELSE 2 END,
            t.fecha_solicitud DESC',
        [$user['id'], $user['id']]
    );

    echo json_encode(['friends' => $result]);
}

function handleAddFriend($input, $user) {
    $username = trim($input['username'] ?? '');
    
    if (!$username) {
        http_response_code(400);
        echo json_encode(['error' => 'Nombre de usuario requerido']);
        return;
    }
    
    if ($username === $user['username']) {
        http_response_code(400);
        echo json_encode(['error' => 'No puedes agregarte a ti mismo']);
        return;
    }
    
    // Find target user
    $target = db()->fetchOne('SELECT id FROM usuarios WHERE username = ?', [$username]);
    
    if (!$target) {
        http_response_code(404);
        echo json_encode(['error' => 'Usuario no encontrado']);
        return;
    }
    
    $targetId = $target['id'];
    
    // Check if already friends or pending
    $existing = db()->fetchOne(
        'SELECT * FROM lista_amigos 
         WHERE (usuario_id = ? AND amigo_id = ?) OR (usuario_id = ? AND amigo_id = ?)',
        [$user['id'], $targetId, $targetId, $user['id']]
    );
    
    if ($existing) {
        $status = $existing['estado'];
        if ($status === 'aceptada') {
            http_response_code(409);
            echo json_encode(['error' => 'Ya son amigos']);
            return;
        } elseif ($status === 'pendiente') {
            // si la otra persona ya me había enviado una solicitud, agregarla equivale a aceptarla
            if ((int)$existing['usuario_id'] === (int)$targetId) {
                handleAcceptFriend((int)$targetId, $user);
                return;
            }
            http_response_code(409);
            echo json_encode(['error' => 'Solicitud ya enviada o pendiente']);
            return;
        } elseif ($status === 'bloqueada') {
            http_response_code(403);
            echo json_encode(['error' => 'No puedes agregar a este usuario']);
            return;
        }
    }
    
    // Create friend request
    db()->insert('lista_amigos', [
        'usuario_id' => $user['id'],
        'amigo_id' => $targetId,
        'estado' => 'pendiente'
    ]);
    
    http_response_code(201);
    echo json_encode(['message' => 'Solicitud de amistad enviada']);
}

function handleAcceptFriend($friendId, $user) {
    // Check if request exists (friend sent request to user)
    $request = db()->fetchOne(
        'SELECT * FROM lista_amigos WHERE usuario_id = ? AND amigo_id = ? AND estado = ?',
        [$friendId, $user['id'], 'pendiente']
    );
    
    if (!$request) {
        http_response_code(404);
        echo json_encode(['error' => 'Solicitud no encontrada']);
        return;
    }
    
    // Update both directions to accepted
    db()->query(
        'INSERT INTO lista_amigos (usuario_id, amigo_id, estado) VALUES (?, ?, \'aceptada\')
         ON DUPLICATE KEY UPDATE estado = \'aceptada\'',
        [$user['id'], $friendId]
    );
    
    db()->query(
        'UPDATE lista_amigos SET estado = ? WHERE usuario_id = ? AND amigo_id = ?',
        ['aceptada', $friendId, $user['id']]
    );
    
    echo json_encode(['message' => 'Solicitud aceptada, ahora son amigos']);
}

function handleRemoveFriend($friendId, $user) {
    // Remove both directions
    db()->query(
        'DELETE FROM lista_amigos WHERE (usuario_id = ? AND amigo_id = ?) OR (usuario_id = ? AND amigo_id = ?)',
        [$user['id'], $friendId, $friendId, $user['id']]
    );
    
    echo json_encode(['message' => 'Amistad eliminada / solicitud rechazada']);
}

function handleBlockUser($friendId, $user) {
    db()->query(
        'INSERT INTO lista_amigos (usuario_id, amigo_id, estado) VALUES (?, ?, \'bloqueada\')
         ON DUPLICATE KEY UPDATE estado = \'bloqueada\'',
        [$user['id'], $friendId]
    );
    
    // Remove reverse if exists
    db()->query(
        'DELETE FROM lista_amigos WHERE usuario_id = ? AND amigo_id = ?',
        [$friendId, $user['id']]
    );
    
    echo json_encode(['message' => 'Usuario bloqueado']);
}

function handleGetAchievements($user) {
    $result = db()->fetchAll(
        'SELECT l.id, l.nombre, l.descripcion,
                ld.fecha_desbloqueo,
                CASE WHEN ld.usuario_id IS NOT NULL THEN 1 ELSE 0 END as unlocked
         FROM logros l
         LEFT JOIN logros_desbloqueados ld ON l.id = ld.logro_id AND ld.usuario_id = ?
         ORDER BY unlocked DESC, l.nombre',
        [$user['id']]
    );
    
    echo json_encode(['achievements' => $result]);
}

function handleSearchUsers($user, $query) {
    if (!$query || strlen($query) < 2) {
        http_response_code(400);
        echo json_encode(['error' => 'Consulta muy corta (mínimo 2 caracteres)']);
        return;
    }
    
    $result = db()->fetchAll(
        'SELECT id, username, estado 
         FROM usuarios 
         WHERE username LIKE ? AND id != ?
         LIMIT 10',
        ["%{$query}%", $user['id']]
    );
    
    echo json_encode(['users' => $result]);
}

// Perfil público: foto, descripción, logros destacados (guardados en configuraciones_jugador.preferencias_ui.perfil) y mira
function handleGetProfile($user, $name) {
    $name = trim((string)$name);
    $u = $name === '' ? null : db()->fetchOne('SELECT id, username FROM usuarios WHERE username = ?', [$name]);
    if (!$u) {
        http_response_code(404);
        echo json_encode(['error' => 'Jugador no encontrado']);
        return;
    }
    $cfg = db()->fetchOne('SELECT preferencias_ui, mira FROM configuraciones_jugador WHERE usuario_id = ?', [$u['id']]);
    $ui = json_decode($cfg['preferencias_ui'] ?? 'null', true) ?: [];
    $mira = json_decode($cfg['mira'] ?? 'null', true) ?: null;
    $perfil = $ui['perfil'] ?? [];
    $ach = db()->fetchAll(
        'SELECT l.nombre FROM logros l JOIN logros_desbloqueados ld ON l.id = ld.logro_id WHERE ld.usuario_id = ?',
        [$u['id']]
    );
    $achs = array_map(function ($a) { return ['id' => $a['nombre'], 'name' => $a['nombre']]; }, $ach);
    echo json_encode(['profile' => [
        'username' => $u['username'],
        'perfil' => [
            'bio' => substr((string)($perfil['bio'] ?? ''), 0, 160),
            'avatar' => (is_string($perfil['avatar'] ?? null) && strpos($perfil['avatar'], 'data:image/') === 0 && strlen($perfil['avatar']) < 60000) ? $perfil['avatar'] : '',
            'badges' => array_slice(is_array($perfil['badges'] ?? null) ? $perfil['badges'] : [], 0, 3)
        ],
        'mira' => $mira,
        'achievements' => $achs
    ]]);
}
