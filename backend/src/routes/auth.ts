import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';
import { signToken } from '../middleware/auth.js';

const DISCORD_API = 'https://discord.com/api/v10';

export default async function authRoutes(app: FastifyInstance) {
  // Step 1: Redirect to Discord
  app.get('/discord', async (_req, reply) => {
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID ?? '',
      redirect_uri: process.env.DISCORD_CALLBACK_URL ?? '',
      response_type: 'code',
      scope: 'identify email',
    });
    reply.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
  });

  // Step 2: Discord callback — exchange code for access token, upsert user
  app.get<{ Querystring: { code?: string; error?: string } }>('/discord/callback', async (req, reply) => {
    const { code, error } = req.query;

    if (error || !code) {
      reply.redirect(`${process.env.FRONTEND_URL}/auth/error`);
      return;
    }

    // Exchange code for token
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.DISCORD_CLIENT_ID ?? '',
        client_secret: process.env.DISCORD_CLIENT_SECRET ?? '',
        grant_type:    'authorization_code',
        code,
        redirect_uri:  process.env.DISCORD_CALLBACK_URL ?? '',
      }),
    });

    if (!tokenRes.ok) {
      reply.redirect(`${process.env.FRONTEND_URL}/auth/error`);
      return;
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };

    // Fetch Discord user info
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = (await userRes.json()) as {
      id: string;
      username: string;
      avatar: string | null;
      global_name: string | null;
    };

    const avatar = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/0.png`;

    const session = getSession();
    const result = await session.run(Q.UPSERT_USER, {
      id:        uuidv4(),
      discordId: discordUser.id,
      username:  discordUser.global_name ?? discordUser.username,
      avatar,
    });
    await session.close();

    const user = result.records[0].get('u').properties;
    const jwtToken = signToken({ userId: user.id, discordId: user.discordId });

    reply.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${jwtToken}`);
  });

  // Verify token
  app.get('/me', async (req, reply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    try {
      const jwt_module = await import('jsonwebtoken');
      const payload = jwt_module.default.verify(
        authHeader.slice(7),
        process.env.JWT_SECRET ?? 'dev_secret'
      ) as { userId: string };

      const session = getSession();
      const result = await session.run(Q.GET_USER_BY_ID, { id: payload.userId });
      await session.close();

      if (!result.records.length) {
        reply.code(404).send({ error: 'User not found' });
        return;
      }

      const user = result.records[0].get('u').properties;
      const games = result.records[0].get('games');
      reply.send({ user, games });
    } catch {
      reply.code(401).send({ error: 'Invalid token' });
    }
  });
}
