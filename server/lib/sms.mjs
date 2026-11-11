// One-time SMS codes for parent sign-in. Codes live only in memory (5 minutes), stored as a hash.
// Providers sit behind one function: send(phoneE164, text). 'mock' sends nothing (tests, dev, pilot
// without SMS); a real Israeli SMS gateway is one more entry once the owner opens an account.
import { randomInt } from 'node:crypto';
import { sha256 } from './auth.mjs';

// Israeli mobile only for now: 050-1234567, 0501234567, +972 50 123 4567, 972501234567 -> +972501234567
export function normalizePhone(s) {
  let d = String(s || '').replace(/[\s\-().]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('00')) d = d.slice(2);
  if (/^05\d{8}$/.test(d)) d = '972' + d.slice(1);
  return /^9725\d{8}$/.test(d) ? `+${d}` : null;
}
export const maskPhone = (p) => (p ? `0${p.slice(4, 6)}-***-${p.slice(-4)}` : '');

const providers = {
  mock: () => ({ name: 'mock', async send() {} }),
};
export function getSms(env) {
  const make = providers[env.SMS_PROVIDER || 'mock'];
  if (!make) throw new Error(`unknown SMS_PROVIDER ${env.SMS_PROVIDER}`);
  return make(env);
}

export function codeBook({ ttlMs = 5 * 60e3, maxTries = 5, resendMs = 60e3 } = {}) {
  const codes = new Map();
  return {
    // Returns { code } or { wait: seconds } when asked again too soon.
    issue(key) {
      const now = Date.now(); const old = codes.get(key);
      if (old && now - old.sentAt < resendMs) return { wait: Math.ceil((resendMs - (now - old.sentAt)) / 1000) };
      const code = String(randomInt(0, 1e6)).padStart(6, '0');
      codes.set(key, { hash: sha256(`${key}:${code}`), exp: now + ttlMs, tries: 0, sentAt: now });
      for (const [k, v] of codes) if (v.exp < now) codes.delete(k);
      return { code };
    },
    // 'ok' | 'bad' | 'expired'. A correct code is consumed only when consume=true.
    check(key, code, consume = true) {
      const c = codes.get(key);
      if (!c || c.exp < Date.now() || c.tries >= maxTries) { codes.delete(key); return 'expired'; }
      if (sha256(`${key}:${String(code || '').replace(/\D/g, '')}`) !== c.hash) { c.tries++; return 'bad'; }
      if (consume) codes.delete(key);
      return 'ok';
    },
  };
}
