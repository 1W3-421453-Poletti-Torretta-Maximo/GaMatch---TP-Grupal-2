import { FastifyRequest, FastifyReply } from 'fastify';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = (req as FastifyRequest & { user: { userId: string } }).user;
  if (!user?.userId) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }

  const session = getSession();
  try {
    const result = await session.run(Q.ADMIN_CHECK_ROLE, { userId: user.userId });
    if (!result.records.length) {
      reply.code(404).send({ error: 'User not found' });
      return;
    }
    const role: string = result.records[0].get('role') ?? 'user';
    if (role !== 'admin') {
      reply.code(403).send({ error: 'Forbidden — admin access required' });
      return;
    }
  } finally {
    await session.close();
  }
}
