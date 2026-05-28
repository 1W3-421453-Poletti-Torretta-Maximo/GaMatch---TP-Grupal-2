# GaMatch — Handoff

## Objetivo

GaMatch es una app estilo Tinder para gamers. Los usuarios se pueden conectar con otros jugadores por juego, rango, horario disponible y estrellas recibidas. Incluye chat 1-1, lobbies grupales, sistema de rating, y filtros avanzados de búsqueda.

Stack: React + Vite (frontend), Fastify 5 (backend), Neo4j (base de datos de grafos), Socket.io (tiempo real), Railway (deploy).

---

## Estado Actual

### Lo que funciona

- Swipe con like/dislike y detección de match mutuo
- Chat 1-1 al hacer match, con mensajes en tiempo real via Socket.io
- Lobbies: crear, unirse, chatear, salirse (botón implementado)
- Al clickear el nombre de alguien en un lobby, se le envía un like. Si ya era match, muestra "Ya hiciste match con este jugador 💜"
- Avatar con navegación prev/next; solo se guarda al apretar "Guardar"
- Filtros de candidatos: juego, online only, rank tolerance, timeslot, play hours
- Candidatos ordenados por promedio de estrellas (mayor primero), luego random
- Filtros en Settings muestran juegos/horarios deshabilitados si el usuario no los tiene en su perfil
- Timeslots por juego visibles en tarjetas de SwipeCard y en lista de matches
- PlayHours guardado en backend y mostrado en SwipeCard y Matches
- Endpoints de PlayHours: `GET/PUT/DELETE /users/me/playhours`
- Sistema de rating (1-5 estrellas) entre usuarios que hicieron match

### Lo que NO funciona / está pendiente

- **SwipeCard.tsx tiene emojis corruptos** — el archivo fue editado externamente y los emojis se guardaron como mojibake (ej: `ðŸŒ…` en vez de 🌅). Se ve mal en el explorador.
- **No hay UI de PlayHours en Profile** — el backend y el store están listos, pero el usuario no puede configurar su horario de juego desde la app.
- **No hay UI de filtro PlayHours en Settings** — el store (swipeStore) soporta `playHoursStart`/`playHoursEnd`, pero no hay controles en la pantalla de filtros.
- **`GET_CANDIDATES` es código muerto** — la ruta `candidates.ts` ahora usa `GET_CANDIDATES_WITH_PLAYHOURS`. La query vieja sigue en `queries.ts` sin usarse.
- **`GET_USER_BY_ID` tiene sintaxis sospechosa** — la línea de return de games usa `[x IN collect(CASE WHEN x IS NOT NULL THEN x ELSE null END) | x WHERE x IS NOT NULL]` que puede fallar en algunas versiones de Neo4j.

---

## Archivos Trabajados

### Backend

| Archivo | Estado |
|---|---|
| `backend/src/neo4j/queries.ts` | Muy modificado. Tiene queries nuevas y GET_CANDIDATES_WITH_PLAYHOURS |
| `backend/src/routes/candidates.ts` | Modificado: usa nueva query, parsea timeSlotIds y playHours |
| `backend/src/routes/matches.ts` | Modificado: mapea `playHours` en resultados |
| `backend/src/routes/swipe.ts` | Modificado: devuelve `alreadyMatched: true` si ya había match |
| `backend/src/routes/lobbies.ts` | Modificado: agregado `DELETE /:lobbyId/join` (salir del lobby) |
| `backend/src/routes/users.ts` | Modificado: agregado `PUT/GET/DELETE /me/playhours` |

### Frontend

| Archivo | Estado |
|---|---|
| `frontend/src/types/index.ts` | Modificado: agregadas interfaces `PlayHours`, campos en `Candidate`, `Match`, `SwipeFilters` |
| `frontend/src/store/authStore.ts` | Modificado: `playHours` en estado, `setPlayHours()`, fetch en login/refreshProfile |
| `frontend/src/store/swipeStore.ts` | Modificado: filtros playHoursStart/End, fix de loop infinito en catch |
| `frontend/src/pages/Profile.tsx` | Modificado: navegación prev/next de avatar, timeslots por juego |
| `frontend/src/pages/Settings.tsx` | Modificado: sección de timeslots, juegos y horarios deshabilitados si no están en perfil |
| `frontend/src/pages/Matches.tsx` | Modificado: muestra `playHours` con ⏰ |
| `frontend/src/pages/LobbyChatRoom.tsx` | Modificado: botón para salir del lobby (LogOut icon) |
| `frontend/src/components/LobbyChat/LobbyChat.tsx` | Modificado: like al clickear nombre, notificación toast |
| `frontend/src/components/SwipeCard/SwipeCard.tsx` | Modificado externamente — **ROTO** (emojis corruptos) |

---

## Qué Cambié

### Queries Neo4j

- **`GET_CANDIDATES_WITH_PLAYHOURS`** (nueva, reemplaza `GET_CANDIDATES`):
  - Filtra por timeslot por juego (AVAILABLE_AT con `gameId`)
  - Filtra por timeslot general (AVAILABLE_AT sin `gameId`)
  - Filtra por PlayHours (overlap `startHour <= $end AND endHour >= $start`)
  - Calcula `avgRating` con pattern comprehension + `reduce()`
  - Ordena por `avgRating DESC, rand()`
  - Devuelve `generalSlots`, `playHours`, `avgRating`

- **`LEAVE_LOBBY`** (nueva):
  ```cypher
  MATCH (u:User {id: $userId})-[r:JOINED]->(l:Lobby {id: $lobbyId}) DELETE r
  ```

- **PlayHours queries** (nuevas): `GET_USER_PLAY_HOURS`, `UPSERT_USER_PLAY_HOURS`, `DELETE_USER_PLAY_HOURS`

### Rutas Backend

- `DELETE /lobbies/:lobbyId/join` — salir del lobby
- `PUT/GET/DELETE /users/me/playhours` — gestión de horario de juego
- `POST /swipe` — devuelve `{ alreadyMatched: true }` cuando ya hay match previo

### Frontend

- **SwipeDeck loop infinito arreglado**: el catch de `fetchCandidates` ahora setea `hasMore: false`. Al inicio del fetch se resetea a `true` para que el botón "Recargar" funcione.
- **Avatar prev/next**: `seedList + seedIdx` en estado local de Profile. El store solo se actualiza al guardar.
- **Lobby like**: nombre clickeable en LobbyChat, POST a `/swipe`, toast con resultado.
- **Leave lobby**: botón en header de LobbyChatRoom, DELETE a `/lobbies/:id/join`.
- **Settings filtros**: timeslots deshabilitados si no están en el perfil del usuario. Juegos también.

---

## Qué Intenté y Falló

### GET /candidates 500 Internal Server Error

**Causa**: La query `GET_CANDIDATES` fue modificada externamente de forma incorrecta. Mezclaba `collect()` con expresiones no-agregadas en el mismo `WITH`, y usaba aliases de `RETURN` dentro de `ORDER BY CASE WHEN` lo cual es inestable en Neo4j.

**Primer intento**: Editar `GET_CANDIDATES` directamente → seguía fallando porque la estructura de la query era fundamentalmente incorrecta.

**Solución final**: Crear una query completamente nueva (`GET_CANDIDATES_WITH_PLAYHOURS`) con pasos `WITH` separados: (1) agregar juegos, (2) calcular ratingList con pattern comprehension, (3) calcular avgRating con `CASE/reduce`, (4) filtrar por PlayHours, (5) RETURN con ORDER BY.

### Loop infinito en SwipeDeck

**Causa**: El `useEffect` del SwipeDeck se dispara cuando `hasMore && candidates.length === 0 && !isFetching`. Cuando `fetchCandidates` fallaba, solo se reseteaba `isFetching: false` pero `hasMore` quedaba en `true`, causando un ciclo infinito de requests.

**Solución**: `hasMore: false` en el bloque catch de `fetchCandidates`.

---

## Plan para Después

Por orden de impacto:

1. **Arreglar SwipeCard.tsx** — Reescribir el archivo limpiamente con los emojis correctos (🌅 ☀️ 🌙). El archivo fue corrompido por una edición externa con encoding incorrecto.

2. **UI de PlayHours en Profile** — Agregar un selector de rango horario (startHour - endHour, ej: 20:00 - 02:00) en la sección de perfil. Los endpoints ya existen (`PUT /users/me/playhours`). El authStore ya tiene `playHours` y `setPlayHours`.

3. **UI de filtro PlayHours en Settings** — Agregar controles de hora inicio/fin en la pantalla de filtros. El swipeStore ya tiene `playHoursStart`/`playHoursEnd` y los pasa al backend.

4. **Verificar `GET_USER_BY_ID`** — La línea `[x IN collect(CASE WHEN x IS NOT NULL THEN x ELSE null END) | x WHERE x IS NOT NULL] AS games` es sospechosa. Testear que devuelva juegos correctamente en `/users/:id`.

5. **Limpiar código muerto** — Eliminar `GET_CANDIDATES` de `queries.ts` ya que nunca se llama (con permiso explícito del usuario, ya que es código existente).

---

## Restricción de Código

> **HEREDADA**: Está prohibido modificar, refactorizar o eliminar código que ya se encuentra funcional. Solo se puede agregar código nuevo. Si para que una nueva feature funcione es estrictamente necesario modificar código existente, detenerme, explicar por qué es necesario, y pedir permiso explícito antes de tocarlo.
