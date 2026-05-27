import { FastifyInstance } from 'fastify';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

export default async function adminRoutes(app: FastifyInstance) {
  app.get('/stats', { preHandler: [requireAuth, requireAdmin] }, async (_req, reply) => {
    const session = getSession();
    try {
      const result = await session.run(Q.ADMIN_STATS);
      const row = result.records[0];

      reply.send({
        totalUsers: (row.get('totalUsers') as any).toNumber(),
        totalMatches: (row.get('totalMatches') as any).toNumber(),
        topGames: (row.get('topGames') as any[]).map((g: any) => ({
          name: g.name,
          count: g.count.toNumber(),
        })),
        topUsers: (row.get('topUsers') as any[]).map((u: any) => ({
          username: u.username,
          count: u.count.toNumber(),
        })),
        avgRating: row.get('avgRating') != null ? (row.get('avgRating') as any).toNumber() : null,
        totalRatings: (row.get('totalRatings') as any).toNumber(),
      });
    } finally {
      await session.close();
    }
  });
}
