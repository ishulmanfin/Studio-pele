// Payment providers behind one small interface. Card data never touches our server: the parent pays
// on the provider's hosted page, and the provider tells us the result through a signed webhook.
//
//   createCheckout({ ref, plan, phone, fullName, returnUrl, cancelUrl, notifyUrl }) -> { url }
//   cancel(sub)                                                -> stop future renewals
//   parseWebhook({ headers, raw, query })  (may be async)     -> { id, type, ref?, providerRef?, providerMeta?, plan?, periodEnd? } | null
//        type: 'paid' (first payment or renewal), 'failed' (renewal failed), 'canceled' (stopped at the provider)
//
// 'mock' is a full stand-in for tests and the free pilot. 'grow' is Grow (formerly Meshulam), Israel:
// hosted payment page, monthly standing order (הוראת קבע), automatic invoices. Until the owner adds the
// Grow keys and sets BILLING_ENABLED=1, nobody can be charged.
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

// ---------- Grow (developers.grow.business, "Light server 1.0") ----------
// Grow callbacks carry no signature, so authenticity comes from three checks:
//  1. our notify URL has a secret key (?k=GROW_WEBHOOK_KEY) that only Grow knows;
//  2. the first payment must match the processId we got when we created that checkout;
//  3. we confirm each payment back to Grow with approveTransaction (server to server).
const GROW_LIVE = 'https://secure.meshulam.co.il/api/light/server/1.0';
const GROW_SANDBOX = 'https://sandbox.meshulam.co.il/api/light/server/1.0';
// "data[customFields][cField1]=x" form fields -> nested object
export function parseForm(raw) {
  const out = {};
  for (const [k, v] of new URLSearchParams(raw)) {
    const parts = k.replace(/\]/g, '').split('['); let o = out;
    parts.forEach((p, i) => { if (i === parts.length - 1) o[p] = v; else o = (o[p] = typeof o[p] === 'object' ? o[p] : {}); });
  }
  return out;
}
const localPhone = (e164) => (e164 && e164.startsWith('+972') ? '0' + e164.slice(4) : e164 || '');
function safeEq(a, b) { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return x.length === y.length && x.length > 0 && timingSafeEqual(x, y); }

function grow(env, hooks = {}) {
  const base = env.GROW_API_BASE || (env.GROW_SANDBOX === '1' ? GROW_SANDBOX : GROW_LIVE);
  const pageFor = (plan) => (plan.months === 1 ? env.GROW_PAGE_CODE_RECURRING : env.GROW_PAGE_CODE_ONETIME);
  async function call(method, fields) {
    const body = new URLSearchParams(); for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) body.append(k, String(v));
    const r = await fetch(`${base}/${method}`, { method: 'POST', body, signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || String(j.status) !== '1') throw new Error(`grow ${method}: ${j?.err?.message || r.status}`);
    return j.data;
  }
  return {
    name: 'grow',
    needsName: true,
    async createCheckout({ ref, plan, phone, fullName, returnUrl, cancelUrl, notifyUrl }) {
      const pageCode = pageFor(plan); if (!pageCode || !env.GROW_USER_ID) throw new Error('grow not configured');
      const d = await call('createPaymentProcess', {
        pageCode, userId: env.GROW_USER_ID, sum: (plan.priceAgorot / 100).toFixed(2),
        description: `YALLA KIDS · ${plan.name}`, successUrl: returnUrl, cancelUrl: cancelUrl || returnUrl,
        notifyUrl: `${notifyUrl}?k=${encodeURIComponent(env.GROW_WEBHOOK_KEY || '')}`,
        'pageField[fullName]': fullName, 'pageField[phone]': localPhone(phone), cField1: ref, cField2: plan.id,
      });
      hooks.onCheckout?.(ref, { processId: String(d.processId), processToken: String(d.processToken) });
      return { url: d.url };
    },
    async cancel(sub) {
      const m = sub.providerMeta || {};
      if (sub.plan !== 'monthly' || !m.transactionToken) return;   // the yearly plan is one payment: nothing renews, nothing to stop
      await call('updateDirectDebit', { userId: env.GROW_USER_ID, transactionToken: m.transactionToken, transactionId: m.transactionId, asmachta: m.asmachta, changeStatus: 2 });
    },
    async parseWebhook({ raw, query }) {
      if (!env.GROW_WEBHOOK_KEY || !safeEq(query?.get('k'), env.GROW_WEBHOOK_KEY)) return null;
      const f = parseForm(raw); const d = f.data || {};
      const ref = d.customFields?.cField1 || d.cField1 || null;
      const ok = String(f.status) === '1' && (d.statusCode === undefined || String(d.statusCode) === '2' || String(d.status).includes('שולם') || String(d.status) === '1');
      const known = ref && hooks.checkoutProcess?.(ref);   // null once the first payment landed, so renewals pass
      if (known && known.processId && d.processId && String(d.processId) !== known.processId) return null;   // not the checkout we opened
      if (ok && d.transactionId) {
        const fields = {}; for (const k of ['transactionId', 'transactionToken', 'transactionTypeId', 'paymentType', 'sum', 'firstPaymentSum', 'periodicalPaymentSum', 'paymentsNum', 'allPaymentsNum', 'paymentDate', 'asmachta', 'description', 'fullName', 'payerPhone', 'payerEmail', 'cardSuffix', 'cardType', 'cardTypeCode', 'cardBrand', 'cardBrandCode', 'cardExp', 'processId', 'processToken']) fields[k] = d[k];
        try { await call('approveTransaction', { pageCode: d.pageCode || env.GROW_PAGE_CODE_RECURRING, ...fields }); } catch {}   // Grow processes the payment either way
      }
      const debit = d.directDebitId || d.recurringDebitId || null;
      return {
        id: `grow_${d.transactionId || d.asmachta || d.processId}_${ok ? 'ok' : 'fail'}`,
        type: ok ? 'paid' : 'failed', ref, plan: d.customFields?.cField2 || d.cField2 || undefined,
        providerRef: debit ? `grow_debit_${debit}` : d.transactionToken ? `grow_tok_${d.transactionToken}` : undefined,
        providerMeta: d.transactionToken ? { transactionToken: d.transactionToken, transactionId: d.transactionId, asmachta: d.asmachta, directDebitId: debit } : undefined,
      };
    },
  };
}
providers.grow = grow;

export function getProvider(env, hooks) {
  const make = providers[env.BILLING_PROVIDER || 'mock'];
  if (!make) throw new Error(`unknown BILLING_PROVIDER ${env.BILLING_PROVIDER}`);
  return make(env, hooks);
}
