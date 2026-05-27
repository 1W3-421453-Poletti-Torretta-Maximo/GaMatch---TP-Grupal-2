import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { Server as SocketServer } from 'socket.io';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import gameRoutes from './routes/games.js';
import swipeRoutes from './routes/swipe.js';
import matchRoutes from './routes/matches.js';
import candidateRoutes from './routes/candidates.js';
import messageRoutes from './routes/messages.js';
import timeslotRoutes from './routes/timeslots.js';
import lobbyRoutes from './routes/lobbies.js';
import adminRoutes from './routes/admin.js';
import { registerSocketHandlers } from './socket/handlers.js';
import { initNeo4j } from './neo4j/driver.js';

const app = Fastify({ logger: true });

// app.server es el http.Server interno de Fastify — Socket.io se adjunta directamente
const io = new SocketServer(app.server, {
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
});

await app.register(cors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
});
await app.register(cookie);

app.decorate('io', io);

await app.register(authRoutes, { prefix: '/auth' });
await app.register(userRoutes, { prefix: '/users' });
await app.register(gameRoutes, { prefix: '/games' });
await app.register(swipeRoutes, { prefix: '/swipe' });
await app.register(matchRoutes, { prefix: '/matches' });
await app.register(candidateRoutes, { prefix: '/candidates' });
await app.register(messageRoutes, { prefix: '/messages' });
await app.register(timeslotRoutes, { prefix: '/timeslots' });
await app.register(lobbyRoutes, { prefix: '/lobbies' });
await app.register(adminRoutes, { prefix: '/admin' });

registerSocketHandlers(io);

app.get('/health', async () => ({ status: 'ok' }));

await initNeo4j();

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: '0.0.0.0' });
console.log(`GaMatch API running on http://localhost:${port}`);
