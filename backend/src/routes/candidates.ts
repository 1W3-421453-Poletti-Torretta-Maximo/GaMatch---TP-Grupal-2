import { FastifyInstance, FastifyRequest } from 'fastify';
import { getSession } from '../neo4j/driver.js';
import { Q } from '../neo4j/queries.js';
import { requireAuth, JwtPayload } from '../middleware/auth.js';

type AuthRequest = { user: JwtPayload };

// --- FUNCIÓN LIMPIADORA DE NEO4J ---
// Recorre recursivamente los objetos y convierte los Integers de Neo4j a números JS
function parseNeo4jValues(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  // Si el objeto tiene la función toNumber() de Neo4j, lo convertimos
  if (typeof obj === 'object' && typeof obj.toNumber === 'function') {
    return obj.toNumber();
  }
  
  // Si es un array (ej: tu lista de 'games'), limpiamos cada elemento
  if (Array.isArray(obj)) {
    return obj.map(parseNeo4jValues);
  }
  
  // Si es un objeto, limpiamos cada una de sus propiedades
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
  // 1. Solución a requireAuth: Lo pasamos como array y silenciamos la queja estricta de TS
  app.get('/', { preHandler: [requireAuth as any] }, async (req, reply) => {
    
    // 2. Solución a req: Usamos explícitamente la interfaz de Fastify
    const { userId } = (req as FastifyRequest & AuthRequest).user;
    
    const query = req.query as {
      gameIds?: string;
      onlineOnly?: string;
      rankTolerance?: string;
      limit?: string;
    };

    const gameIds = query.gameIds ? query.gameIds.split(',') : [];
    const onlineOnly = query.onlineOnly === 'true';
    const rankTolerance = query.rankTolerance ? parseInt(query.rankTolerance) : -1;
    const limit = Math.min(parseInt(query.limit ?? '10'), 50);

    const session = getSession();
    
    try {
      const result = await session.run(Q.GET_CANDIDATES, {
        myId: userId,
        gameIds,
        onlineOnly,
        rankTolerance,
        limit,
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