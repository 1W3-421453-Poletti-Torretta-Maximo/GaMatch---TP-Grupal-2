import { FastifyInstance } from 'fastify';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';
import { requireAuth, JwtPayload } from '../middleware/auth.js';

type AuthRequest = { user: JwtPayload };

export default async function candidateRoutes(app: FastifyInstance) {
  // GET /candidates?gameIds=lol,valorant&onlineOnly=true&rankTolerance=2&limit=10
  app.get('/', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const query = req.query as {
      gameIds?: string;
      onlineOnly?: string;
      rankTolerance?: string;
      limit?: string;
    };

    const gameIds = query.gameIds ? query.gameIds.split(',') : [];
    const onlineOnly = query.onlineOnly === 'true';
    const rankTolerance = query.rankTolerance ? parseInt(query.rankTolerance) : -1;
    const limit = Math.min(parseInt(query.limit ?? '10'), 50);

    const session = getSession();
    const result = await session.run(Q.GET_CANDIDATES, {
      myId: userId,
      gameIds,
      onlineOnly,
      rankTolerance,
      limit,
    });
    await session.close();

    const candidates = result.records.map((r) => ({
      ...r.get('candidate').properties,
      games: r.get('games'),
    }));

    reply.send(candidates);
  });
}
