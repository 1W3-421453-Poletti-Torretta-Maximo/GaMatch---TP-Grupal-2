import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client: MongoClient | null = null;
let db: Db | null = null;
let missing = false;

export async function connectToMongo(): Promise<Db | null> {
  if (db) return db;
  if (!uri) {
    console.warn('[mongo] MONGODB_URI not set — chat features will be unavailable');
    missing = true;
    return null;
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  console.log('[mongo] connected');
  return db;
}

export function getDb(): Db {
  if (!db) {
    if (missing) throw new Error('MONGODB_URI not configured');
    throw new Error('MongoDB not connected. Call connectToMongo() first.');
  }
  return db;
}
