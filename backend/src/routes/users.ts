import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
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

    const row = result.records[0];
    const playHoursNode = row.get('playHours');
    const playHours = playHoursNode ? playHoursNode.properties : null;

    reply.send({
      user: { ...row.get('u').properties, avgRating: row.get('avgRating') },
      games: row.get('games'),
      playHours,
    });
  });

  // PATCH /users/me — update bio, avatarSeed, and/or timeSlots
  app.patch('/me', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const schema = z.object({
      bio: z.string().max(300),
      avatarSeed: z.string().optional(),
      timeSlots: z.array(z.string()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

    const session = getSession();
    const hasAvatarSeed = parsed.data.avatarSeed !== undefined;
    const result = hasAvatarSeed
      ? await session.run(Q.UPDATE_USER_PROFILE, {
          id: userId, bio: parsed.data.bio, avatarSeed: parsed.data.avatarSeed,
        })
      : await session.run(Q.UPDATE_USER_BIO, { id: userId, bio: parsed.data.bio });

    if (parsed.data.timeSlots !== undefined) {
      await session.run(Q.UPDATE_USER_TIMESLOTS, { userId, timeSlotIds: parsed.data.timeSlots });
    }

    await session.close();
    reply.send(result.records[0].get('u').properties);
  });

  // GET /users/me/timeslots — get current user's selected timeslots
  app.get('/me/timeslots', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const session = getSession();
    const result = await session.run(Q.GET_USER_TIMESLOTS, { userId });
    await session.close();
    reply.send(result.records.map((r) => r.get('ts').properties));
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
      timeSlots:    z.array(z.string()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

    const session = getSession();
    await session.run(Q.UPSERT_USER_GAME, { userId, ...parsed.data });
    if (parsed.data.timeSlots !== undefined) {
      await session.run(Q.UPDATE_USER_GAME_TIMESLOTS, { userId, gameId: parsed.data.gameId, timeSlotIds: parsed.data.timeSlots });
    }
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

  // PUT /users/me/playhours — set user play hours (game schedule)
  app.put('/me/playhours', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const schema = z.object({
      startHour: z.number().int().min(0).max(23),
      endHour: z.number().int().min(0).max(23),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

    if (parsed.data.startHour > parsed.data.endHour) {
      return reply.code(400).send({ error: 'Start hour must be before end hour' });
    }

    const session = getSession();
    const id = uuidv4();
    const result = await session.run(Q.UPSERT_USER_PLAY_HOURS, {
      userId,
      id,
      startHour: parsed.data.startHour,
      endHour: parsed.data.endHour,
    });
    await session.close();
    const playHours = result.records[0].get('ph').properties;
    reply.code(201).send(playHours);
  });

  // GET /users/me/playhours — get user play hours
  app.get('/me/playhours', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const session = getSession();
    const result = await session.run(Q.GET_USER_PLAY_HOURS, { userId });
    await session.close();
    
    if (result.records.length === 0) {
      return reply.code(200).send(null);
    }
    
    const playHours = result.records[0].get('ph').properties;
    reply.send(playHours);
  });

  // DELETE /users/me/playhours — remove user play hours
  app.delete('/me/playhours', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const session = getSession();
    await session.run(Q.DELETE_USER_PLAY_HOURS, { userId });
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

    const playHoursNode = result.records[0].get('playHours');
    const playHours = playHoursNode ? playHoursNode.properties : null;

    reply.send({
      user: result.records[0].get('u').properties,
      games: result.records[0].get('games'),
      playHours,
    });
  });
}
