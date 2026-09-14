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
    $result = db()->fetchAll(
        'SELECT la.amigo_id, la.estado, la.fecha_solicitud,
                u.username, u.estado as user_estado
         FROM lista_amigos la
         JOIN usuarios u ON la.amigo_id = u.id
         WHERE la.usuario_id = ?
         ORDER BY 
            CASE la.estado WHEN \'aceptada\' THEN 0 WHEN \'pendiente\' THEN 1 ELSE 2 END,
            la.fecha_solicitud DESC',
        [$user['id']]
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