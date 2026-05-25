import { FastifyInstance } from 'fastify';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';
import { requireAuth } from '../middleware/auth.js';
import neo4j from 'neo4j-driver';

export default async function messageRoutes(app: FastifyInstance) {
  // GET /messages/:roomId?limit=50
  app.get('/:roomId', { preHandler: requireAuth }, async (req, reply) => {
    const { roomId } = req.params as { roomId: string };
    const query = req.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit ?? '50'), 100);

    const session = getSession();
    try {
      const result = await session.run(Q.GET_MESSAGES, { roomId, limit: neo4j.int(limit) });
      const messages = result.records.map((r) => ({
        ...r.get('msg').properties,
        senderId:       r.get('senderId'),
        senderUsername: r.get('senderUsername'),
        senderAvatar:   r.get('senderAvatar'),
      }));
      reply.send(messages);
    } finally {
      await session.close();
    }
  });
}
