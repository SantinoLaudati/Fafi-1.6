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
        $this->sendRooms($conn);
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
            case 'invite':
                $this->handleInvite($from, $data);
                break;
            case 'invite_reply':
                $this->handleInviteReply($from, $data);
                break;
            case 'list_rooms':
                $this->sendRooms($from);
                break;
            case 'create_room':
                $this->handleCreateRoom($from, $data);
                break;
            case 'vote_map':
                $this->handleVoteMap($from, $data);
                break;
            case 'start_match':
                $this->handleStartMatch($from);
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
                'name' => substr(trim((string)($data['name'] ?? $roomId)), 0, 24) ?: $roomId,
                'host' => $conn->userId,
                'votes' => [],
                'state' => 'waiting',
                'createdAt' => time()
            ];
        }
        
        $room = &$this->rooms[$roomId];
        if (count($room['players']) >= 10 && !isset($room['players'][$conn->userId])) { $conn->send(json_encode(['type' => 'error', 'message' => 'La sala está llena (10/10)'])); return; }
        if (($room['state'] ?? 'waiting') === 'playing') { $conn->send(json_encode(['type' => 'error', 'message' => 'La partida ya empezó'])); return; }
        
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
            'room' => ['id' => $roomId, 'mode' => $mode, 'name' => $room['name'] ?? $roomId, 'host' => $room['host'] ?? null, 'votes' => $this->voteCounts($room)],
            'players' => array_values($room['players']),
            'yourId' => $conn->userId
        ]));
        
        echo "{$conn->username} joined room {$roomId}\n";
        $this->broadcastRooms();
    }
    
    private function handleLeaveRoom(ConnectionInterface $conn) {
        if (!$conn->currentRoom) return;

        $roomId = $conn->currentRoom;
        if (isset($this->rooms[$roomId])) {
            $room = &$this->rooms[$roomId];
            unset($room['players'][$conn->userId]);
            unset($room['votes'][$conn->userId]);

            if (empty($room['players'])) {
                unset($room);
                unset($this->rooms[$roomId]);          // sala vacía: se elimina
            } else {
                if (($room['host'] ?? null) === $conn->userId) {
                    $ids = array_keys($room['players']);
                    $room['host'] = $ids[0];            // el anfitrión se va: pasa al siguiente jugador
                }
                $this->broadcastToRoom($roomId, [
                    'type' => 'player_left',
                    'playerId' => $conn->userId,
                    'host' => $room['host'],
                    'votes' => $this->voteCounts($room)
                ]);
            }
        }

        $conn->currentRoom = null;
        $this->broadcastRooms();
    }

    // ===== salas online: lista, creación, votación de mapa y reparto de equipos =====
    private function voteCounts($room) {
        $c = [];
        foreach (($room['votes'] ?? []) as $m) { $c[$m] = ($c[$m] ?? 0) + 1; }
        return $c;
    }

    private function roomSummary() {
        $out = [];
        foreach ($this->rooms as $id => $r) {
            $out[] = ['id' => $id, 'name' => $r['name'] ?? $id, 'players' => count($r['players']), 'max' => 10,
                      'state' => $r['state'] ?? 'waiting', 'host' => $r['players'][$r['host'] ?? ''] ['username'] ?? ''];
        }
        return $out;
    }

    private function sendRooms(ConnectionInterface $conn) {
        $conn->send(json_encode(['type' => 'rooms_list', 'rooms' => $this->roomSummary()]));
    }

    // todos los jugadores conectados ven al instante las salas que se crean, se llenan o se cierran
    private function broadcastRooms() {
        $json = json_encode(['type' => 'rooms_list', 'rooms' => $this->roomSummary()]);
        foreach ($this->clients as $c) { $c->send($json); }
    }

    private function handleCreateRoom(ConnectionInterface $conn, $data) {
        $name = substr(trim((string)($data['name'] ?? '')), 0, 24);
        if ($name === '') $name = 'Sala de ' . $conn->username;
        $roomId = strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
        $this->handleJoinRoom($conn, ['roomId' => $roomId, 'mode' => 'defuse', 'name' => $name]);
    }

    private function handleVoteMap(ConnectionInterface $conn, $data) {
        if (!$conn->currentRoom || !isset($this->rooms[$conn->currentRoom])) return;
        $map = (string)($data['map'] ?? '');
        if (!in_array($map, ['dust2', 'italy', 'office', 'mirage'], true)) return;
        $room = &$this->rooms[$conn->currentRoom];
        if (($room['state'] ?? 'waiting') !== 'waiting') return;
        $room['votes'][$conn->userId] = $map;
        $this->broadcastToRoom($conn->currentRoom, ['type' => 'votes', 'votes' => $this->voteCounts($room)]);
    }

    // el anfitrión inicia la partida: equipos al azar de hasta 5 (bando T/CT también al azar) y mapa más votado (empate: al azar)
    private function handleStartMatch(ConnectionInterface $conn) {
        $roomId = $conn->currentRoom;
        if (!$roomId || !isset($this->rooms[$roomId])) return;
        $room = &$this->rooms[$roomId];
        if (($room['host'] ?? null) !== $conn->userId) { $conn->send(json_encode(['type' => 'error', 'message' => 'Solo el anfitrión puede iniciar'])); return; }
        if (($room['state'] ?? 'waiting') !== 'waiting') return;
        $ids = array_keys($room['players']);
        shuffle($ids);
        $half = (int)ceil(count($ids) / 2);
        $teamA = array_slice($ids, 0, $half); $teamB = array_slice($ids, $half);
        if (random_int(0, 1) === 1) { $t = $teamA; $ct = $teamB; } else { $t = $teamB; $ct = $teamA; }
        $counts = $this->voteCounts($room);
        if (empty($counts)) { $maps = ['dust2', 'italy', 'office', 'mirage']; $map = $maps[array_rand($maps)]; }
        else { $max = max($counts); $top = array_keys(array_filter($counts, fn($v) => $v === $max)); $map = $top[array_rand($top)]; }
        $names = function ($list) use ($room) { return array_map(fn($id) => ['id' => $id, 'username' => $room['players'][$id]['username']], $list); };
        $room['state'] = 'playing';
        $this->broadcastToRoom($roomId, ['type' => 'match_start', 'map' => $map, 'teams' => ['t' => $names($t), 'ct' => $names($ct)]]);
        $this->broadcastRooms();
    }
    

    // ===== desafíos 1v1 entre amigos: el invitado recibe una notificación y, si acepta, empieza un duelo 1 contra 1 =====
    private $invites = [];

    private function findSocketByUsername($name) {
        foreach ($this->clients as $c) {
            if (isset($c->username) && strcasecmp($c->username, $name) === 0) return $c;
        }
        return null;
    }

    private function handleInvite(ConnectionInterface $from, $data) {
        $name = trim((string)($data['to'] ?? ''));
        $target = $name === '' ? null : $this->findSocketByUsername($name);
        if (!$target || $target === $from) {
            $from->send(json_encode(['type' => 'error', 'message' => 'Ese jugador no está conectado ahora']));
            return;
        }
        $id = bin2hex(random_bytes(4));
        $this->invites[$id] = ['from' => $from->userId, 'to' => $target->userId, 'at' => time()];
        $target->send(json_encode(['type' => 'invite', 'inviteId' => $id, 'from' => ['id' => $from->userId, 'username' => $from->username], 'mode' => '1v1']));
        $from->send(json_encode(['type' => 'invite_sent', 'to' => $target->username]));
    }

    private function handleInviteReply(ConnectionInterface $conn, $data) {
        $id = (string)($data['inviteId'] ?? '');
        $inv = $this->invites[$id] ?? null;
        if (!$inv || $inv['to'] !== $conn->userId) return;
        unset($this->invites[$id]);
        $sender = $this->userSockets[$inv['from']] ?? null;
        if (!$sender) { $conn->send(json_encode(['type' => 'error', 'message' => 'El jugador ya no está conectado'])); return; }
        if (empty($data['accept'])) { $sender->send(json_encode(['type' => 'invite_declined', 'by' => $conn->username])); return; }
        $roomId = 'D' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
        $this->handleJoinRoom($sender, ['roomId' => $roomId, 'mode' => '1v1', 'name' => 'Duelo ' . $sender->username . ' vs ' . $conn->username]);
        $this->handleJoinRoom($conn, ['roomId' => $roomId, 'mode' => '1v1']);
        $maps = ['dust2', 'italy', 'office', 'mirage'];
        $map = $maps[array_rand($maps)];
        $pair = [$sender, $conn]; shuffle($pair);
        $this->rooms[$roomId]['state'] = 'playing';
        $msg = ['type' => 'match_start', 'mode' => '1v1', 'map' => $map, 'teams' => [
            't' => [['id' => $pair[0]->userId, 'username' => $pair[0]->username]],
            'ct' => [['id' => $pair[1]->userId, 'username' => $pair[1]->username]]
        ]];
        $this->broadcastToRoom($roomId, $msg);
        $this->broadcastRooms();
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
    $autoload = __DIR__ . '/../vendor/autoload.php';
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