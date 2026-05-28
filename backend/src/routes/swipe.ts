import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';
import { requireAuth, JwtPayload } from '../middleware/auth.js';

type AuthRequest = { user: JwtPayload };

export default async function swipeRoutes(app: FastifyInstance) {
  // POST /swipe — { targetId, direction: 'like' | 'dislike' }
  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const schema = z.object({
      targetId:  z.string().uuid(),
      direction: z.enum(['like', 'dislike']),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

    const { targetId, direction } = parsed.data;
    if (userId === targetId) return reply.code(400).send({ error: 'Cannot swipe yourself' });

    const session = getSession();

    if (direction === 'dislike') {
      await session.run(Q.RECORD_DISLIKE, { fromId: userId, toId: targetId });
      await session.close();
      return reply.send({ match: false });
    }

    // Check if match already exists (recovered from deletion)
    const existingMatchResult = await session.run(
      `MATCH (a:User {id: $userId})-[m:MATCHED_WITH]->(b:User {id: $targetId}) RETURN COUNT(m) > 0 AS exists`,
      { userId, targetId }
    );
    const existingMatch = existingMatchResult.records[0].get('exists');
    if (existingMatch) {
      await session.close();
      return reply.send({ match: false, alreadyMatched: true });
    }

    await session.run(Q.RECORD_LIKE, { fromId: userId, toId: targetId });

    const mutualResult = await session.run(Q.CHECK_MUTUAL_LIKE, { fromId: userId, toId: targetId });
    const isMatch: boolean = mutualResult.records[0].get('isMatch');

    if (isMatch) {
      const roomId = uuidv4();
      await session.run(Q.CREATE_MATCH, { userAId: userId, userBId: targetId, roomId });
      await session.close();

      // Notify both users via Socket.io if connected
      const io = (app as unknown as { io: import('socket.io').Server }).io;
      if (io) {
        io.to(userId).emit('new_match', { matchedUserId: targetId, roomId });
        io.to(targetId).emit('new_match', { matchedUserId: userId, roomId });
      }

      return reply.send({ match: true, roomId });
    }

    await session.close();
    reply.send({ match: false });
  });
}
