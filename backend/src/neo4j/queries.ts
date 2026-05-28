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
                  u.avatarSeed = coalesce(u.avatarSeed, $avatarSeed),
                  u.updatedAt = datetime()
    RETURN u
  `,

  GET_USER_BY_ID: `
    MATCH (u:User {id: $id})
    OPTIONAL MATCH (u)-[p:PLAYS]->(g:Game)
    WITH u, p, g
    OPTIONAL MATCH (u)-[r:AVAILABLE_AT]->(gts:TimeSlot)
    WHERE g IS NOT NULL AND r.gameId = g.id
    WITH u, p, g, [ts IN collect(DISTINCT gts) WHERE ts IS NOT NULL | ts.id] AS gameSlotIds
    WITH u, collect(CASE WHEN g IS NOT NULL THEN { game: properties(g), role: p.role, rankId: p.rankId, rankTier: p.rankTier, isLookingNow: p.isLookingNow, timeSlots: gameSlotIds } ELSE null END) AS games
    OPTIONAL MATCH (u)-[:HAS_PLAY_HOURS]->(ph:PlayHours)
    WITH u, games, ph,
      [(reviewer)-[rate:RATED]->(u) | toFloat(rate.stars)] AS ratingList
    WITH u, games, ph,
      CASE WHEN size(ratingList) = 0 THEN 0.0 ELSE reduce(s = 0.0, v IN ratingList | s + v) / toFloat(size(ratingList)) END AS avgRating
    RETURN u,
      [x IN games WHERE x IS NOT NULL] AS games,
      ph AS playHours,
      avgRating
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
    WITH DISTINCT candidate, me, game
    OPTIONAL MATCH (me)-[:AVAILABLE_AT {gameId: game.id}]->(myTs:TimeSlot)
    OPTIONAL MATCH (candidate)-[:AVAILABLE_AT {gameId: game.id}]->(theirTs:TimeSlot)
    WITH candidate, me, game,
         [ts IN collect(DISTINCT myTs) WHERE ts IS NOT NULL | ts.id] AS mySlotIds,
         [ts IN collect(DISTINCT theirTs) WHERE ts IS NOT NULL | ts.id] AS theirSlotIds
    WHERE size(mySlotIds) = 0 OR any(s IN mySlotIds WHERE s IN theirSlotIds)
    WITH DISTINCT candidate, me
    WHERE size($timeSlotIds) = 0 OR size([(candidate)-[gtr:AVAILABLE_AT]->(ts2:TimeSlot) WHERE gtr.gameId IS NULL AND ts2.id IN $timeSlotIds | ts2]) > 0
    WITH DISTINCT candidate
    OPTIONAL MATCH (candidate)-[op:PLAYS]->(og:Game)
    OPTIONAL MATCH (candidate)-[:AVAILABLE_AT {gameId: og.id}]->(ogTs:TimeSlot)
    WITH candidate, op, og, [ts IN collect(DISTINCT ogTs) WHERE ts IS NOT NULL | ts.id] AS ogSlotIds
    WITH candidate,
      collect(CASE WHEN og IS NOT NULL THEN { game: properties(og), role: op.role, rankId: op.rankId, rankTier: op.rankTier, isLookingNow: op.isLookingNow, timeSlots: ogSlotIds } ELSE null END) AS rawGames
    WITH candidate, rawGames,
      [(reviewer)-[rate:RATED]->(candidate) | toFloat(rate.stars)] AS ratingList
    WITH candidate, rawGames,
      CASE WHEN size(ratingList) = 0 THEN 0.0 ELSE reduce(s = 0.0, v IN ratingList | s + v) / toFloat(size(ratingList)) END AS avgRating
    OPTIONAL MATCH (candidate)-[:HAS_PLAY_HOURS]->(ph:PlayHours)
    WITH candidate, rawGames, avgRating, ph
    WHERE ($playHoursStart IS NULL AND $playHoursEnd IS NULL)
      OR (ph IS NOT NULL AND ph.startHour <= $playHoursEnd AND ph.endHour >= $playHoursStart)
    RETURN candidate,
      [x IN rawGames WHERE x IS NOT NULL] AS games,
      [(candidate)-[gr:AVAILABLE_AT]->(gts:TimeSlot) WHERE gr.gameId IS NULL | gts.id] AS generalSlots,
      CASE WHEN ph IS NOT NULL THEN { startHour: ph.startHour, endHour: ph.endHour } ELSE null END AS playHours,
      avgRating
    ORDER BY avgRating DESC, rand()
    LIMIT $limit
  `,

  // ── Swipe ──────────────────────────────────────────────────────────────────

  RECORD_LIKE: `
    MATCH (a:User {id: $fromId}), (b:User {id: $toId})
    MERGE (a)-[:LIKED {timestamp: datetime()}]->(b)
  `,

  RECORD_DISLIKE: `
    MATCH (a:User {id: $fromId}), (b:User {id: $toId})
    MERGE (a)-[d:DISLIKED]->(b)
    SET d.timestamp = datetime()
  `,

  CLEAR_DISLIKES: `
    MATCH (u:User {id: $userId})-[d:DISLIKED]->()
    DELETE d
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
    OPTIONAL MATCH (other)-[:AVAILABLE_AT {gameId: og.id}]->(ogTs:TimeSlot)
    WITH other, m, og, op, [ts IN collect(DISTINCT ogTs) WHERE ts IS NOT NULL | ts.id] AS ogSlotIds
    WITH other, m, collect(CASE WHEN og IS NOT NULL THEN { game: properties(og), role: op.role, rankId: op.rankId, timeSlots: ogSlotIds } ELSE null END) AS games
    OPTIONAL MATCH (other)-[:HAS_PLAY_HOURS]->(ph:PlayHours)
    RETURN other,
           m.roomId AS roomId,
           m.matchedAt AS matchedAt,
           [x IN games WHERE x IS NOT NULL] AS games,
           [(other)-[gr:AVAILABLE_AT]->(gts:TimeSlot) WHERE gr.gameId IS NULL | gts.id] AS generalSlots,
           CASE WHEN ph IS NOT NULL THEN { startHour: ph.startHour, endHour: ph.endHour } ELSE null END AS playHours
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

  // ── Messages (moved to MongoDB) ──────────────────────────────────────────

  // SAVE_MESSAGE: `
  //   MATCH (sender:User {id: $senderId})
  //   CREATE (msg:Message {
  //     id:       $id,
  //     content:  $content,
  //     sentAt:   datetime(),
  //     roomId:   $roomId
  //   })
  //   CREATE (sender)-[:SENT]->(msg)
  //   RETURN msg
  // `,
  //
  // GET_MESSAGES: `
  //   MATCH (sender:User)-[:SENT]->(msg:Message {roomId: $roomId})
  //   RETURN msg, sender.id AS senderId, sender.username AS senderUsername, sender.avatar AS senderAvatar
  //   ORDER BY msg.sentAt ASC
  //   LIMIT $limit
  // `,

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
    MATCH (u:User {id: $userId})-[r:AVAILABLE_AT]->(ts:TimeSlot)
    WHERE r.gameId IS NULL
    RETURN DISTINCT ts
    ORDER BY ts.startHour
  `,

  UPDATE_USER_TIMESLOTS: `
    MATCH (u:User {id: $userId})
    OPTIONAL MATCH (u)-[r:AVAILABLE_AT]->(:TimeSlot)
    WHERE r.gameId IS NULL
    WITH u, collect(r) AS rels
    FOREACH (rel IN rels | DELETE rel)
    WITH u
    UNWIND $timeSlotIds AS slotId
    MATCH (ts:TimeSlot {id: slotId})
    CREATE (u)-[:AVAILABLE_AT]->(ts)
  `,

  GET_USER_GAME_TIMESLOTS: `
    MATCH (u:User {id: $userId})-[:AVAILABLE_AT {gameId: $gameId}]->(ts:TimeSlot)
    RETURN ts
    ORDER BY ts.startHour
  `,

  UPDATE_USER_GAME_TIMESLOTS: `
    MATCH (u:User {id: $userId})
    OPTIONAL MATCH (u)-[r:AVAILABLE_AT {gameId: $gameId}]->(:TimeSlot)
    WITH u, collect(r) AS rels
    FOREACH (rel IN rels | DELETE rel)
    WITH u
    UNWIND $timeSlotIds AS slotId
    MATCH (ts:TimeSlot {id: slotId})
    CREATE (u)-[:AVAILABLE_AT {gameId: $gameId}]->(ts)
  `,
  // ── Admin ──────────────────────────────────────────────────────────────────

  ADMIN_CHECK_ROLE: `
    MATCH (u:User {id: $userId})
    RETURN u.role AS role
  `,

  ADMIN_STATS: `
    MATCH (u:User)
    WITH count(u) AS totalUsers
    OPTIONAL MATCH ()-[m:MATCHED_WITH]->()
    WITH totalUsers, count(m) / 2 AS totalMatches
    OPTIONAL MATCH ()-[p:PLAYS]->(g:Game)
    WITH totalUsers, totalMatches, g, count(p) AS pc
    ORDER BY pc DESC
    WITH totalUsers, totalMatches,
         [x IN collect(CASE WHEN g IS NOT NULL THEN {name: g.name, count: pc} ELSE null END) WHERE x IS NOT NULL][..5] AS topGames
    OPTIONAL MATCH (uu:User)-[mw:MATCHED_WITH]->()
    WITH totalUsers, totalMatches, topGames, uu, count(mw) AS mc
    ORDER BY mc DESC
    WITH totalUsers, totalMatches, topGames,
         [x IN collect(CASE WHEN uu IS NOT NULL THEN {username: uu.username, count: mc} ELSE null END) WHERE x IS NOT NULL][..5] AS topUsers
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
    RETURN DISTINCT l, g.name AS gameName
    ORDER BY l.createdAt DESC
  `,

  GET_USER_JOINED_LOBBIES: `
    MATCH (me:User {id: $userId})-[:JOINED]->(l:Lobby)-[:FOR_GAME]->(g:Game)
    RETURN DISTINCT l, g.name AS gameName
    ORDER BY l.createdAt DESC
  `,

  JOIN_LOBBY: `
    MATCH (u:User {id: $userId}), (l:Lobby {id: $lobbyId})
    MERGE (u)-[:JOINED]->(l)
  `,

  LEAVE_LOBBY: `
    MATCH (u:User {id: $userId})-[r:JOINED]->(l:Lobby {id: $lobbyId})
    DELETE r
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

  // SAVE_LOBBY_MESSAGE: `
  //   MATCH (l:Lobby {id: $lobbyId})
  //   CREATE (msg:LobbyMessage {
  //     id: $id,
  //     content: $content,
  //     senderId: $senderId,
  //     senderName: $senderName,
  //     createdAt: datetime()
  //   })
  //   CREATE (l)-[:HAS_MESSAGE]->(msg)
  //   RETURN msg
  // `,
  //
  // GET_LOBBY_MESSAGES: `
  //   MATCH (:Lobby {id: $lobbyId})-[:HAS_MESSAGE]->(msg:LobbyMessage)
  //   RETURN msg
  //   ORDER BY msg.createdAt ASC
  //   LIMIT $limit
  // `,

  // ── PlayHours (Game play schedule) ─────────────────────────────────────────

  GET_USER_PLAY_HOURS: `
    MATCH (u:User {id: $userId})-[:HAS_PLAY_HOURS]->(ph:PlayHours)
    RETURN ph
  `,

  UPSERT_USER_PLAY_HOURS: `
    MATCH (u:User {id: $userId})
    MERGE (ph:PlayHours {id: $id})
    SET ph.startHour = $startHour,
        ph.endHour = $endHour,
        ph.createdAt = datetime()
    WITH u, ph
    OPTIONAL MATCH (u)-[old:HAS_PLAY_HOURS]->(:PlayHours)
    DELETE old
    CREATE (u)-[:HAS_PLAY_HOURS]->(ph)
    RETURN ph
  `,

  DELETE_USER_PLAY_HOURS: `
    MATCH (u:User {id: $userId})-[r:HAS_PLAY_HOURS]->(:PlayHours)
    DELETE r
  `,

  GET_USER_BY_ID_WITH_PLAYHOURS: `
    MATCH (u:User {id: $id})
    OPTIONAL MATCH (u)-[p:PLAYS]->(g:Game)
    WITH u, p, g
    OPTIONAL MATCH (u)-[r:AVAILABLE_AT]->(gts:TimeSlot)
    WHERE g IS NOT NULL AND r.gameId = g.id
    WITH u, p, g, [ts IN collect(DISTINCT gts) WHERE ts IS NOT NULL | ts.id] AS gameSlotIds
    WITH u, collect(CASE WHEN g IS NOT NULL THEN { game: properties(g), role: p.role, rankId: p.rankId, rankTier: p.rankTier, isLookingNow: p.isLookingNow, timeSlots: gameSlotIds } ELSE null END) AS games
    OPTIONAL MATCH (u)-[:HAS_PLAY_HOURS]->(ph:PlayHours)
    RETURN u,
      [x IN games WHERE x IS NOT NULL] AS games,
      ph
  `,

  GET_CANDIDATES_WITH_PLAYHOURS: `
    MATCH (me:User {id: $myId})-[mp:PLAYS]->(game:Game)<-[cp:PLAYS]-(candidate:User)
    WHERE candidate.id <> $myId
      AND NOT (me)-[:LIKED|DISLIKED|MATCHED_WITH]->(candidate)
      AND (size($gameIds) = 0 OR game.id IN $gameIds)
      AND ($onlineOnly = false OR candidate.isOnline = true)
      AND ($rankTolerance = -1 OR abs(toInteger(cp.rankTier) - toInteger(mp.rankTier)) <= $rankTolerance)
    WITH DISTINCT candidate, me, game
    OPTIONAL MATCH (me)-[:AVAILABLE_AT {gameId: game.id}]->(myTs:TimeSlot)
    OPTIONAL MATCH (candidate)-[:AVAILABLE_AT {gameId: game.id}]->(theirTs:TimeSlot)
    WITH candidate, me, game,
         [ts IN collect(DISTINCT myTs) WHERE ts IS NOT NULL | ts.id] AS mySlotIds,
         [ts IN collect(DISTINCT theirTs) WHERE ts IS NOT NULL | ts.id] AS theirSlotIds
    WHERE size(mySlotIds) = 0 OR any(s IN mySlotIds WHERE s IN theirSlotIds)
    WITH DISTINCT candidate, me
    WHERE size($timeSlotIds) = 0 OR size([(candidate)-[gtr:AVAILABLE_AT]->(ts2:TimeSlot) WHERE gtr.gameId IS NULL AND ts2.id IN $timeSlotIds | ts2]) > 0
    WITH DISTINCT candidate
    OPTIONAL MATCH (candidate)-[op:PLAYS]->(og:Game)
    OPTIONAL MATCH (candidate)-[:AVAILABLE_AT {gameId: og.id}]->(ogTs:TimeSlot)
    WITH candidate, op, og, [ts IN collect(DISTINCT ogTs) WHERE ts IS NOT NULL | ts.id] AS ogSlotIds
    WITH candidate,
      collect(CASE WHEN og IS NOT NULL THEN { game: properties(og), role: op.role, rankId: op.rankId, rankTier: op.rankTier, isLookingNow: op.isLookingNow, timeSlots: ogSlotIds } ELSE null END) AS rawGames
    WITH candidate, rawGames,
      [(reviewer)-[rate:RATED]->(candidate) | toFloat(rate.stars)] AS ratingList
    WITH candidate, rawGames,
      CASE WHEN size(ratingList) = 0 THEN 0.0 ELSE reduce(s = 0.0, v IN ratingList | s + v) / toFloat(size(ratingList)) END AS avgRating
    OPTIONAL MATCH (candidate)-[:HAS_PLAY_HOURS]->(ph:PlayHours)
    WITH candidate, rawGames, avgRating, ph
    WHERE ($playHoursStart IS NULL AND $playHoursEnd IS NULL)
      OR (ph IS NOT NULL AND ph.startHour <= $playHoursEnd AND ph.endHour >= $playHoursStart)
    RETURN candidate,
      [x IN rawGames WHERE x IS NOT NULL] AS games,
      [(candidate)-[gr:AVAILABLE_AT]->(gts:TimeSlot) WHERE gr.gameId IS NULL | gts.id] AS generalSlots,
      CASE WHEN ph IS NOT NULL THEN { startHour: ph.startHour, endHour: ph.endHour } ELSE null END AS playHours,
      avgRating
    ORDER BY avgRating DESC, rand()
    LIMIT $limit
  `,
} as const;
