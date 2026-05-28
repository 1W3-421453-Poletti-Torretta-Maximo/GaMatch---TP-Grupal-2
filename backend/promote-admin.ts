import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

async function promoteAdmin() {
  const driver = neo4j.driver(
    process.env.NEO4J_URI ?? 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USER ?? 'neo4j',
      process.env.NEO4J_PASSWORD ?? 'gamatch_dev_password'
    )
  );

  const session = driver.session();
  try {
    // First, get the user
    const userResult = await session.run(
      'MATCH (u:User {username: $username}) RETURN u',
      { username: 'lucasqj21' }
    );

    if (userResult.records.length === 0) {
      console.log('❌ Usuario "lucasqj21" no encontrado');
      return;
    }

    const user = userResult.records[0].get('u').properties;
    console.log(`Encontrado usuario: ${user.username} (${user.id})`);

    // Promote to admin
    const updateResult = await session.run(
      'MATCH (u:User {id: $userId}) SET u.role = "admin" RETURN u',
      { userId: user.id }
    );

    if (updateResult.records.length > 0) {
      const updatedUser = updateResult.records[0].get('u').properties;
      console.log(`✅ ${updatedUser.username} ha sido promovido a admin`);
      console.log(`   Rol: ${updatedUser.role}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

promoteAdmin();
