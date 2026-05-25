import { FastifyInstance, FastifyRequest } from 'fastify';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';
import { requireAuth, JwtPayload } from '../middleware/auth.js';
import neo4j from 'neo4j-driver'; // 1. Agrega esto para tipar los números

type AuthRequest = { user: JwtPayload };

function parseNeo4jValues(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'object' && typeof obj.toNumber === 'function') {
    return obj.toNumber();
  }
  if (Array.isArray(obj)) {
    return obj.map(parseNeo4jValues);
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = parseNeo4jValues(obj[key]);
    }
    return result;
  }
  return obj;
}

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
    const onlineOnly = query.onlineOnly === 'true';
    const rankTolerance = query.rankTolerance ? parseInt(query.rankTolerance) : -1;
    const limit = Math.min(parseInt(query.limit ?? '10'), 50);

    const session = getSession();
    
    try {
      // 4. Parámetros hiper-estrictos para que el driver de Neo4j no se queje
      const result = await session.run(Q.GET_CANDIDATES, {
        myId: myId,
        gameIds: gameIds,
        onlineOnly: onlineOnly,
        rankTolerance: neo4j.int(rankTolerance), // Obligamos a que sea Integer
        limit: neo4j.int(limit),                 // Obligamos a que sea Integer
      });

      const candidates = result.records.map((r) => {
        const rawProperties = r.get('candidate').properties;
        const rawGames = r.get('games');
        
        return parseNeo4jValues({
          ...rawProperties,
          games: rawGames,
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