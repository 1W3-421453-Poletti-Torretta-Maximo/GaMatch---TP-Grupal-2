import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { parseNeo4jValue } from '../neo4j/utils.js';

type AuthRequest = { user: { userId: string } };

export default async function adminRoutes(app: FastifyInstance) {
  app.get('/stats', { preHandler: [requireAuth, requireAdmin] }, async (_req, reply) => {
    const session = getSession();
    await session.close();
 
  });

// GET /admin/dashboard — comprehensive dashboard data
app.get('/dashboard', { preHandler: [requireAuth, requireAdmin] }, async (_req, reply) => {
  const session = getSession();
  try {
    // Execute all dashboard queries in parallel
    const [
      statsResult,
      topRatedResult,
      topLobbiesResult,
      searchTimeslotsResult,
      topMatchesResult,
    ] = await Promise.all([
      session.run(Q.ADMIN_STATS),
      session.run(Q.DASHBOARD_TOP_RATED_USERS, { limit: 5 }),
      session.run(Q.DASHBOARD_TOP_LOBBIES, { limit: 5 }),
      session.run(Q.DASHBOARD_SEARCH_TIMESLOTS),
      session.run(Q.DASHBOARD_TOP_MATCHES_USERS, { limit: 5 }),
    ]);

    const statsRow = statsResult.records[0];
    const topRated = topRatedResult.records.map((r) => r.get('userData').properties);
    const topLobbies = topLobbiesResult.records.map((r) => r.get('lobbyData').properties);
    const searchTimeslots = searchTimeslotsResult.records.map((r) => r.get('slotData').properties);
    const topMatches = topMatchesResult.records.map((r) => r.get('userData').properties);

    reply.send({
      stats: {
        totalUsers: parseNeo4jValue(statsRow.get('totalUsers')),
        totalMatches: parseNeo4jValue(statsRow.get('totalMatches')),
        avgRating: parseNeo4jValue(statsRow.get('avgRating')),
        totalRatings: parseNeo4jValue(statsRow.get('totalRatings')),
      },
      topGames: (statsRow.get('topGames') as any[]).map((g: any) => ({
        name: g.name,
        count: parseNeo4jValue(g.count),
      })),
      topRatedUsers: topRated.map((u: any) => ({
        username: u.username,
        avatar: u.avatar,
        rating: parseNeo4jValue(u.rating),
        ratingCount: parseNeo4jValue(u.ratingCount),
      })),
      topLobbies: topLobbies.map((l: any) => ({
        lobbyId: l.lobbyId,
        lobbyName: l.lobbyName,
        gameName: l.gameName,
        participantCount: parseNeo4jValue(l.participantCount),
        createdAt: l.createdAt,
      })),
      searchTimeslots: searchTimeslots.map((s: any) => ({
        slotId: s.slotId,
        slotName: s.slotName,
        startHour: parseNeo4jValue(s.startHour),
        endHour: parseNeo4jValue(s.endHour),
        userCount: parseNeo4jValue(s.userCount),
      })),
      topMatchesUsers: topMatches.map((u: any) => ({
        username: u.username,
        avatar: u.avatar,
        matchCount: parseNeo4jValue(u.matchCount),
      })),
    });
  } finally {
    await session.close();
  }
});

// POST /admin/promote — promote a user to admin
app.post('/promote', { preHandler: [requireAuth, requireAdmin] }, async (req, reply) => {
  const schema = z.object({
    username: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

  const session = getSession();
  try {
    const userResult = await session.run(Q.GET_USER_BY_USERNAME, { username: parsed.data.username });
    if (!userResult.records.length) {
      return reply.code(404).send({ error: 'Usuario no encontrado' });
    }

    const userId = userResult.records[0].get('u').properties.id;
    const updateResult = await session.run(Q.SET_USER_ROLE, { userId, role: 'admin' });

    if (!updateResult.records.length) {
      return reply.code(500).send({ error: 'Error al promover usuario' });
    }

    reply.send({
      ok: true,
      message: `${parsed.data.username} ha sido promovido a admin`,
      user: updateResult.records[0].get('u').properties,
    });
  } catch (error) {
    reply.code(500).send({ error: 'Error interno del servidor' });
  } finally {
    await session.close();
  }
});
}