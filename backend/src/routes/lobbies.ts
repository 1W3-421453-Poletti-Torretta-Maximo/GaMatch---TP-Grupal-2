import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';
import { requireAuth, JwtPayload } from '../middleware/auth.js';
import { getDb } from '../mongodb/client.js';
import { getMessages } from '../mongodb/messages.js';

type AuthRequest = { user: JwtPayload };

export default async function lobbyRoutes(app: FastifyInstance) {
  // GET /?gameId=cs2 — list lobbies for a game
  app.get('/', { preHandler: requireAuth }, async (req, reply) => {
    const query = req.query as { gameId?: string };
    if (!query.gameId) return reply.code(400).send({ error: 'gameId is required' });

    const session = getSession();
    const result = await session.run(Q.GET_LOBBIES, { gameId: query.gameId });
    await session.close();

    const lobbies = result.records.map((r) => ({
      ...r.get('l').properties,
      gameName: r.get('gameName'),
    }));
    reply.send(lobbies);
  });

  // GET /:lobbyId — get a single lobby
  app.get('/:lobbyId', { preHandler: requireAuth }, async (req, reply) => {
    const { lobbyId } = req.params as { lobbyId: string };

    const session = getSession();
    const result = await session.run(Q.GET_LOBBY_BY_ID, { lobbyId });
    await session.close();

    if (!result.records.length) return reply.code(404).send({ error: 'Lobby not found' });

    const lobby = {
      ...result.records[0].get('l').properties,
      gameName: result.records[0].get('gameName'),
    };
    reply.send(lobby);
  });

  // POST / — create a lobby
  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const schema = z.object({
      name: z.string().min(1).max(50),
      gameId: z.string(),
      rankTier: z.string().default(''),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

    const session = getSession();
    const result = await session.run(Q.CREATE_LOBBY, {
      id: uuidv4(),
      name: parsed.data.name,
      gameId: parsed.data.gameId,
      rankTier: parsed.data.rankTier,
    });
    await session.close();

    reply.code(201).send(result.records[0].get('l').properties);
  });

  // POST /:lobbyId/join — join a lobby (persisted)
  app.post('/:lobbyId/join', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const { lobbyId } = req.params as { lobbyId: string };

    const session = getSession();
    await session.run(Q.JOIN_LOBBY, { userId, lobbyId });
    await session.close();
    reply.code(200).send({ ok: true });
  });

  // DELETE /:lobbyId/join — leave a lobby (persisted)
  app.delete('/:lobbyId/join', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = (req as typeof req & AuthRequest).user;
    const { lobbyId } = req.params as { lobbyId: string };

    const session = getSession();
    await session.run(Q.LEAVE_LOBBY, { userId, lobbyId });
    await session.close();
    reply.code(200).send({ ok: true });
  });

  // GET /:lobbyId/messages?limit=50
  app.get('/:lobbyId/messages', { preHandler: requireAuth }, async (req, reply) => {
    const { lobbyId } = req.params as { lobbyId: string };
    const query = req.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit ?? '50'), 100);

    const docs = await getMessages(getDb(), lobbyId, 'lobby', limit);
    const messages = docs.map((d) => ({
      id: d.id,
      content: d.content,
      senderId: d.senderId,
      senderName: d.senderName,
      createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    }));
    reply.send(messages);
  });
}
