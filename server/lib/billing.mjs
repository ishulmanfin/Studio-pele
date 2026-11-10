// Payment providers behind one small interface. Card data never touches our server: the parent pays
// on the provider's hosted page, and the provider tells us the result through a signed webhook.
//
//   createCheckout({ ref, plan, email, returnUrl, notifyUrl }) -> { url }
//   cancel({ providerRef })                                    -> stop future renewals
//   parseWebhook({ headers, raw })                             -> { id, type, ref?, providerRef?, plan?, periodEnd? } | null
//        type: 'paid' (first payment or renewal), 'failed' (renewal failed), 'canceled' (stopped at the provider)
//
// 'mock' is a full stand-in for tests and the free pilot. A real Israeli provider (recommended: Cardcom,
// see docs/04-subscriptions.md) is added as one more entry once the owner opens an account and we have
// sandbox credentials. Until then BILLING_ENABLED stays 0 and nobody can be charged.
import { createHmac, timingSafeEqual } from 'node:crypto';

export function hmac(secret, raw) { return createHmac('sha256', secret).update(raw).digest('hex'); }
function sigOk(secret, raw, sig) {
  if (!secret || typeof sig !== 'string') return false;
  const a = Buffer.from(hmac(secret, raw)); const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

const providers = {
  mock: (env) => ({
    name: 'mock',
    async createCheckout({ ref }) { return { url: `${env.BASE_PATH || ''}/api/billing/mock/pay?ref=${encodeURIComponent(ref)}` }; },
    async cancel() {},
    parseWebhook({ headers, raw }) {
      if (!sigOk(env.BILLING_WEBHOOK_SECRET, raw, headers['x-signature'])) return null;
      const e = JSON.parse(raw);
      return { id: String(e.id), type: e.type, ref: e.ref, providerRef: e.providerRef, plan: e.plan, periodEnd: e.periodEnd };
    },
  }),
};

export function getProvider(env) {
  const make = providers[env.BILLING_PROVIDER || 'mock'];
  if (!make) throw new Error(`unknown BILLING_PROVIDER ${env.BILLING_PROVIDER}`);
  return make(env);
}
