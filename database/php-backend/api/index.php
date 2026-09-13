<?php
/**
 * Fafi-1.6 PHP Backend - API Entry Point
 * Handles all REST API requests
 */

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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
$path = str_replace('/api', '', $requestUri);
$path = trim($path, '/');
$method = $_SERVER['REQUEST_METHOD'];

// Parse path into segments
$segments = $path ? explode('/', $path) : [];
$resource = $segments[0] ?? '';
$id = $segments[1] ?? null;
$action = $segments[2] ?? null;

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