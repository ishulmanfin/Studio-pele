# YALLA KIDS: support and customer service

Built 2026-11-11. Free to run: everything lives on the existing API server. No paid service is used.

| Piece | Where |
|---|---|
| Support engine: tickets, technical diagnostics, proactive care, gentle cancel, status, owner API | `server/lib/support.mjs` (loaded by the hook in `server/yalla-api.mjs`) |
| Parents' help center: parent gate, FAQ search, one-tap device check-up with quick fixes, my tickets, rating, live status | `help/` |
| Error capture for the kid app (last 20 error messages, this tab only) | `help/diag-capture.js` |
| Cancel helper for the parents' area: one-tap reason, then offers | `help/cancel-flow.js` (`showCancelFlow(base)`) |
| Owner console "חדר הבקרה": KPIs, inbox with response-time colours, conversation, internal notes, family and device cards, quick replies, actions, incidents | `support/console/` |
| Tests | `node --test server/test/support.test.mjs` (7) |

## Opening the owner console
The admin port is local-only. From your computer: `ssh -L 8091:127.0.0.1:8091 <server>`, then open
`http://localhost:8091/support/console` and paste the `ADMIN_TOKEN`. The page itself holds no data.

## Privacy
- Kept: the parent's ticket messages (until 180 days after solved), a technical device snapshot (30 days),
  ratings, cancel reasons (12 months, unlinked from the account when it is deleted). File: `support.json` in `DATA_DIR`, mode 600.
- Ticket text is scrubbed of phone numbers, emails, ID numbers and card numbers before it is stored; the form asks the parent not to write the child's name.
- The device snapshot is a whitelist of technical fields (OS, browser, screen, network speed, microphone permission, error messages without URLs). Nothing about the child.
- Deleting the account deletes its tickets and snapshots.

## Proactive care
The API calls `care(aid, kind)` when it sees a problem first: `live_talk_failed` (also adds 3 bonus minutes for today),
`payment_failed`, and `app_errors` (5+ errors in one snapshot). At most one of each kind a week, and never while a ticket on the same topic is open.
The parent gets a short SMS pointing to parents' area > help (only when the SMS hook is wired; it uses the SMS daily cap).

## Owner actions
`grant_days` and `bonus_call` work today. `pause` and `refund_request` answer "not connected yet" until the owner chooses them
and the subscriptions side adds the hooks.

## Next (approved in principle, needs the owner's OK on cost)
Maya for parents in text: answers from this FAQ and acts through the same API (status, minutes, open ticket). ~2-10 agorot per conversation; needs an API key.
