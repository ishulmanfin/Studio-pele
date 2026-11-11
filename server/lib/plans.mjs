// Plans and entitlement rules. Prices include VAT (ILS, agorot). Live-talk caps follow the money model:
// one 3-minute call a day, 30 minutes a month, ~$3.30 worst case per child.
export const LIVE = { sessionMin: 3, dayMin: 3, monthMin: 30 };

export const PLANS = {
  pilot: { id: 'pilot', name: 'פיילוט חינמי', priceAgorot: 0, days: 60, purchasable: false, live: LIVE },
  monthly: { id: 'monthly', name: 'מנוי חודשי', priceAgorot: 3900, days: 30, months: 1, purchasable: true, live: LIVE },
  yearly: { id: 'yearly', name: 'מנוי שנתי', priceAgorot: 34900, days: 365, months: 12, purchasable: true, live: LIVE },
};

// Days a failed renewal keeps access while the provider retries the card.
export const PAST_DUE_GRACE_DAYS = 3;

// Is this subscription allowed to use the paid features right now?
export function entitled(sub, now = Date.now()) {
  if (!sub || !sub.periodEnd) return false;
  const end = Date.parse(sub.periodEnd);
  if (sub.status === 'past_due') return now < end + PAST_DUE_GRACE_DAYS * 864e5;
  // 'canceled' still runs to the end of the period the parent paid for.
  return ['pilot', 'active', 'canceled'].includes(sub.status) && now < end;
}

export function publicPlans() {
  return Object.values(PLANS).filter((p) => p.purchasable).map(({ id, name, priceAgorot, months }) => ({ id, name, priceAgorot, months }));
}

export const addDays = (from, days) => new Date(Math.max(Date.now(), Date.parse(from || 0) || 0) + days * 864e5).toISOString();
