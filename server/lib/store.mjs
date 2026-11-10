// Tiny durable JSON store. One process owns the file; every change is written atomically
// (write to a temp file, fsync, rename), so a crash never leaves a half-written database.
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, openSync, fsyncSync, closeSync, appendFileSync } from 'node:fs';

export function openStore(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = `${dir}/accounts.json`;
  const empty = () => ({ v: 1, accounts: {}, byEmail: {}, sessions: {}, pilotCodes: {}, checkouts: {}, processed: [] });
  let db = empty();
  if (existsSync(file)) db = { ...empty(), ...JSON.parse(readFileSync(file, 'utf8')) };

  function save() {
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 });
    const fd = openSync(tmp, 'r'); fsyncSync(fd); closeSync(fd);
    renameSync(tmp, file);
  }
  // Append-only audit of money and access events. No passwords, no children's data.
  const audit = (ev) => appendFileSync(`${dir}/audit.jsonl`, JSON.stringify({ t: new Date().toISOString(), ...ev }) + '\n', { mode: 0o600 });
  return { db, save, audit };
}
