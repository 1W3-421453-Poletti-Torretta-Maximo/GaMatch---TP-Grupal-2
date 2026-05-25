// All Cypher queries centralized here

export const Q = {
  // ── Users ──────────────────────────────────────────────────────────────────

  UPSERT_USER: `
    MERGE (u:User {discordId: $discordId})
    ON CREATE SET u.id        = $id,
                  u.createdAt = datetime(),
                  u.isOnline  = false,
                  u.bio       = '',
                  u.username  = $username,
                  u.avatar    = $avatar,
                  u.updatedAt = datetime()
    ON MATCH SET  u.username  = $username,
                  u.avatar    = $avatar,
                  u.updatedAt = datetime()
    RETURN u
  `,

  GET_USER_BY_ID: `
    MATCH (u:User {id: $id})
    OPTIONAL MATCH (u)-[p:PLAYS]->(g:Game)
    WITH u, p, g
    RETURN u,
      [x IN collect(CASE WHEN g IS NOT NULL THEN { game: properties(g), role: p.role, rankId: p.rankId, rankTier: p.rankTier, isLookingNow: p.isLookingNow } ELSE null END) WHERE x IS NOT NULL] AS games
  `,

  GET_USER_BY_DISCORD: `
    MATCH (u:User {discordId: $discordId})
    RETURN u
  `,

  UPDATE_USER_BIO: `
    MATCH (u:User {id: $id})
    SET u.bio = $bio
    RETURN u
  `,

  SET_USER_ONLINE: `
    MATCH (u:User {id: $id})
    SET u.isOnline = $isOnline, u.lastSeen = datetime()
    RETURN u
  `,

  // ── Profile / Games played ──────────────────────────────────────────────────

  UPSERT_USER_GAME: `
    MATCH (u:User {id: $userId})
    MATCH (g:Game {id: $gameId})
    MERGE (u)-[p:PLAYS]->(g)
    SET p.role         = $role,
        p.rankId       = $rankId,
        p.rankTier     = $rankTier,
        p.isLookingNow = $isLookingNow
    RETURN u, g, p
  `,

  REMOVE_USER_GAME: `
    MATCH (u:User {id: $userId})-[p:PLAYS]->(g:Game {id: $gameId})
    DELETE p
  `,

  // ── Candidates (matching feed) ──────────────────────────────────────────────

  GET_CANDIDATES: `
    MATCH (me:User {id: $myId})-[mp:PLAYS]->(game:Game)<-[cp:PLAYS]-(candidate:User)
    WHERE candidate.id <> $myId
      AND NOT (me)-[:LIKED|DISLIKED|MATCHED_WITH]->(candidate)
      AND (size($gameIds) = 0 OR game.id IN $gameIds)
      AND ($onlineOnly = false OR candidate.isOnline = true)
      AND ($rankTolerance = -1 OR abs(toInteger(cp.rankTier) - toInteger(mp.rankTier)) <= $rankTolerance)
    WITH DISTINCT candidate
    OPTIONAL MATCH (candidate)-[op:PLAYS]->(og:Game)
    WITH candidate, op, og
    RETURN candidate,
      [x IN collect(CASE WHEN og IS NOT NULL THEN { game: properties(og), role: op.role, rankId: op.rankId, rankTier: op.rankTier, isLookingNow: op.isLookingNow } ELSE null END) WHERE x IS NOT NULL] AS games
    ORDER BY rand()
    LIMIT $limit
  `,

  // ── Swipe ──────────────────────────────────────────────────────────────────

  RECORD_LIKE: `
    MATCH (a:User {id: $fromId}), (b:User {id: $toId})
    MERGE (a)-[:LIKED {timestamp: datetime()}]->(b)
  `,

  RECORD_DISLIKE: `
    MATCH (a:User {id: $fromId}), (b:User {id: $toId})
    MERGE (a)-[:DISLIKED {timestamp: datetime()}]->(b)
  `,

  CHECK_MUTUAL_LIKE: `
    MATCH (a:User {id: $fromId})-[:LIKED]->(b:User {id: $toId})-[:LIKED]->(a)
    RETURN count(*) > 0 AS isMatch
  `,

  CREATE_MATCH: `
    MATCH (a:User {id: $userAId}), (b:User {id: $userBId})
    MERGE (a)-[:MATCHED_WITH {matchedAt: datetime(), roomId: $roomId}]->(b)
    MERGE (b)-[:MATCHED_WITH {matchedAt: datetime(), roomId: $roomId}]->(a)
    RETURN $roomId AS roomId
  `,

  // ── Matches ────────────────────────────────────────────────────────────────

  GET_USER_MATCHES: `
    MATCH (me:User {id: $myId})-[m:MATCHED_WITH]->(other:User)
    OPTIONAL MATCH (other)-[op:PLAYS]->(og:Game)
    RETURN other,
           m.roomId AS roomId,
           m.matchedAt AS matchedAt,
           collect({ game: properties(og), role: op.role, rankId: op.rankId }) AS games
    ORDER BY m.matchedAt DESC
  `,

  DELETE_MATCH: `
    MATCH (a:User {id: $userId})-[m:MATCHED_WITH {roomId: $roomId}]->(b:User)
    DELETE m
    WITH a, b, $roomId AS roomId
    MATCH (b)-[m2:MATCHED_WITH {roomId: roomId}]->(a)
    DELETE m2
    RETURN roomId
  `,

  // ── Messages ───────────────────────────────────────────────────────────────

  SAVE_MESSAGE: `
    MATCH (sender:User {id: $senderId})
    CREATE (msg:Message {
      id:       $id,
      content:  $content,
      sentAt:   datetime(),
      roomId:   $roomId
    })
    CREATE (sender)-[:SENT]->(msg)
    RETURN msg
  `,

  GET_MESSAGES: `
    MATCH (sender:User)-[:SENT]->(msg:Message {roomId: $roomId})
    RETURN msg, sender.id AS senderId, sender.username AS senderUsername, sender.avatar AS senderAvatar
    ORDER BY msg.sentAt ASC
    LIMIT $limit
  `,

  // ── Games catalog ──────────────────────────────────────────────────────────

  GET_ALL_GAMES: `
    MATCH (g:Game)
    OPTIONAL MATCH (r:Rank {gameId: g.id})
    OPTIONAL MATCH (ro:Role {gameId: g.id})
    RETURN g,
           collect(DISTINCT r) AS ranks,
           collect(DISTINCT ro) AS roles
    ORDER BY g.name
  `,

  GET_GAME_BY_ID: `
    MATCH (g:Game {id: $id})
    OPTIONAL MATCH (r:Rank {gameId: $id})
    OPTIONAL MATCH (ro:Role {gameId: $id})
    RETURN g, collect(DISTINCT r) AS ranks, collect(DISTINCT ro) AS roles
  `,
} as const;
