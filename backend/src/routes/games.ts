import { FastifyInstance } from 'fastify';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';

export default async function gameRoutes(app: FastifyInstance) {
  app.get('/', async (_req, reply) => {
    const session = getSession();
    const result = await session.run(Q.GET_ALL_GAMES);
    await session.close();

    const games = result.records.map((r) => ({
      ...r.get('g').properties,
      ranks: r.get('ranks').map((n: { properties: unknown }) => n.properties),
      roles: r.get('roles').map((n: { properties: unknown }) => n.properties),
    }));
    reply.send(games);
  });

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const session = getSession();
    const result = await session.run(Q.GET_GAME_BY_ID, { id });
    await session.close();

    if (!result.records.length) return reply.code(404).send({ error: 'Game not found' });

    const r = result.records[0];
    reply.send({
      ...r.get('g').properties,
      ranks: r.get('ranks').map((n: { properties: unknown }) => n.properties),
      roles: r.get('roles').map((n: { properties: unknown }) => n.properties),
    });
  });
}
