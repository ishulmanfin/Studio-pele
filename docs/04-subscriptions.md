# YALLA KIDS: parent accounts and subscriptions

Built 2026-11-10. **Charging is OFF** (`BILLING_ENABLED=0`). Paid launch comes only after real-kid testing
and a free pilot; until then families get in with free pilot codes.

## What it does
| Piece | Where |
|---|---|
| Parent sign-up / login (email + password, scrypt, HttpOnly session cookie, 30 days) | `server/yalla-api.mjs` |
| Consent at sign-up: parent is 18+ and accepts terms + privacy (versions stored with the date) | same |
| Plans: free pilot (60 days by code), monthly 39 ₪, yearly 349 ₪ (incl. VAT) | `server/lib/plans.mjs` |
| Live talk only with an active plan AND the parent's live-talk switch (off by default) | `mikaSession()` |
| Caps per family: 3 min per call, 3 min per Israel day, 30 min per month; plus the global daily guard | same |
| Real minutes reconciled from ElevenLabs; a short call frees the rest of the day | `reconcile()` |
| Manage: plan status, minutes used, pilot code, choose plan, cancel in one tap, change password, delete account | `account/` |
| Parent gate on the parents' area (sum in words, number pad, 2 wrong = 60 s lock) | `account/account.js` |
| Payment provider interface + full mock; webhooks signed (HMAC), idempotent, audited | `server/lib/billing.mjs` |
| Admin CLI on a local-only port: pilot codes, accounts, grant, password reset | `server/admin.mjs` |
| Draft terms (cancellation rules) and privacy notice, marked for lawyer review | `account/terms.html`, `account/privacy.html` |

Data kept: parent email, password hash, consent dates, subscription, per-call minutes. Nothing about the child.
Card details never reach our server (hosted payment page).

Subscription states: `pilot` → `active` → (`past_due`, 3-day grace) → `canceled` (access to the end of the paid period).
Cancel stops renewals at once; the parent keeps what they paid for.

## Payment provider (recommendation)
Stripe does not onboard Israeli businesses (to my knowledge; verify), and app-store billing only applies to a store build.
For the web/PWA in Israel the recommendation is **Cardcom**: hosted payment page (no card data on our side, minimal PCI scope),
recurring charges ("הוראת קבע") with a stored token, automatic Hebrew tax invoices/receipts, Bit/Apple Pay/Google Pay
support, webhook (IPN) on every charge. Alternatives with the same shape: PayPlus, Grow (Meshulam).
Prices are per contract: get quotes from two before signing. **Opening an account is the owner's step, and nothing is
paid without the owner's written OK.**

Adding the real provider = one entry in `server/lib/billing.mjs` (`createCheckout`, `cancel`, `parseWebhook`) built
against the provider's sandbox; the rest of the system does not change.

## Turning things on (in order)
1. Deploy the API (`server/`) to `/opt/yalla-api/`, env from `server/yalla-api.env.example`, service file, Caddy snippet.
   Ship `account/` into the web root. Create pilot codes: `node server/admin.mjs pilot-codes 20`.
2. Pilot: give each family a code. Live talk works for them within the caps. No card asked.
3. Paid launch (owner's go): provider account + sandbox, adapter + test against the sandbox, lawyer review of the
   terms and privacy texts, fill in business details, then `BILLING_PROVIDER=<provider>`, `BILLING_ENABLED=1`.

## The kid app (live-talk client) needs two small changes
- `GET /api/mika-session` now answers `401 login_required`, `402 subscription_required`, `403 parent_consent_required`,
  `429 daily limit | monthly limit`. Show a friendly "ask a parent" screen for the first three (link to `account/`
  behind the parent gate) and Mika's "let's talk tomorrow" for the 429s.
- The success answer has `maxSec` (180 or less). End the call by then (today the client allows 8 min). Also set the
  ElevenLabs agent's max conversation duration to 180 s as the hard stop.

## Not built yet (on purpose)
- Email (verification, password-reset links, renewal notices): needs a mail provider; until then the operator resets a
  password with `admin.mjs reset-password`. Before paid launch, add renewal reminders for the yearly plan.
- App-store billing (only if a store build happens; Apple requires In-App Purchase there).

## Tests
`node --test server/test/` : 11 tests (sign-up rules, login + brute-force lockout, CSRF, live-talk gating and caps,
reconciliation, billing closed by default, mock checkout → pay → cancel, signed/idempotent webhooks with grace period,
account deletion, password change + admin reset, legacy fallback).
