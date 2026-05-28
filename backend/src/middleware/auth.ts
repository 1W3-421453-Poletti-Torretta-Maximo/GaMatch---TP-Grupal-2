import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  discordId: string;
}

function abort(reply: FastifyReply, statusCode: number, error: string): void {
  reply.code(statusCode).send({ error });
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    abort(reply, 401, 'Missing or invalid authorization header');
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? 'dev_secret') as JwtPayload;
    (req as FastifyRequest & { user: JwtPayload }).user = payload;
  } catch {
    abort(reply, 401, 'Invalid or expired token');
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET ?? 'dev_secret', { expiresIn: '7d' });
}
