import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MessageType } from '../types';

const QUEUE_KEY = 'vora_message_queue';

export type QueuedMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  mediaUrl?: string | null;
  localUri?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  replyToId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  attempts: number;
};

async function readQueue(): Promise<QueuedMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedMessage[];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedMessage[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueMessage(
  item: Omit<QueuedMessage, 'id' | 'createdAt' | 'attempts'>,
): Promise<QueuedMessage> {
  const queue = await readQueue();
  const entry: QueuedMessage = {
    ...item,
    id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  queue.push(entry);
  await writeQueue(queue);
  return entry;
}

export async function getQueuedMessages(conversationId?: string): Promise<QueuedMessage[]> {
  const queue = await readQueue();
  if (!conversationId) return queue;
  return queue.filter((m) => m.conversationId === conversationId);
}

export async function removeQueuedMessage(id: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((m) => m.id !== id));
}

export async function bumpQueueAttempt(id: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(
    queue.map((m) => (m.id === id ? { ...m, attempts: m.attempts + 1 } : m)),
  );
}

export async function resetQueueAttempts(id: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.map((m) => (m.id === id ? { ...m, attempts: 0 } : m)));
}

export async function getAllQueuedMessages(): Promise<QueuedMessage[]> {
  return readQueue();
}
