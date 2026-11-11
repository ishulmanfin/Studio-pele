// YALLA KIDS gentle cancel helper. The parents' area owns the real cancel; this only asks why, in one tap,
// and shows what the server offers instead (a pause, or help). Cancelling is always one tap away, on every step.
//
//   import { showCancelFlow } from '../help/cancel-flow.js';
//   if (await showCancelFlow(BASE) === 'cancel') { ...call /api/billing/cancel as today... }
//
// Resolves 'cancel' when the parent still wants to cancel, 'kept' when they paused, asked for help, or closed the sheet.
const REASONS = [['price', 'יקר לי'], ['not_using', 'לא משתמשים'], ['child_bored', 'הילד השתעמם'], ['tech', 'בעיה טכנית'], ['other', 'אחר']];

const CSS = `
.ykc { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 20px; direction: rtl;
  background: rgba(12,5,38,.72); font: 400 17px/1.55 'Fredoka', 'Arial Hebrew', 'Segoe UI', system-ui, -apple-system, Arial, sans-serif; animation: ykc-in .25s ease both; }
.ykc * { box-sizing: border-box; }
.ykc-card { width: min(100%, 500px); max-height: calc(100dvh - 40px); overflow: auto; padding: 32px 30px 24px; border-radius: 34px; color: #2A1A5E; background: #FFFBF5;
  box-shadow: inset 0 1px 0 #fff, 0 30px 70px rgba(8,3,32,.6); animation: ykc-up .45s cubic-bezier(.23,1,.32,1) both; outline: none; }
.ykc h2 { margin: 0 0 6px; font-size: 1.6rem; font-weight: 700; line-height: 1.2; color: #2A1A5E; }
.ykc p { margin: 0 0 18px; color: #5A4F86; }
.ykc-list { display: grid; gap: 10px; margin: 0 0 20px; }
.ykc button { font: inherit; cursor: pointer; border: 0; min-height: 54px; border-radius: 18px; touch-action: manipulation; transition: transform .12s ease, background-color .15s ease, box-shadow .15s ease; }
.ykc button:active:not(:disabled) { transform: scale(.98); }
.ykc button:disabled { opacity: .55; cursor: default; }
.ykc button:focus-visible { outline: 3px solid #2A1A5E; outline-offset: 3px; }
.ykc-opt { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 12px 20px; text-align: start; font-weight: 500; font-size: 1.08rem; color: #2A1A5E;
  background: #fff; box-shadow: inset 0 0 0 1.5px rgba(42,26,94,.16), 0 3px 0 rgba(42,26,94,.08); }
.ykc-opt:hover { background: #F5F0FB; }
.ykc-opt::after { content: ""; flex: none; width: 9px; height: 9px; border: solid #8E84B3; border-width: 0 0 2.5px 2.5px; transform: rotate(45deg); }
.ykc-offer { display: grid; gap: 4px; width: 100%; padding: 16px 20px; text-align: start; color: #06523F; background: #E3FBF3; box-shadow: inset 0 0 0 1.5px rgba(34,211,166,.7); }
.ykc-offer b { font-weight: 700; font-size: 1.1rem; }
.ykc-offer span { font-size: .95rem; }
.ykc-offer:hover { background: #D3F7EA; }
.ykc-foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; padding-top: 16px; border-top: 1px solid rgba(42,26,94,.13); }
.ykc-keep { padding: 0 24px; border-radius: 999px !important; font-weight: 700; color: #fff; background: linear-gradient(180deg, #EC3774, #CE1C5E); box-shadow: inset 0 1.5px 0 rgba(255,255,255,.38), 0 8px 18px rgba(216,31,99,.32); }
.ykc-go { padding: 0 14px; background: none; color: #5A4F86; font-weight: 500; text-decoration: underline; text-underline-offset: 3px; }
.ykc-note { margin: -6px 0 16px; padding: 10px 16px; border-radius: 16px; background: #FFF4CF; color: #5B4200; font-weight: 500; }
@keyframes ykc-in { from { opacity: 0; } }
@keyframes ykc-up { from { opacity: 0; transform: translateY(18px) scale(.98); } }
@media (max-width: 520px) { .ykc { place-items: end center; padding: 10px; } .ykc-card { padding: 26px 20px 18px; border-radius: 30px; } .ykc-foot > * { flex: 1 1 100%; } }
@media (prefers-reduced-motion: reduce) { .ykc, .ykc-card { animation: none; } }`;

function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }

export function showCancelFlow(base = '') {
  return new Promise((resolve) => {
    if (!document.getElementById('ykc-css')) { const s = el('style'); s.id = 'ykc-css'; s.textContent = CSS; document.head.append(s); }
    const before = document.activeElement;
    const wrap = el('div', 'ykc'), card = el('div', 'ykc-card');
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'ykc-h'); card.tabIndex = -1;
    wrap.append(card); document.body.append(wrap);

    const done = (result) => { document.removeEventListener('keydown', onKey); wrap.remove(); before?.focus?.(); resolve(result); };
    const onKey = (e) => {
      if (e.key === 'Escape') return done('kept');
      if (e.key !== 'Tab') return;                       // keep the focus inside the sheet
      const f = [...card.querySelectorAll('button:not(:disabled)')], first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => { if (e.target === wrap) done('kept'); });

    const post = async (path, body) => {
      const r = await fetch(`${base}/api/support/${path}`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw Object.assign(new Error(String(r.status)), { status: r.status });
      return r.json().catch(() => ({}));
    };
    const foot = (keepText, goText) => {
      const f = el('div', 'ykc-foot'), keep = el('button', 'ykc-keep', keepText), go = el('button', 'ykc-go', goText);
      keep.type = go.type = 'button'; keep.onclick = () => done('kept'); go.onclick = () => done('cancel'); f.append(keep, go); return f;
    };
    const paint = (title, sub, ...rest) => { const h2 = el('h2', '', title); h2.id = 'ykc-h'; card.replaceChildren(h2, el('p', '', sub), ...rest); card.focus(); };

    // Step 2: what the server offers for this reason. No offers (or no answer) = straight to the choice.
    const offers = (list) => {
      const box = el('div', 'ykc-list');
      for (const o of list) {
        if (o.id !== 'pause' && o.id !== 'help') continue;
        const b = el('button', 'ykc-offer'); b.type = 'button';
        b.append(el('b', '', o.id === 'pause' ? 'להקפיא במקום לבטל' : 'לתת לנו לעזור'), el('span', '', o.text));
        b.onclick = async () => {
          if (o.id === 'help') { done('kept'); location.assign(`${base}/help/#new`); return; }
          b.disabled = true; card.querySelector('.ykc-note')?.remove();
          try { await post('pause', {}); paint('המנוי הוקפא', 'לא יהיה חיוב בחודש הקרוב. נשמח לראות אתכם כשתחזרו.', (() => { const f = el('div', 'ykc-foot'), ok = el('button', 'ykc-keep', 'מעולה, תודה'); ok.type = 'button'; ok.onclick = () => done('kept'); f.append(ok); return f; })()); }
          catch { b.disabled = false; box.before(el('div', 'ykc-note', 'ההקפאה לא זמינה כרגע. אפשר לבטל כרגיל, או לכתוב לנו.')); }
        };
        box.append(b);
      }
      if (!box.children.length) return done('cancel');
      paint('רגע לפני, אולי זה יתאים יותר?', 'ואם לא, ממשיכים לביטול בלחיצה אחת.', box, foot('נשארים', 'להמשיך לביטול'));
    };

    // Step 1: one tap on a reason.
    const reasons = el('div', 'ykc-list');
    for (const [id, name] of REASONS) {
      const b = el('button', 'ykc-opt', name); b.type = 'button';
      b.onclick = async () => {
        reasons.querySelectorAll('button').forEach((x) => (x.disabled = true));
        try { offers((await post('cancel-intent', { reason: id })).offers || []); } catch { done('cancel'); }   // never stand between a parent and cancelling
      };
      reasons.append(b);
    }
    paint('נשמח לדעת למה', 'לחיצה אחת עוזרת לנו להשתפר. אפשר גם לדלג.', reasons, foot('בעצם, נשארים', 'לדלג ולהמשיך לביטול'));
  });
}
