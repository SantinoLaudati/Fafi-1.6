<?php
/**
 * WebSocket Game Server for Fafi-1.6
 * Run with: php websocket/server.php
 * Requires: composer require cboden/ratchet
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/jwt.php';

JWT::init();

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

class GameServer implements MessageComponentInterface {
    protected $clients;
    protected $rooms;
    protected $userSockets;
    
    public function __construct() {
        $this->clients = new \SplObjectStorage();
        $this->rooms = [];
        $this->userSockets = [];
    }
    
    public function onOpen(ConnectionInterface $conn) {
        // Authenticate via query parameter
        $query = parse_url($conn->httpRequest->getUri(), PHP_URL_QUERY);
        parse_str($query, $params);
        $token = $params['token'] ?? '';
        
        if (!$token) {
            $conn->close(4001, 'Authentication required');
            return;
        }
        
        $payload = JWT::decode($token);
        if (!$payload) {
            $conn->close(4001, 'Invalid token');
            return;
        }
        
        // Verify user exists
        $user = db()->fetchOne(
            'SELECT id, username FROM usuarios WHERE id = ? AND estado = ?',
            [$payload['userId'], 'activo']
        );
        
        if (!$user) {
            $conn->close(4001, 'User not found');
            return;
        }
        
        $conn->userId = $user['id'];
        $conn->username = $user['username'];
        $conn->currentRoom = null;
        
        $this->clients->attach($conn);
        $this->userSockets[$user['id']] = $conn;
        
        echo "Player connected: {$user['username']} ({$user['id']})\n";
        
        // Send welcome
        $conn->send(json_encode([
            'type' => 'welcome',
            'userId' => $user['id'],
            'username' => $user['username']
        ]));
    }
    
    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg, true);
        if (!$data || !isset($data['type'])) return;
        
        switch ($data['type']) {
            case 'join_room':
                $this->handleJoinRoom($from, $data);
                break;
            case 'leave_room':
                $this->handleLeaveRoom($from);
                break;
            case 'player_update':
                $this->handlePlayerUpdate($from, $data);
                break;
            case 'shoot':
                $this->handleShoot($from, $data);
                break;
            case 'damage':
                $this->handleDamage($from, $data);
                break;
            case 'chat':
                $this->handleChat($from, $data);
                break;
            case 'ping':
                $from->send(json_encode(['type' => 'pong', 'timestamp' => time() * 1000]));
                break;
        }
    }
    
    public function onClose(ConnectionInterface $conn) {
        $this->handleDisconnect($conn);
        $this->clients->detach($conn);
        unset($this->userSockets[$conn->userId ?? '']);
        echo "Player disconnected: {$conn->username} ({$conn->userId})\n";
    }
    
    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "Error: {$e->getMessage()}\n";
        $conn->close();
    }
    
    private function handleJoinRoom(ConnectionInterface $conn, $data) {
        $roomId = $data['roomId'] ?? '';
        $mode = $data['mode'] ?? 'deathmatch';
        
        if (!$roomId) {
            $conn->send(json_encode(['type' => 'error', 'message' => 'Room ID required']));
            return;
        }
        
        // Leave current room
        if ($conn->currentRoom) {
            $this->handleLeaveRoom($conn);
        }
        
        // Create room if doesn't exist
        if (!isset($this->rooms[$roomId])) {
            $this->rooms[$roomId] = [
                'id' => $roomId,
                'mode' => $mode,
                'players' => [],
                'state' => 'waiting',
                'createdAt' => time()
            ];
        }
        
        $room = &$this->rooms[$roomId];
        
        // Add player to room
        $room['players'][$conn->userId] = [
            'id' => $conn->userId,
            'username' => $conn->username,
            'position' => ['x' => 0, 'y' => 1.6, 'z' => 0],
            'rotation' => 0,
            'health' => 100,
            'weapon' => 'vandal',
            'kills' => 0,
            'deaths' => 0,
            'connected' => true
        ];
        
        $conn->currentRoom = $roomId;
        
        // Notify room about new player
        $this->broadcastToRoom($roomId, [
            'type' => 'player_joined',
            'player' => $room['players'][$conn->userId]
        ], $conn->userId);
        
        // Send current room state to new player
        $conn->send(json_encode([
            'type' => 'room_state',
            'room' => ['id' => $roomId, 'mode' => $mode],
            'players' => array_values($room['players']),
            'yourId' => $conn->userId
        ]));
        
        echo "{$conn->username} joined room {$roomId}\n";
    }
    
    private function handleLeaveRoom(ConnectionInterface $conn) {
        if (!$conn->currentRoom) return;
        
        $roomId = $conn->currentRoom;
        $room = $this->rooms[$roomId] ?? null;
        
        if ($room) {
            unset($room['players'][$conn->userId]);
            
            $this->broadcastToRoom($roomId, [
                'type' => 'player_left',
                'playerId' => $conn->userId
            ]);
            
            // Clean up empty rooms
            if (empty($room['players'])) {
                unset($this->rooms[$roomId]);
            }
        }
        
        $conn->currentRoom = null;
    }
    
    private function handlePlayerUpdate(ConnectionInterface $conn, $data) {
        if (!$conn->currentRoom) return;
        
        $room = $this->rooms[$conn->currentRoom] ?? null;
        if (!$room) return;
        
        $player = $room['players'][$conn->userId] ?? null;
        if (!$player) return;
        
        // Update player state
        if (isset($data['position'])) $player['position'] = $data['position'];
        if (isset($data['rotation'])) $player['rotation'] = $data['rotation'];
        if (isset($data['weapon'])) $player['weapon'] = $data['weapon'];
        if (isset($data['health'])) $player['health'] = $data['health'];
        
        // Broadcast to other players
        $this->broadcastToRoom($conn->currentRoom, [
            'type' => 'player_update',
            'playerId' => $conn->userId,
            'position' => $player['position'],
            'rotation' => $player['rotation'],
            'weapon' => $player['weapon'],
            'health' => $player['health']
        ], $conn->userId);
    }
    
    private function handleShoot(ConnectionInterface $conn, $data) {
        if (!$conn->currentRoom) return;
        
        $room = $this->rooms[$conn->currentRoom] ?? null;
        if (!$room) return;
        
        // Validate shoot data
        $position = $data['position'] ?? null;
        $direction = $data['direction'] ?? null;
        $weapon = $data['weapon'] ?? null;
        
        if (!$position || !$direction || !$weapon) return;
        
        // Broadcast shoot to other players
        $this->broadcastToRoom($conn->currentRoom, [
            'type' => 'player_shoot',
            'playerId' => $conn->userId,
            'position' => $position,
            'direction' => $direction,
            'weapon' => $weapon,
            'timestamp' => time() * 1000
        ], $conn->userId);
    }
    
    private function handleDamage(ConnectionInterface $conn, $data) {
        if (!$conn->currentRoom) return;
        
        $room = $this->rooms[$conn->currentRoom] ?? null;
        if (!$room) return;
        
        $targetId = $data['targetId'] ?? null;
        $amount = $data['amount'] ?? null;
        $isHeadshot = $data['isHeadshot'] ?? false;
        $weapon = $data['weapon'] ?? 'vandal';
        
        if (!$targetId || !$amount) return;
        
        $target = $room['players'][$targetId] ?? null;
        if (!$target) return;
        
        // Apply damage
        $target['health'] = max(0, $target['health'] - $amount);
        
        // Broadcast damage
        $this->broadcastToRoom($conn->currentRoom, [
            'type' => 'player_damage',
            'attackerId' => $conn->userId,
            'targetId' => $targetId,
            'amount' => $amount,
            'isHeadshot' => $isHeadshot,
            'weapon' => $weapon,
            'targetHealth' => $target['health']
        ]);
        
        // Check for kill
        if ($target['health'] <= 0) {
            $attacker = $room['players'][$conn->userId] ?? null;
            if ($attacker) {
                $attacker['kills']++;
                $target['deaths']++;
            }
            
            $this->broadcastToRoom($conn->currentRoom, [
                'type' => 'player_killed',
                'killerId' => $conn->userId,
                'victimId' => $targetId,
                'weapon' => $weapon
            ]);
            
            // Respawn after delay (using a simple timer approach)
            // In production, use a proper async timer
            $this->scheduleRespawn($room, $targetId);
        }
    }
    
    private function scheduleRespawn($room, $targetId) {
        // Simple approach: store respawn time and check on next message
        // For production, use ReactPHP timers or similar
        $room['players'][$targetId]['respawnAt'] = time() + 5;
    }
    
    private function handleChat(ConnectionInterface $conn, $data) {
        if (!$conn->currentRoom) return;
        
        $this->broadcastToRoom($conn->currentRoom, [
            'type' => 'chat',
            'playerId' => $conn->userId,
            'username' => $conn->username,
            'message' => substr($data['text'] ?? '', 0, 200)
        ]);
    }
    
    private function handleDisconnect(ConnectionInterface $conn) {
        if ($conn->currentRoom) {
            $this->handleLeaveRoom($conn);
        }
    }
    
    private function broadcastToRoom($roomId, $message, $excludeId = null) {
        $room = $this->rooms[$roomId] ?? null;
        if (!$room) return;
        
        $json = json_encode($message);
        
        foreach ($room['players'] as $id => $player) {
            if ($id !== $excludeId && isset($this->userSockets[$id])) {
                $socket = $this->userSockets[$id];
                if ($socket->resourceId) { // Check if connected
                    $socket->send($json);
                }
            }
        }
    }
    
    // Periodic cleanup for respawns
    public function tick() {
        foreach ($this->rooms as $roomId => &$room) {
            foreach ($room['players'] as $id => &$player) {
                if (isset($player['respawnAt']) && $player['respawnAt'] <= time()) {
                    unset($player['respawnAt']);
                    $player['health'] = 100;
                    $player['position'] = $this->getRandomSpawnPoint();
                    
                    $this->broadcastToRoom($roomId, [
                        'type' => 'player_respawned',
                        'playerId' => $id,
                        'position' => $player['position']
                    ]);
                }
            }
        }
    }
    
    private function getRandomSpawnPoint() {
        $spawns = [
            ['x' => -10, 'y' => 1.6, 'z' => -10],
            ['x' => 10, 'y' => 1.6, 'z' => 10],
            ['x' => -10, 'y' => 1.6, 'z' => 10],
            ['x' => 10, 'y' => 1.6, 'z' => -10],
            ['x' => 0, 'y' => 1.6, 'z' => 0]
        ];
        return $spawns[array_rand($spawns)];
    }
}

// CLI entry point
if (php_sapi_name() === 'cli') {
    // Check for Ratchet
    $autoload = __DIR__ . '/../../vendor/autoload.php';
    if (!file_exists($autoload)) {
        echo "Error: Run 'composer install' first\n";
        exit(1);
    }
    
    require_once $autoload;
    
    $port = (int)(getenv('WS_PORT') ?? 8080);
    
    $server = IoServer::factory(
        new HttpServer(
            new WsServer(
                new GameServer()
            )
        ),
        $port,
        '0.0.0.0'
    );
    
    echo "🚀 Fafi-1.6 WebSocket Server running on port {$port}\n";
    
    // Run periodic tick for respawns
    $loop = $server->loop;
    $loop->addPeriodicTimer(1, function() use ($server) {
        foreach ($server->getApplication()->getApplication()->getApplication() as $app) {
            if ($app instanceof GameServer) {
                $app->tick();
            }
        }
    });
    
    $server->run();
}