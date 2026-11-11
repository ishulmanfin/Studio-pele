#!/usr/bin/env node
// Admin commands for the server operator. Talks to the API's local admin port; run ON the server.
//   node admin.mjs pilot-codes 20 [days] [note]   -> new single-use free-pilot codes
//   node admin.mjs accounts                       -> accounts, plans, live-talk minutes
//   node admin.mjs grant <phone|email> <pilot|monthly|yearly> [days]
//   node admin.mjs reset-password <email>         -> prints a temporary password
//   node admin.mjs selfcheck [ping]                -> what is configured / missing for Grow, WhatsApp, SMS
// Reads ADMIN_TOKEN and ADMIN_PORT from the environment (source /etc/yalla-api.env first).
const [cmd, a, b, c] = process.argv.slice(2);
const port = process.env.ADMIN_PORT || 8091, token = process.env.ADMIN_TOKEN;
if (!token) { console.error('ADMIN_TOKEN is not set'); process.exit(1); }
const call = async (path, body) => {
  const r = await fetch(`http://127.0.0.1:${port}${path}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
  const j = await r.json(); if (!r.ok) { console.error(j); process.exit(1); } return j;
};
const out = (x) => console.log(JSON.stringify(x, null, 2));
if (cmd === 'pilot-codes') out(await call('/pilot-codes', { count: +a || 1, days: +b || undefined, note: c }));
else if (cmd === 'accounts') out(await call('/accounts'));
else if (cmd === 'grant') out(await call('/grant', { email: a, phone: a, plan: b, days: +c || undefined }));
else if (cmd === 'selfcheck') out(await call(`/selfcheck${a === 'ping' ? '?ping=1' : ''}`));
else if (cmd === 'reset-password') out(await call('/reset-password', { email: a }));
else { console.log('commands: pilot-codes N [days] [note] | accounts | grant <email> <plan> [days] | reset-password <email> | selfcheck [ping]'); process.exit(1); }
