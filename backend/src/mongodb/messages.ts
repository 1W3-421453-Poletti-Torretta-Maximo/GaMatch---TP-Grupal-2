import { Db } from 'mongodb';

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderUsername: string;
  senderName: string;
  senderAvatar: string;
  channelId: string;
  channelType: 'direct' | 'lobby';
  createdAt: Date;
}

const COLLECTION = 'messages';

export async function ensureMessageIndexes(db: Db): Promise<void> {
  await db.collection(COLLECTION).createIndex({ channelId: 1, createdAt: 1 });
}

export async function saveMessage(db: Db, msg: ChatMessage): Promise<void> {
  await db.collection(COLLECTION).insertOne(msg);
}

export async function getMessages(
  db: Db,
  channelId: string,
  channelType: 'direct' | 'lobby',
  limit: number,
): Promise<ChatMessage[]> {
  const docs = await db
    .collection<ChatMessage>(COLLECTION)
    .find({ channelId, channelType })
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray();
  return docs;
}
