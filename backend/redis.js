/**
 * Optional Redis client. If REDIS_URL is set, returns a connected client; otherwise null.
 * Used for session store and rate limiting when available.
 */

let client = null;

function normalizeRedisUrl(url) {
    if (!url || url.trim() === '') return url;
    try {
        const u = new URL(url);
        if (u.password) return url;
        if (u.username && !u.username.includes(':')) {
            const pass = encodeURIComponent(u.username);
            const host = u.hostname || u.host;
            const port = u.port || '6379';
            const db = (u.pathname || '/0').replace(/^\//, '') || '0';
            return `redis://:${pass}@${host}:${port}/${db}`;
        }
        return url;
    } catch (_) {
        return url;
    }
}

function buildRedisUrl() {
    const raw = process.env.REDIS_URL;
    if (!raw || raw.trim() === '') return null;
    const s = raw.trim();
    if (s.includes('://') || s.includes('@')) {
        return normalizeRedisUrl(s);
    }
    return `redis://${s}:6379/0`;
}

export async function getRedisClient() {
    if (client) return client;
    const url = buildRedisUrl();
    if (!url) return null;
    try {
        const { createClient } = await import('redis');
        const c = createClient({ url });
        const { default: logger } = await import('./logger.js');
        c.on('error', (err) => logger.error('Redis client error', { error: String(err?.message || err) }));
        await c.connect();
        client = c;
        return client;
    } catch (err) {
        const { default: logger } = await import('./logger.js');
        logger.error('Redis connection failed', { error: String(err?.message || err) });
        return null;
    }
}

export function hasRedis() {
    return client != null;
}
