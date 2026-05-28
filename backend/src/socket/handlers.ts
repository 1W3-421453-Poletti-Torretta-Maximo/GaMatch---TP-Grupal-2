import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';
import { getDb } from '../mongodb/client.js';
import { saveMessage } from '../mongodb/messages.js';

interface AuthSocket extends Socket {
  userId?: string;
}

export function registerSocketHandlers(io: Server): void {
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET ?? 'dev_secret') as { userId: string };
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: AuthSocket) => {
    const userId = socket.userId!;

    // Join personal room for match notifications
    socket.join(userId);

    // Mark user online in Neo4j
    const session = getSession();
    session.run(Q.SET_USER_ONLINE, { id: userId, isOnline: true }).finally(() => session.close());

    // Pre-fetch sender info from Neo4j (cached in socket.data)
    const infoSession = getSession();
    try {
      const infoResult = await infoSession.run(Q.GET_USER_BY_ID, { id: userId });
      if (infoResult.records.length > 0) {
        const u = infoResult.records[0].get('u').properties;
        socket.data.username = u.username;
        socket.data.avatar = u.avatar;
      }
    } catch { /* fallback below */ } finally {
      await infoSession.close();
    }
    if (!socket.data.username) {
      socket.data.username = 'unknown';
      socket.data.avatar = '';
    }

    // Join a 1-1 chat room
    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
    });

    // Send 1-1 message
    socket.on('send_message', async (data: { roomId: string; content: string }) => {
      if (!data.roomId || !data.content?.trim()) return;

      const messageId = uuidv4();
      const username = socket.data.username as string;
      const doc = {
        id: messageId,
        content: data.content.trim().slice(0, 1000),
        senderId: userId,
        senderUsername: username,
        senderName: username,
        senderAvatar: socket.data.avatar as string,
        channelId: data.roomId,
        channelType: 'direct' as const,
        createdAt: new Date(),
      };
      const mongo = getDb();
      if (!mongo) return;
      await saveMessage(mongo, doc);

      io.to(data.roomId).emit('new_message', {
        id: doc.id,
        content: doc.content,
        senderId: doc.senderId,
        senderUsername: doc.senderUsername,
        senderAvatar: doc.senderAvatar,
        roomId: doc.channelId,
        sentAt: doc.createdAt.toISOString(),
      });
    });

    // Typing indicator
    socket.on('typing', (roomId: string) => {
      socket.to(roomId).emit('user_typing', { userId });
    });

    // ── Lobby events ────────────────────────────────────────────────────────

    socket.on('join_lobby', (lobbyId: string) => {
      socket.join('lobby:' + lobbyId);
    });

    socket.on('lobby_message', async (data: { lobbyId: string; content: string; senderName: string }) => {
      if (!data.lobbyId || !data.content?.trim()) return;

      const messageId = uuidv4();
      const doc = {
        id: messageId,
        content: data.content.trim().slice(0, 1000),
        senderId: userId,
        senderUsername: data.senderName,
        senderName: data.senderName,
        senderAvatar: socket.data.avatar as string,
        channelId: data.lobbyId,
        channelType: 'lobby' as const,
        createdAt: new Date(),
      };
      const mongo = getDb();
      if (!mongo) return;
      await saveMessage(mongo, doc);

      io.to('lobby:' + data.lobbyId).emit('new_lobby_message', {
        id: doc.id,
        content: doc.content,
        senderId: doc.senderId,
        senderName: doc.senderName,
        createdAt: doc.createdAt.toISOString(),
      });
    });

    socket.on('lobby_typing', (lobbyId: string) => {
      socket.to('lobby:' + lobbyId).emit('lobby_user_typing', { userId });
    });

    socket.on('leave_lobby', (lobbyId: string) => {
      socket.leave('lobby:' + lobbyId);
    });

    // ── Disconnect ──────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      const dissconnectSession = getSession();
      dissconnectSession
        .run(Q.SET_USER_ONLINE, { id: userId, isOnline: false })
        .finally(() => dissconnectSession.close());
    });
  });
}
