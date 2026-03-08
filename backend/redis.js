/**
 * Optional Redis client. If REDIS_URL is set, returns a connected client; otherwise null.
 * Used for session store and rate limiting when available.
 */

let client = null;

export async function getRedisClient() {
    if (client) return client;
    const url = process.env.REDIS_URL;
    if (!url || url.trim() === '') return null;
    try {
        const { createClient } = await import('redis');
        const c = createClient({ url });
        c.on('error', (err) => console.error('Redis client error:', err.message));
        await c.connect();
        client = c;
        return client;
    } catch (err) {
        console.error('Redis connection failed:', err.message);
        return null;
    }
}

export function hasRedis() {
    return client != null;
}
