import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../mongodb/client.js';
import { getMessages } from '../mongodb/messages.js';

export default async function messageRoutes(app: FastifyInstance) {
  // GET /messages/:roomId?limit=50
  app.get('/:roomId', { preHandler: requireAuth }, async (req, reply) => {
    const { roomId } = req.params as { roomId: string };
    const query = req.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit ?? '50'), 100);

    const docs = await getMessages(getDb(), roomId, 'direct', limit);
    const messages = docs.map((d) => ({
      id: d.id,
      content: d.content,
      sentAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
      roomId: d.channelId,
      senderId: d.senderId,
      senderUsername: d.senderUsername,
      senderAvatar: d.senderAvatar,
    }));
    reply.send(messages);
  });
}
