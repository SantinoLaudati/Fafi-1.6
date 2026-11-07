<?php
/**
 * Fafi-1.6 PHP Backend - API Entry Point
 * Handles all REST API requests
 */

header('Content-Type: application/json; charset=utf-8');

// Load configuration and dependencies
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/jwt.php';

// Initialize JWT
JWT::init();

// Error handling
set_exception_handler(function($e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor', 'message' => $e->getMessage()]);
    error_log("API Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
});

set_error_handler(function($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) return;
    throw new ErrorException($message, 0, $severity, $file, $line);
});

// Route request
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^/api(/index.php)?#', '', $requestUri);   // admite /api/... y /api/index.php/...
$path = trim($path, '/');
$method = $_SERVER['REQUEST_METHOD'];

// Parse path into segments
$segments = $path ? explode('/', $path) : [];
$resource = $segments[0] ?? '';
$id = $segments[1] ?? null;
$action = $segments[2] ?? null;

// --- Normalización de rutas ---
// El frontend usa rutas como /api/auth/login, /api/inventory/coins o
// /api/social/friends/12/accept. Según cómo se parsean los segmentos, la
// acción puede quedar en $segments[1] o en $segments[3]. Normalizamos aquí
// para que cada handler reciba ($id, $action) como espera.
if ($resource === 'social' && $id === 'friends' && count($segments) === 4) {
    // PUT /social/friends/{id}/accept | /block
    $id = $segments[2];
    $action = $segments[3];
} elseif ($resource === 'social' && $id === 'friends' && count($segments) === 3 && $method === 'DELETE') {
    // DELETE /social/friends/{id}
    $id = $segments[2];
    $action = 'friends';
} elseif ($resource === 'inventory' && $id === 'history' && $action === 'purchases') {
    // GET /inventory/history/purchases
    $id = 'purchases';
    $action = 'history';
} elseif ($action === null && $id !== null) {
    // Rutas de dos segmentos: /auth/login, /inventory/coins, /game/config...
    $action = $id;
    $id = null;
}

// Get input data
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$input = array_merge($input, $_POST);

// Authentication helper
function requireAuth() {
    $token = JWT::getBearerToken();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Token de autenticación requerido']);
        exit;
    }
    
    $payload = JWT::decode($token);
    if (!$payload) {
        http_response_code(401);
        echo json_encode(['error' => 'Token inválido o expirado']);
        exit;
    }
    
    // Verify user exists and is active
    $user = db()->fetchOne(
        'SELECT id, username, estado FROM usuarios WHERE id = ?',
        [$payload['userId']]
    );
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Usuario no encontrado']);
        exit;
    }
    
    if ($user['estado'] !== 'activo') {
        http_response_code(403);
        echo json_encode(['error' => 'Cuenta suspendida o baneada']);
        exit;
    }
    
    return $user;
}

function optionalAuth() {
    $token = JWT::getBearerToken();
    if ($token) {
        $payload = JWT::decode($token);
        if ($payload) {
            return $payload;
        }
    }
    return null;
}

// Route to appropriate handler
try {
    switch ($resource) {
        case 'auth':
            require_once __DIR__ . '/auth.php';
            handleAuth($method, $action, $input);
            break;
            
        case 'inventory':
            require_once __DIR__ . '/inventory.php';
            handleInventory($method, $id, $action, $input, requireAuth());
            break;
            
        case 'social':
            require_once __DIR__ . '/social.php';
            handleSocial($method, $id, $action, $input, requireAuth());
            break;
            
        case 'game':
            require_once __DIR__ . '/game.php';
            handleGame($method, $id, $action, $input, requireAuth());
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint no encontrado']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor', 'message' => $e->getMessage()]);
}