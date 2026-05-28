# Instrucciones para Asignar Admin a lucasqj21

## Opción 1: Usar el nuevo endpoint de Promote Admin (RECOMENDADO)

Una vez que el backend esté corriendo, puedes hacer una solicitud POST:

```bash
curl -X POST http://localhost:3000/admin/promote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_ADMIN_JWT_TOKEN>" \
  -d '{"username": "lucasqj21"}'
```

O desde el frontend:
1. Inicia sesión como admin
2. Ve al Panel Admin
3. En la sección "Promover Usuario a Admin"
4. Ingresa "lucasqj21"
5. Haz clic en "Promover"

## Opción 2: Query Cypher Manual (via Neo4j Browser)

Si accedes a Neo4j Browser directamente:

```cypher
MATCH (u:User {username: 'lucasqj21'})
SET u.role = 'admin'
RETURN u
```

## Opción 3: Ejecutar el script (cuando la BD esté disponible)

```bash
cd backend
npx tsx promote-admin.ts
```

---

## Nuevas Funcionalidades Implementadas

✅ **Dashboards de Control (en tiempo real)**
- 👑 Usuarios Mejor Valorados (top 5 con rating)
- 🎮 Usuarios con Más Matches (top 5)
- 🏛️ Lobbies con Más Participantes (top 5)
- 🕐 Horarios Más Buscados (todos con contador de usuarios)
- 📊 KPIs: Total usuarios, matches, ratings promedio

✅ **Nuevo Endpoint**
- `GET /admin/dashboard` - Retorna todos los dashboards en tiempo real
- `POST /admin/promote` - Promueve un usuario a admin por username

✅ **Protección**
- Solo users con `role == 'admin'` pueden acceder a estos endpoints
- La navegación automática redirecciona a home si el user no es admin

✅ **Frontend Actualizado**
- Panel Admin completamente rediseñado
- Interfaz intuitiva con secciones coloreadas
- Botón para promover admin con validación
- Auto-refresh cada 30 segundos para datos en tiempo real
