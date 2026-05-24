import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver;

export async function initNeo4j(): Promise<void> {
  driver = neo4j.driver(
    process.env.NEO4J_URI ?? 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USER ?? 'neo4j',
      process.env.NEO4J_PASSWORD ?? 'gamatch_dev_password'
    )
  );
  await driver.verifyConnectivity();
  console.log('Neo4j connected');
}

export function getDriver(): Driver {
  if (!driver) throw new Error('Neo4j driver not initialized — call initNeo4j() first');
  return driver;
}

export function getSession(): Session {
  return getDriver().session();
}

export async function closeNeo4j(): Promise<void> {
  await driver?.close();
}
