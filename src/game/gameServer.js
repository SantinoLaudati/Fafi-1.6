import { WebSocketServer } from 'ws';
import { verifyToken } from '../utils/jwt.js';
import { query } from '../database/config.js';

const rooms = new Map();
const playerSockets = new Map();

export function createGameServer(server) {
  const wss = new WebSocketServer({ server, path: '/game' });
  
  wss.on('connection', async (ws, req) => {
    // Authenticate via query parameter token
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      ws.close(4001, 'Invalid token');
      return;
    }
    
    // Verify user exists
    const userResult = await query(
      'SELECT id, username FROM usuarios WHERE id = $1 AND estado = $2',
      [decoded.userId, 'activo']
    );
    
    if (userResult.rows.length === 0) {
      ws.close(4001, 'User not found');
      return;
    }
    
    const user = userResult.rows[0];
    ws.userId = user.id;
    ws.username = user.username;
    ws.isAlive = true;
    
    playerSockets.set(user.id, ws);
    
    console.log(`Player connected: ${user.username} (${user.id})`);
    
    ws.on('pong', () => { ws.isAlive = true; });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (err) {
        console.error('Invalid message:', err);
      }
    });
    
    ws.on('close', () => {
      handleDisconnect(ws);
    });
    
    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
    
    // Send welcome message
    ws.send(JSON.stringify({ type: 'welcome', userId: user.id, username: user.username }));
  });
  
  // Heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        handleDisconnect(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  wss.on('close', () => clearInterval(interval));
  
  return wss;
}

function handleMessage(ws, message) {
  switch (message.type) {
    case 'join_room':
      handleJoinRoom(ws, message);
      break;
    case 'leave_room':
      handleLeaveRoom(ws);
      break;
    case 'player_update':
      handlePlayerUpdate(ws, message);
      break;
    case 'shoot':
      handleShoot(ws, message);
      break;
    case 'damage':
      handleDamage(ws, message);
      break;
    case 'chat':
      handleChat(ws, message);
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
    default:
      console.warn('Unknown message type:', message.type);
  }
}

function handleJoinRoom(ws, message) {
  const { roomId, mode = 'deathmatch' } = message;
  
  if (!roomId) {
    ws.send(JSON.stringify({ type: 'error', message: 'Room ID required' }));
    return;
  }
  
  // Leave current room if in one
  if (ws.currentRoom) {
    handleLeaveRoom(ws);
  }
  
  // Create room if doesn't exist
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      mode,
      players: new Map(),
      state: 'waiting',
      createdAt: Date.now()
    });
  }
  
  const room = rooms.get(roomId);
  
  // Add player to room
  room.players.set(ws.userId, {
    id: ws.userId,
    username: ws.username,
    position: { x: 0, y: 1.6, z: 0 },
    rotation: 0,
    health: 100,
    weapon: 'vandal',
    kills: 0,
    deaths: 0,
    connected: true
  });
  
  ws.currentRoom = roomId;
  
  // Notify room about new player
  broadcastToRoom(roomId, {
    type: 'player_joined',
    player: room.players.get(ws.userId)
  }, ws.userId);
  
  // Send current room state to new player
  const players = Array.from(room.players.values());
  ws.send(JSON.stringify({
    type: 'room_state',
    room: { id: roomId, mode },
    players,
    yourId: ws.userId
  }));
  
  console.log(`${ws.username} joined room ${roomId}`);
}

function handleLeaveRoom(ws) {
  if (!ws.currentRoom) return;
  
  const room = rooms.get(ws.currentRoom);
  if (room) {
    room.players.delete(ws.userId);
    
    broadcastToRoom(ws.currentRoom, {
      type: 'player_left',
      playerId: ws.userId
    });
    
    // Clean up empty rooms
    if (room.players.size === 0) {
      rooms.delete(ws.currentRoom);
    }
  }
  
  ws.currentRoom = null;
}

function handlePlayerUpdate(ws, message) {
  if (!ws.currentRoom) return;
  
  const room = rooms.get(ws.currentRoom);
  if (!room) return;
  
  const player = room.players.get(ws.userId);
  if (!player) return;
  
  // Update player state
  if (message.position) player.position = message.position;
  if (message.rotation !== undefined) player.rotation = message.rotation;
  if (message.weapon) player.weapon = message.weapon;
  if (message.health !== undefined) player.health = message.health;
  
  // Broadcast to other players
  broadcastToRoom(ws.currentRoom, {
    type: 'player_update',
    playerId: ws.userId,
    position: player.position,
    rotation: player.rotation,
    weapon: player.weapon,
    health: player.health
  }, ws.userId);
}

function handleShoot(ws, message) {
  if (!ws.currentRoom) return;
  
  const room = rooms.get(ws.currentRoom);
  if (!room) return;
  
  // Validate shoot data (basic anti-cheat)
  const { position, direction, weapon } = message;
  if (!position || !direction || !weapon) return;
  
  // Broadcast shoot to other players
  broadcastToRoom(ws.currentRoom, {
    type: 'player_shoot',
    playerId: ws.userId,
    position,
    direction,
    weapon,
    timestamp: Date.now()
  }, ws.userId);
}

function handleDamage(ws, message) {
  if (!ws.currentRoom) return;
  
  const room = rooms.get(ws.currentRoom);
  if (!room) return;
  
  const { targetId, amount, isHeadshot, weapon } = message;
  if (!targetId || !amount) return;
  
  const target = room.players.get(targetId);
  if (!target) return;
  
  // Apply damage
  target.health = Math.max(0, target.health - amount);
  
  // Broadcast damage
  broadcastToRoom(ws.currentRoom, {
    type: 'player_damage',
    attackerId: ws.userId,
    targetId,
    amount,
    isHeadshot,
    weapon,
    targetHealth: target.health
  });
  
  // Check for kill
  if (target.health <= 0) {
    const attacker = room.players.get(ws.userId);
    if (attacker) {
      attacker.kills++;
      target.deaths++;
    }
    
    broadcastToRoom(ws.currentRoom, {
      type: 'player_killed',
      killerId: ws.userId,
      victimId: targetId,
      weapon
    });
    
    // Respawn after delay
    setTimeout(() => {
      if (room.players.has(targetId)) {
        target.health = 100;
        target.position = getRandomSpawnPoint();
        broadcastToRoom(room.id, {
          type: 'player_respawned',
          playerId: targetId,
          position: target.position
        });
      }
    }, 5000);
  }
}

function handleChat(ws, message) {
  if (!ws.currentRoom) return;
  
  broadcastToRoom(ws.currentRoom, {
    type: 'chat',
    playerId: ws.userId,
    username: ws.username,
    message: message.text.substring(0, 200)
  });
}

function handleDisconnect(ws) {
  if (ws.userId) {
    playerSockets.delete(ws.userId);
    handleLeaveRoom(ws);
    console.log(`Player disconnected: ${ws.username} (${ws.userId})`);
  }
}

function broadcastToRoom(roomId, message, excludeId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const data = JSON.stringify(message);
  
  room.players.forEach((player, id) => {
    if (id !== excludeId) {
      const socket = playerSockets.get(id);
      if (socket && socket.readyState === 1) { // WebSocket.OPEN
        socket.send(data);
      }
    }
  });
}

function getRandomSpawnPoint() {
  // Simple spawn points
  const spawns = [
    { x: -10, y: 1.6, z: -10 },
    { x: 10, y: 1.6, z: 10 },
    { x: -10, y: 1.6, z: 10 },
    { x: 10, y: 1.6, z: -10 },
    { x: 0, y: 1.6, z: 0 }
  ];
  return spawns[Math.floor(Math.random() * spawns.length)];
}

// Export for testing
export { rooms, playerSockets };