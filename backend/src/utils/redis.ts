import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableReadyCheck: false,
    });
    redisClient.on('error', (err) => {
      console.warn('[Redis] Error (non-fatal):', err.message);
    });
    await redisClient.ping();
    console.log('[Redis] Connected');
  } catch (err) {
    console.warn('[Redis] Not available, continuing without cache:', (err as Error).message);
    redisClient = null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  if (!redisClient) return null;
  try { return await redisClient.get(key); } catch { return null; }
}

export async function cacheSet(key: string, value: string, ttl = 3600): Promise<void> {
  if (!redisClient) return;
  try { await redisClient.set(key, value, 'EX', ttl); } catch {}
}

export async function cacheDel(key: string): Promise<void> {
  if (!redisClient) return;
  try { await redisClient.del(key); } catch {}
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) await redisClient.del(...keys);
  } catch {}
}

export default redisClient;
