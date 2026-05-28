import { FastifyInstance } from 'fastify';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { parseNeo4jValue } from '../neo4j/utils.js';

export default async function adminRoutes(app: FastifyInstance) {
  app.get('/stats', { preHandler: [requireAuth, requireAdmin] }, async (_req, reply) => {
    const session = getSession();
    try {
      const result = await session.run(Q.ADMIN_STATS);
      const row = result.records[0];

      reply.send({
        totalUsers: parseNeo4jValue(row.get('totalUsers')),
        totalMatches: parseNeo4jValue(row.get('totalMatches')),
        topGames: (row.get('topGames') as any[]).map((g: any) => ({
          name: g.name,
          count: parseNeo4jValue(g.count),
        })),
        topUsers: (row.get('topUsers') as any[]).map((u: any) => ({
          username: u.username,
          count: parseNeo4jValue(u.count),
        })),
        avgRating: parseNeo4jValue(row.get('avgRating')),
        totalRatings: parseNeo4jValue(row.get('totalRatings')),
      });
    } finally {
      await session.close();
    }
  });
}
