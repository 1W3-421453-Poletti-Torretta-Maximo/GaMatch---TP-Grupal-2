import { FastifyInstance } from 'fastify';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';

export default async function timeslotRoutes(app: FastifyInstance) {
  app.get('/', async (_req, reply) => {
    const session = getSession();
    const result = await session.run(Q.GET_ALL_TIMESLOTS);
    await session.close();

    const timeslots = result.records.map((r) => r.get('ts').properties);
    reply.send(timeslots);
  });
}
