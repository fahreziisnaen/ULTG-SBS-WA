import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';

import { initManager, getAllInstancesWithQR } from './services/waManager.js';
import { migrateFromJsonFiles } from './services/db.js';
import { registerRoutes } from './routes/index.js';
import { rateLimitMiddleware } from './middlewares/rateLimit.middleware.js';
import { cleanOldLogs } from './services/log.service.js';

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  console.log(`[ws] Client connected: ${socket.id}`);
  // Send current state (including any active QR codes) to the newly connected client
  socket.emit('instances_init', getAllInstancesWithQR());
  socket.on('disconnect', () => console.log(`[ws] Client disconnected: ${socket.id}`));
});

app.set('trust proxy', 1); // trust nginx reverse proxy
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(rateLimitMiddleware);
app.set('io', io);

registerRoutes(app);

const PORT = parseInt(process.env.PORT || '3000', 10);

httpServer.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT}`);
  migrateFromJsonFiles()
    .then(() => initManager(io))
    .catch((err) => console.error('[server] Startup error:', err));

  // Clean logs older than 90 days on startup, then once every 24 hours
  cleanOldLogs();
  setInterval(cleanOldLogs, 24 * 60 * 60 * 1000);
});
