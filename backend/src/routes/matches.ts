import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';
import { requireAuth, JwtPayload } from '../middleware/auth.js';
import { parseNeo4jValue } from '../neo4j/utils.js';
import neo4j from 'neo4j-driver';

type AuthRequest = { user: JwtPayload };

export default async function matchRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const session = getSession();
    const result = await session.run(Q.GET_USER_MATCHES, { myId: userId });
    await session.close();

    const matches = result.records.map((r) => {
      const playHoursNode = r.get('playHours');
      const playHours = playHoursNode ? playHoursNode.properties : null;
      return {
        user:             r.get('other').properties,
        roomId:           r.get('roomId'),
        matchedAt:        r.get('matchedAt'),
        games:            r.get('games'),
        generalTimeSlots: r.get('generalSlots'),
        playHours,
      };
    });
    reply.send(matches);
  });

  // GET /lobbies — get joined lobbies
  app.get('/lobbies', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const session = getSession();
    const result = await session.run(Q.GET_USER_JOINED_LOBBIES, { userId });
    await session.close();
    reply.send(result.records.map((r) => ({
      ...r.get('l').properties,
      gameName: r.get('gameName'),
    })));
  });

  app.delete('/:roomId', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const { roomId } = req.params as { roomId: string };

    const session = getSession();
    try {
      await session.run(Q.DELETE_MATCH, { userId, roomId });
      await session.close();
      reply.code(200).send({ success: true, roomId });
    } catch (error) {
      await session.close();
      reply.code(500).send({ error: 'Failed to delete match' });
    }
  });

  // GET /:matchedUserId/rating — check if current user rated this match
  app.get('/:matchedUserId/rating', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const { matchedUserId } = req.params as { matchedUserId: string };

    const session = getSession();
    const result = await session.run(Q.CHECK_RATING, { userId, targetId: matchedUserId });
    await session.close();

    if (result.records.length === 0) {
      return reply.send({ rated: false });
    }

    reply.send({
      rated: true,
      stars: parseNeo4jValue(result.records[0].get('stars')),
      ratedAt: result.records[0].get('ratedAt'),
    });
  });

  // POST /:matchedUserId/rate — rate a matched user (1-5 stars)
  app.post('/:matchedUserId/rate', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const { matchedUserId } = req.params as { matchedUserId: string };

    const schema = z.object({ stars: z.number().int().min(1).max(5) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

    if (userId === matchedUserId) return reply.code(400).send({ error: 'Cannot rate yourself' });

    const session = getSession();

    // Check match exists
    const matchCheck = await session.run(
      `MATCH (a:User {id: $userId})-[m:MATCHED_WITH]->(b:User {id: $targetId}) RETURN count(m) > 0 AS exists`,
      { userId, targetId: matchedUserId }
    );
    const isMatched: boolean = matchCheck.records[0].get('exists');
    if (!isMatched) {
      await session.close();
      return reply.code(403).send({ error: 'Not matched with this user' });
    }

    // Check already rated
    const ratedCheck = await session.run(Q.CHECK_RATING, { userId, targetId: matchedUserId });
    if (ratedCheck.records.length > 0) {
      await session.close();
      return reply.code(409).send({ error: 'Already rated this user' });
    }

    // Create rating
    const result = await session.run(Q.CREATE_RATING, {
      userId, targetId: matchedUserId, stars: parsed.data.stars,
    });
    await session.close();

    if (result.records.length === 0) {
      return reply.code(500).send({ error: 'Failed to create rating' });
    }

    reply.code(201).send({ success: true, stars: parsed.data.stars });
  });
}
