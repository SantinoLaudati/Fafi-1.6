<?php
/**
 * Authentication API Handlers
 */

function handleAuth($method, $action, $input) {
    switch ($method) {
        case 'POST':
            switch ($action) {
                case 'register':
                    handleRegister($input);
                    break;
                case 'login':
                    handleLogin($input);
                    break;
                default:
                    http_response_code(404);
                    echo json_encode(['error' => 'Endpoint no encontrado']);
            }
            break;
        case 'GET':
            if ($action === 'me') {
                handleGetProfile();
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Endpoint no encontrado']);
            }
            break;
        case 'PUT':
            if ($action === 'password') {
                handleUpdatePassword($input);
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

function handleRegister($input) {
    $username = trim($input['username'] ?? '');
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    
    if (!$username || !$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Usuario, email y contraseña son requeridos']);
        return;
    }
    
    if (strlen($username) < 3 || strlen($username) > 20) {
        http_response_code(400);
        echo json_encode(['error' => 'El usuario debe tener entre 3 y 20 caracteres']);
        return;
    }
    
    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'La contraseña debe tener al menos 6 caracteres']);
        return;
    }
    
    // Check if user exists
    $existing = db()->fetchOne(
        'SELECT id FROM usuarios WHERE username = ? OR email = ?',
        [$username, $email]
    );
    
    if ($existing) {
        http_response_code(409);
        echo json_encode(['error' => 'El usuario o email ya está registrado']);
        return;
    }
    
    // Hash password
    $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    
    // Start transaction
    db()->beginTransaction();
    try {
        // Create user
        $userId = db()->insert('usuarios', [
            'username' => $username,
            'email' => $email,
            'password_hash' => $passwordHash,
            'estado' => 'activo'
        ]);
        
        // Create default related records
        db()->insert('configuraciones_jugador', ['usuario_id' => $userId]);
        db()->insert('progreso_campana', ['usuario_id' => $userId, 'ultimo_nivel' => 1]);
        db()->insert('estadisticas_jugador', ['usuario_id' => $userId]);
        db()->insert('monedas_jugador', ['usuario_id' => $userId, 'moneda_gratuita' => 2000]);
        
        // Give starter items
        $starterItems = db()->fetchAll(
            "SELECT id FROM articulos_tienda WHERE nombre IN ('Vandal Desierto', 'AK-47 Táctica', 'Sniper Camuflaje') AND activo = 1"
        );
        
        foreach ($starterItems as $item) {
            db()->query(
                'INSERT IGNORE INTO inventario_jugador (usuario_id, articulo_id) VALUES (?, ?)',
                [$userId, $item['id']]
            );
        }
        
        db()->commit();
        
        $token = JWT::encode(['userId' => $userId, 'username' => $username]);
        
        http_response_code(201);
        echo json_encode([
            'user' => ['id' => $userId, 'username' => $username],
            'token' => $token,
            'message' => 'Cuenta creada exitosamente'
        ]);
    } catch (Exception $e) {
        db()->rollback();
        throw $e;
    }
}

function handleLogin($input) {
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';
    
    if (!$username || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Usuario y contraseña son requeridos']);
        return;
    }
    
    $user = db()->fetchOne(
        'SELECT id, username, password_hash, estado FROM usuarios WHERE username = ? OR email = ?',
        [$username, $username]
    );
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Credenciales inválidas']);
        return;
    }
    
    if ($user['estado'] !== 'activo') {
        http_response_code(403);
        echo json_encode(['error' => 'Cuenta suspendida o baneada']);
        return;
    }
    
    if (!password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Credenciales inválidas']);
        return;
    }
    
    $token = JWT::encode(['userId' => $user['id'], 'username' => $user['username']]);
    
    echo json_encode([
        'user' => ['id' => $user['id'], 'username' => $user['username']],
        'token' => $token,
        'message' => 'Inicio de sesión exitoso'
    ]);
}

function handleGetProfile() {
    $user = requireAuth();
    
    $result = db()->fetchOne(
        `SELECT u.id, u.username, u.email, u.estado, u.fecha_creacion,
                e.bajas, e.muertes, e.partidas_ganadas, e.precision_general, e.tiempo_jugado_minutos,
                m.moneda_gratuita, m.moneda_premium
         FROM usuarios u
         JOIN estadisticas_jugador e ON u.id = e.usuario_id
         JOIN monedas_jugador m ON u.id = m.usuario_id
         WHERE u.id = ?`,
        [$user['id']]
    );
    
    if (!$result) {
        http_response_code(404);
        echo json_encode(['error' => 'Usuario no encontrado']);
        return;
    }
    
    echo json_encode(['user' => $result]);
}

function handleUpdatePassword($input) {
    $user = requireAuth();
    
    $currentPassword = $input['currentPassword'] ?? '';
    $newPassword = $input['newPassword'] ?? '';
    
    if (!$currentPassword || !$newPassword) {
        http_response_code(400);
        echo json_encode(['error' => 'Contraseña actual y nueva son requeridas']);
        return;
    }
    
    if (strlen($newPassword) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'La nueva contraseña debe tener al menos 6 caracteres']);
        return;
    }
    
    $userData = db()->fetchOne('SELECT password_hash FROM usuarios WHERE id = ?', [$user['id']]);
    
    if (!password_verify($currentPassword, $userData['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Contraseña actual incorrecta']);
        return;
    }
    
    $newHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
    db()->query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [$newHash, $user['id']]);
    
    echo json_encode(['message' => 'Contraseña actualizada correctamente']);
}