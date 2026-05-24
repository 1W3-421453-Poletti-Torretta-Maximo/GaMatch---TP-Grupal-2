import { FastifyInstance } from 'fastify';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';
import { requireAuth, JwtPayload } from '../middleware/auth.js';

type AuthRequest = { user: JwtPayload };

export default async function matchRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const session = getSession();
    const result = await session.run(Q.GET_USER_MATCHES, { myId: userId });
    await session.close();

    const matches = result.records.map((r) => ({
      user:      r.get('other').properties,
      roomId:    r.get('roomId'),
      matchedAt: r.get('matchedAt'),
      games:     r.get('games'),
    }));
    reply.send(matches);
  });
}
