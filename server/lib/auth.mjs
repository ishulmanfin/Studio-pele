// Passwords (scrypt), session tokens (random, stored only as a SHA-256 hash) and a small rate limiter.
import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';

const N = 16384, KEYLEN = 64;
export function hashPassword(pw) {
  const salt = randomBytes(16);
  return `s1:${salt.toString('base64')}:${scryptSync(pw, salt, KEYLEN, { N }).toString('base64')}`;
}
export function checkPassword(pw, stored) {
  const [v, s, h] = String(stored || '').split(':');
  if (v !== 's1' || !s || !h) { scryptSync(pw, 'pad', KEYLEN, { N }); return false; } // same timing for unknown users
  const want = Buffer.from(h, 'base64');
  const got = scryptSync(pw, Buffer.from(s, 'base64'), KEYLEN, { N });
  return got.length === want.length && timingSafeEqual(got, want);
}
// A real-looking hash for unknown emails, so login timing does not reveal who has an account.
export const DUMMY_HASH = hashPassword(randomBytes(12).toString('hex'));

export const newToken = () => randomBytes(32).toString('base64url');
export const sha256 = (s) => createHash('sha256').update(s).digest('hex');
export const newId = (prefix) => `${prefix}_${randomBytes(9).toString('base64url')}`;

// Sliding-window limiter, in memory (resets on restart, which is fine for brute-force protection).
export function limiter(max, windowMs) {
  const hits = new Map();
  return (key) => {
    const now = Date.now(); const arr = (hits.get(key) || []).filter((t) => t > now - windowMs);
    if (arr.length >= max) { hits.set(key, arr); return false; }
    arr.push(now); hits.set(key, arr);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => t > now - windowMs)) hits.delete(k);
    return true;
  };
}

export const validEmail = (e) => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
export const validPassword = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 200;
