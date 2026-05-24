# GaMatch 🎮

App estilo Tinder para encontrar compañeros de equipo en videojuegos. Hace "match" con otros jugadores según juego, rol y rango.

## Stack

- **Frontend:** React + Vite + TypeScript + TailwindCSS (paleta violeta/blanca)
- **Backend:** Node.js + Fastify + TypeScript
- **DB:** Neo4j AuraDB (grafo de relaciones)
- **Cache / Sesiones:** Redis (Upstash)
- **Auth:** Discord OAuth2
- **Real-time:** Socket.io
- **Deploy:** Railway

## Setup local

### 1. Requisitos

- Node.js 20+
- Docker y Docker Compose
- Cuenta de Discord Developer ([discord.com/developers](https://discord.com/developers))

### 2. Clonar y configurar

```bash
git clone <url>
cd gamatch

# Copiar env del backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales de Discord y JWT_SECRET

# Copiar env del frontend
cp frontend/.env.example frontend/.env
```

### 3. Levantar bases de datos

```bash
docker-compose up -d
# Neo4j en http://localhost:7474 (user: neo4j / pass: gamatch_dev_password)
# Redis en localhost:6379
```

### 4. Instalar dependencias y seedear

```bash
npm install

# Seedear juegos, roles y rangos en Neo4j
npm run seed --workspace=backend
```

### 5. Correr en desarrollo

```bash
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

## Discord OAuth Setup

1. Crear app en [discord.com/developers](https://discord.com/developers/applications)
2. En OAuth2 → Redirects, agregar: `http://localhost:3001/auth/discord/callback`
3. Copiar Client ID y Client Secret al `backend/.env`

## Deploy en Railway

1. Crear proyecto en [railway.app](https://railway.app)
2. Agregar dos servicios: `gamatch-backend` y `gamatch-frontend`
3. Configurar variables de entorno en Railway (ver `backend/.env.example`)
4. Agregar `RAILWAY_TOKEN` como secret en GitHub
5. Push a `main` — GitHub Actions hace el deploy automáticamente

## Estructura

```
gamatch/
├── frontend/          # React + Vite
├── backend/           # Node.js + Fastify
├── docker-compose.yml # Neo4j + Redis local
└── .github/workflows/ # CI/CD
```

## Catálogo de juegos

League of Legends · Valorant · CS2 · Overwatch 2 · Fortnite · Apex Legends · Rocket League · EA FC · Fall Guys · Dota 2 · Rainbow Six Siege · Minecraft
