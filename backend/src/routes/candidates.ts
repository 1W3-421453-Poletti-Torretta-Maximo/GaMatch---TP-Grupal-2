import { FastifyInstance, FastifyRequest } from 'fastify';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';
import { requireAuth, JwtPayload } from '../middleware/auth.js';
import { parseNeo4jValue } from '../neo4j/utils.js';
import neo4j from 'neo4j-driver';

type AuthRequest = { user: JwtPayload };

export default async function candidateRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [requireAuth as any] }, async (req, reply) => {
    
    // 2. Extraemos el payload forzando a TypeScript a aceptar cualquier propiedad
    const userPayload = (req as any).user as Record<string, any>;
    
    // 3. Rescate seguro del ID: cubrimos los 3 nombres de variables más comunes
    const myId = userPayload?.userId || userPayload?.id || userPayload?.discordId;

    if (!myId) {
      console.error("Token no contiene un ID reconocible:", userPayload);
      return reply.status(401).send({ error: "Falta el ID del usuario en el token" });
    }

    const query = req.query as any;

    const gameIds = query.gameIds ? query.gameIds.split(',') : [];
    const timeSlotIds = query.timeSlotIds ? query.timeSlotIds.split(',') : [];
    const onlineOnly = query.onlineOnly === 'true';
    const parsedTolerance = parseInt(query.rankTolerance ?? '');
    const rankTolerance = isNaN(parsedTolerance) ? -1 : parsedTolerance;
    const parsedLimit = parseInt(query.limit ?? '10');
    const limit = Math.min(isNaN(parsedLimit) ? 10 : parsedLimit, 50);
    const playHoursStart = query.playHoursStart !== undefined ? parseInt(query.playHoursStart) : null;
    const playHoursEnd = query.playHoursEnd !== undefined ? parseInt(query.playHoursEnd) : null;

    const session = getSession();

    try {
      // Fetch candidates with PlayHours
      const result = await session.run(Q.GET_CANDIDATES_WITH_PLAYHOURS, {
        myId: myId,
        gameIds: gameIds,
        timeSlotIds: timeSlotIds,
        onlineOnly: onlineOnly,
        rankTolerance: neo4j.int(rankTolerance),
        playHoursStart: playHoursStart !== null ? neo4j.int(playHoursStart) : null,
        playHoursEnd: playHoursEnd !== null ? neo4j.int(playHoursEnd) : null,
        limit: neo4j.int(limit),
      });

      const candidates = result.records.map((r) => {
        const rawProperties = r.get('candidate').properties;
        const rawGames = r.get('games');
        const rawGeneralSlots = r.get('generalSlots');
        const rawPlayHours = r.get('playHours');
        const rawAvgRating = r.get('avgRating');

        return parseNeo4jValue({
          ...rawProperties,
          games: rawGames,
          generalTimeSlots: rawGeneralSlots,
          playHours: rawPlayHours,
          avgRating: rawAvgRating,
        });
      });

      reply.send(candidates);
      
    } catch (error) {
      console.error("Error ejecutando Cypher en /candidates:", error);
      reply.status(500).send({ error: "Internal Server Error" });
    } finally {
      await session.close();
    }
  });
}