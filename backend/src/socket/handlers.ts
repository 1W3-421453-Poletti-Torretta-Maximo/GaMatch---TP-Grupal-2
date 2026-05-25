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
    const onlineSession = getSession();
    onlineSession.run(Q.SET_USER_ONLINE, { id: userId, isOnline: true }).then(() => onlineSession.close());

    // Join a chat room
    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
    });

    // Send message
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

    socket.on('disconnect', () => {
      const offlineSession = getSession();
      offlineSession
        .run(Q.SET_USER_ONLINE, { id: userId, isOnline: false })
        .then(() => offlineSession.close());
    });
  });
}
