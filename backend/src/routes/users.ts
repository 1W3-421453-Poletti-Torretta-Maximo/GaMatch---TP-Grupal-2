import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';
import { requireAuth, JwtPayload } from '../middleware/auth.js';

type AuthRequest = { user: JwtPayload };

export default async function userRoutes(app: FastifyInstance) {
  // GET /users/me — full profile with games
  app.get('/me', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const session = getSession();
    const result = await session.run(Q.GET_USER_BY_ID, { id: userId });
    await session.close();

    if (!result.records.length) return reply.code(404).send({ error: 'User not found' });

    reply.send({
      user: result.records[0].get('u').properties,
      games: result.records[0].get('games'),
    });
  });

  // PATCH /users/me — update bio
  app.patch('/me', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const schema = z.object({ bio: z.string().max(300) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

    const session = getSession();
    const result = await session.run(Q.UPDATE_USER_BIO, { id: userId, bio: parsed.data.bio });
    await session.close();
    reply.send(result.records[0].get('u').properties);
  });

  // PUT /users/me/games — add or update a game in profile
  app.put('/me/games', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const schema = z.object({
      gameId:       z.string(),
      role:         z.string(),
      rankId:       z.string(),
      rankTier:     z.number().int().min(0),
      isLookingNow: z.boolean().default(false),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

    const session = getSession();
    await session.run(Q.UPSERT_USER_GAME, { userId, ...parsed.data });
    await session.close();
    reply.code(200).send({ ok: true });
  });

  // DELETE /users/me/games/:gameId — remove a game from profile
  app.delete('/me/games/:gameId', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const { gameId } = req.params as { gameId: string };
    const session = getSession();
    await session.run(Q.REMOVE_USER_GAME, { userId, gameId });
    await session.close();
    reply.code(204).send();
  });

  // GET /users/:id — public profile
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const session = getSession();
    const result = await session.run(Q.GET_USER_BY_ID, { id });
    await session.close();

    if (!result.records.length) return reply.code(404).send({ error: 'User not found' });

    reply.send({
      user: result.records[0].get('u').properties,
      games: result.records[0].get('games'),
    });
  });
}
