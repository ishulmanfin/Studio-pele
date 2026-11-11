// "Reverse" WhatsApp sign-in: the parent SENDS us a short code from their own WhatsApp (a wa.me link
// with the text ready), and Meta's webhook tells us which phone number sent it. Messages a user sends
// to a business are free, and so is our short reply inside the 24-hour service window, so sign-in
// costs nothing per family. We never send the first message.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newWaCode = () => 'YK-' + [...randomBytes(8)].map((b) => ABC[b % ABC.length]).join('');
export const findWaCode = (text) => (String(text || '').toUpperCase().match(/YK-[A-Z0-9]{8}/) || [])[0] || null;

// Meta signs each webhook body: X-Hub-Signature-256: sha256=<hex HMAC of the raw body with the app secret>.
export function waSignatureOk(appSecret, raw, header) {
  if (!appSecret || typeof header !== 'string' || !header.startsWith('sha256=')) return false;
  const want = Buffer.from(createHmac('sha256', appSecret).update(raw).digest('hex')); const got = Buffer.from(header.slice(7));
  return want.length === got.length && timingSafeEqual(want, got);
}

// Text messages in a webhook payload -> [{ from: '9725...', text }]
export function inboundTexts(body) {
  const out = [];
  for (const e of body?.entry || []) for (const c of e?.changes || []) for (const m of c?.value?.messages || [])
    if (m?.type === 'text' && m.from) out.push({ from: String(m.from), text: String(m.text?.body || '') });
  return out;
}

const graph = (env) => env.WA_GRAPH_BASE || 'https://graph.facebook.com/v21.0';

// Self-check for the owner: does the token see the phone number? Returns { ok, name?, number?, error? }.
export async function waPing(env) {
  if (!env.WA_TOKEN || !env.WA_PHONE_NUMBER_ID) return { ok: false, error: 'WA_TOKEN / WA_PHONE_NUMBER_ID not set (only needed for replies)' };
  try {
    const r = await fetch(`${graph(env)}/${encodeURIComponent(env.WA_PHONE_NUMBER_ID)}?fields=display_phone_number,verified_name,quality_rating`, {
      headers: { authorization: `Bearer ${env.WA_TOKEN}` }, signal: AbortSignal.timeout(8000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: j?.error?.message || `HTTP ${r.status}` };
    return { ok: true, name: j.verified_name, number: j.display_phone_number, quality: j.quality_rating };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

// A free-form reply (allowed and free within 24 h of the parent's message). Best effort.
export async function waReply(env, toDigits, text) {
  if (!env.WA_TOKEN || !env.WA_PHONE_NUMBER_ID) return false;
  try {
    const r = await fetch(`${graph(env)}/${encodeURIComponent(env.WA_PHONE_NUMBER_ID)}/messages`, {
      method: 'POST', headers: { authorization: `Bearer ${env.WA_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: toDigits, type: 'text', text: { body: text } }), signal: AbortSignal.timeout(5000) });
    return r.ok;
  } catch { return false; }
}

export function waBook({ ttlMs = 10 * 60e3 } = {}) {
  const byCode = new Map();
  return {
    open(purpose, aid = null) {
      const now = Date.now(); for (const [k, v] of byCode) if (v.exp < now) byCode.delete(k);
      if (byCode.size > 5000) return null;
      const code = newWaCode(), secret = randomBytes(18).toString('base64url');
      byCode.set(code, { secret, purpose, aid, exp: now + ttlMs, phone: null });
      return { code, secret };
    },
    get: (code) => { const p = byCode.get(code); if (p && p.exp < Date.now()) { byCode.delete(code); return null; } return p || null; },
    drop: (code) => byCode.delete(code),
  };
}
