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
                  u.avatarSeed = $avatarSeed,
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

  UPDATE_USER_PROFILE: `
    MATCH (u:User {id: $id})
    SET u.bio = $bio,
        u.avatarSeed = $avatarSeed,
        u.updatedAt = datetime()
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
    WITH DISTINCT candidate, me
    OPTIONAL MATCH (candidate)-[op:PLAYS]->(og:Game)
    OPTIONAL MATCH (me)-[:AVAILABLE_AT]->(myTs:TimeSlot)
    WITH candidate, op, og, [ts IN collect(DISTINCT myTs) WHERE ts IS NOT NULL | ts.id] AS mySlotIds
    OPTIONAL MATCH (candidate)-[:AVAILABLE_AT]->(theirTs:TimeSlot)
    WITH candidate, op, og, mySlotIds, [ts IN collect(DISTINCT theirTs) WHERE ts IS NOT NULL | ts.id] AS theirSlotIds
    WHERE size(mySlotIds) = 0 OR any(s IN mySlotIds WHERE s IN theirSlotIds)
    RETURN DISTINCT candidate,
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
    WITH a, b
    OPTIONAL MATCH (a)-[like1:LIKED]->(b)
    DELETE like1
    WITH a, b
    OPTIONAL MATCH (b)-[like2:LIKED]->(a)
    DELETE like2
    RETURN $roomId AS roomId
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

  // ── Ratings ─────────────────────────────────────────────────────────────────

  CHECK_RATING: `
    MATCH (u:User {id: $userId})-[r:RATED]->(target:User {id: $targetId})
    RETURN r.stars AS stars, r.ratedAt AS ratedAt
  `,

  CREATE_RATING: `
    MATCH (a:User {id: $userId}), (b:User {id: $targetId})
    WHERE exists((a)-[:MATCHED_WITH]->(b))
      AND NOT exists((a)-[:RATED]->(b))
    CREATE (a)-[:RATED {stars: $stars, ratedAt: datetime()}]->(b)
    RETURN $stars AS stars
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
  // ── TimeSlots ───────────────────────────────────────────────────────────────

  GET_ALL_TIMESLOTS: `
    MATCH (ts:TimeSlot)
    RETURN ts
    ORDER BY ts.startHour
  `,

  GET_USER_TIMESLOTS: `
    MATCH (u:User {id: $userId})-[:AVAILABLE_AT]->(ts:TimeSlot)
    RETURN ts
    ORDER BY ts.startHour
  `,

  UPDATE_USER_TIMESLOTS: `
    MATCH (u:User {id: $userId})
    OPTIONAL MATCH (u)-[r:AVAILABLE_AT]->(:TimeSlot)
    DELETE r
    WITH u
    UNWIND $timeSlotIds AS slotId
    MATCH (ts:TimeSlot {id: slotId})
    CREATE (u)-[:AVAILABLE_AT]->(ts)
  `,
  // ── Admin ──────────────────────────────────────────────────────────────────

  ADMIN_CHECK_ROLE: `
    MATCH (u:User {id: $userId})
    RETURN u.role AS role
  `,

  ADMIN_STATS: `
    MATCH (u:User)
    WITH count(u) AS totalUsers
    MATCH ()-[m:MATCHED_WITH]->()
    WITH totalUsers, count(m) / 2 AS totalMatches
    MATCH ()-[p:PLAYS]->(g:Game)
    WITH totalUsers, totalMatches, g, count(p) AS pc
    ORDER BY pc DESC
    WITH totalUsers, totalMatches, collect({name: g.name, count: pc})[..5] AS topGames
    MATCH (u:User)-[mw:MATCHED_WITH]->()
    WITH totalUsers, totalMatches, topGames, u, count(mw) AS mc
    ORDER BY mc DESC
    WITH totalUsers, totalMatches, topGames, collect({username: u.username, count: mc})[..5] AS topUsers
    OPTIONAL MATCH ()-[r:RATED]->()
    RETURN totalUsers, totalMatches, topGames, topUsers,
           toFloat(avg(r.stars)) AS avgRating,
           count(r) AS totalRatings
  `,

  // ── Lobbies ────────────────────────────────────────────────────────────────

  GET_LOBBY_BY_ID: `
    MATCH (l:Lobby {id: $lobbyId})-[:FOR_GAME]->(g:Game)
    RETURN l, g.name AS gameName
  `,

  GET_LOBBIES: `
    MATCH (l:Lobby)-[:FOR_GAME]->(g:Game {id: $gameId})
    RETURN l, g.name AS gameName
    ORDER BY l.createdAt DESC
  `,

  CREATE_LOBBY: `
    MATCH (g:Game {id: $gameId})
    CREATE (l:Lobby {
      id: $id,
      name: $name,
      gameId: $gameId,
      rankTier: $rankTier,
      createdAt: datetime()
    })
    CREATE (l)-[:FOR_GAME]->(g)
    RETURN l
  `,

  SAVE_LOBBY_MESSAGE: `
    MATCH (l:Lobby {id: $lobbyId})
    CREATE (msg:LobbyMessage {
      id: $id,
      content: $content,
      senderId: $senderId,
      senderName: $senderName,
      createdAt: datetime()
    })
    CREATE (l)-[:HAS_MESSAGE]->(msg)
    RETURN msg
  `,

  GET_LOBBY_MESSAGES: `
    MATCH (:Lobby {id: $lobbyId})-[:HAS_MESSAGE]->(msg:LobbyMessage)
    RETURN msg
    ORDER BY msg.createdAt ASC
    LIMIT $limit
  `,
} as const;
