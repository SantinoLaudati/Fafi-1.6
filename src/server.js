import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './database/config.js';

import authRoutes from './routes/auth.js';
import inventoryRoutes from './routes/inventory.js';
import socialRoutes from './routes/social.js';
import gameRoutes from './routes/game.js';
import { createGameServer } from './game/gameServer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/game', gameRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Create HTTP server
const server = createServer(app);

// Attach WebSocket game server
createGameServer(server);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Fafi-1.6 Backend running on port ${PORT}`);
  console.log(`📡 WebSocket game server on ws://localhost:${PORT}/game`);
  console.log(`🔗 REST API on http://localhost:${PORT}/api`);
});

export { app, server };