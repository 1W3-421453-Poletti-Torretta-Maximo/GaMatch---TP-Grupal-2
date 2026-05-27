import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';

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

  io.on('connection', (socket: AuthSocket) => {
    const userId = socket.userId!;

    // Join personal room for match notifications
    socket.join(userId);

    // Mark user online in Neo4j
    const session = getSession();
    session.run(Q.SET_USER_ONLINE, { id: userId, isOnline: true }).finally(() => session.close());

    // Join a 1-1 chat room
    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
    });

    // Send 1-1 message
    socket.on('send_message', async (data: { roomId: string; content: string }) => {
      if (!data.roomId || !data.content?.trim()) return;

      const messageId = uuidv4();
      const session = getSession();
      const result = await session.run(Q.SAVE_MESSAGE, {
        id:       messageId,
        senderId: userId,
        content:  data.content.trim().slice(0, 1000),
        roomId:   data.roomId,
      });
      await session.close();

      const msg = result.records[0].get('msg').properties;
      io.to(data.roomId).emit('new_message', {
        ...msg,
        senderId: userId,
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
      const session = getSession();
      const result = await session.run(Q.SAVE_LOBBY_MESSAGE, {
        id:         messageId,
        lobbyId:    data.lobbyId,
        content:    data.content.trim().slice(0, 1000),
        senderId:   userId,
        senderName: data.senderName,
      });
      await session.close();

      const msg = result.records[0].get('msg').properties;
      io.to('lobby:' + data.lobbyId).emit('new_lobby_message', msg);
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
