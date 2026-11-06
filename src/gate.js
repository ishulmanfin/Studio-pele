// שער כניסה לאתר הציבורי (GitHub Pages): מסתיר את הסטודיו ממי שנתקל בו במקרה.
// זו לא אבטחה אמיתית (הקבצים ציבוריים), רק מנעול פשוט. במכשיר שהוזן בו הקוד פעם אחת – לא שואלים שוב.
import { GATE_HASH } from './gate-code.js';

const needed = () => Boolean(GATE_HASH) && /github\.io$/.test(location.hostname);
async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`studio-pele:${s}`));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function siteGate(app, onPass) {
  if (!needed() || localStorage.getItem('site-gate') === GATE_HASH) return onPass();
  let code = '';
  app.innerHTML = `<div class="site-gate"><div class="sg-box">
    <div class="sg-title">סטודיו פלא</div><div class="sg-sub">קוד כניסה של ההורים</div>
    <div class="sg-dots">${'<i></i>'.repeat(4)}</div>
    <div class="sg-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((k) => `<button class="sg-k" data-k="${k}" ${k === '' ? 'disabled' : ''}>${k}</button>`).join('')}</div>
  </div></div>`;
  const dots = [...app.querySelectorAll('.sg-dots i')];
  const draw = () => dots.forEach((d, i) => d.classList.toggle('on', i < code.length));
  app.querySelector('.sg-pad').addEventListener('pointerup', async (e) => {
    const k = e.target.closest('.sg-k')?.dataset.k; if (k === undefined || k === '') return;
    if (k === '⌫') code = code.slice(0, -1); else if (code.length < 4) code += k;
    draw();
    if (code.length === 4) {
      if (await sha(code) === GATE_HASH) { localStorage.setItem('site-gate', GATE_HASH); onPass(); }
      else { app.querySelector('.sg-dots').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-14px)' }, { transform: 'translateX(14px)' }, { transform: 'translateX(0)' }], { duration: 300 }); code = ''; setTimeout(draw, 300); }
    }
  });
}
