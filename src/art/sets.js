// תפאורות: הסטודיו (מסך הבית) ובית הקפה. 1600×1000, אזור בטוח x∈[150,1450].
import { prop } from './puppets.js';
const INK = '#2A1A5E';
const stitch = (d, c = 'rgba(255,255,255,.5)', w = 3) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-dasharray="8 7" stroke-linecap="round"/>`;

export const defs = `
<defs>
  <pattern id="wallpaper" width="90" height="90" patternUnits="userSpaceOnUse">
    <rect width="90" height="90" fill="#9BE7FF"/>
    <circle cx="22" cy="22" r="7" fill="#fff" opacity=".8"/><circle cx="67" cy="67" r="7" fill="#fff" opacity=".8"/>
    <path d="M67,14 l3,7 7,1 -5,5 1,7 -6,-3 -6,3 1,-7 -5,-5 7,-1z" fill="#FFD23F"/><path d="M22,59 l3,7 7,1 -5,5 1,7 -6,-3 -6,3 1,-7 -5,-5 7,-1z" fill="#FF8FC0"/>
  </pattern>
  <pattern id="planks" width="120" height="120" patternUnits="userSpaceOnUse">
    <rect width="120" height="120" fill="#FFF3FA"/><rect width="60" height="60" fill="#FF8FC0"/><rect x="60" y="60" width="60" height="60" fill="#FF8FC0"/></pattern>
  <pattern id="stageboards" width="200" height="50" patternUnits="userSpaceOnUse">
    <rect width="200" height="50" fill="#FFB25B"/><path d="M0,48 H200 M100,0 V24 M40,24 V50" stroke="#E8893A" stroke-width="4"/></pattern>
  <pattern id="cloth-stripes" width="60" height="60" patternUnits="userSpaceOnUse">
    <rect width="60" height="60" fill="#fff"/><rect width="30" height="60" fill="#FF4F8B"/></pattern>
  <pattern id="cloth-dots" width="56" height="56" patternUnits="userSpaceOnUse">
    <rect width="56" height="56" fill="#22D3A6"/><circle cx="14" cy="14" r="8" fill="#fff"/><circle cx="42" cy="42" r="8" fill="#FFD23F"/></pattern>
  <pattern id="cloth-checks" width="60" height="60" patternUnits="userSpaceOnUse">
    <rect width="60" height="60" fill="#fff"/><rect width="30" height="30" fill="#3BA3FF"/><rect x="30" y="30" width="30" height="30" fill="#3BA3FF"/></pattern>
  <pattern id="shutter-pat" width="100" height="240" patternUnits="userSpaceOnUse">
    <rect width="100" height="40" fill="#FF4F8B"/><rect y="40" width="100" height="40" fill="#FF8C42"/><rect y="80" width="100" height="40" fill="#FFD23F"/>
    <rect y="120" width="100" height="40" fill="#22D3A6"/><rect y="160" width="100" height="40" fill="#3BA3FF"/><rect y="200" width="100" height="40" fill="#7B5CFF"/>
    <path d="M0,39 H100 M0,79 H100 M0,119 H100 M0,159 H100 M0,199 H100 M0,239 H100" stroke="rgba(42,26,94,.25)" stroke-width="3"/></pattern>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FC3FF"/><stop offset="1" stop-color="#C8F1FF"/></linearGradient>
  <linearGradient id="curtain" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6A3FE0"/><stop offset=".5" stop-color="#8F6BFF"/><stop offset="1" stop-color="#6A3FE0"/></linearGradient>
  <radialGradient id="glow"><stop offset="0" stop-color="#FFF6B0" stop-opacity=".95"/><stop offset="1" stop-color="#FFF6B0" stop-opacity="0"/></radialGradient>
</defs>`;

const bulb = (x, y, c) => `<g class="bulb" style="--d:${(x % 7) * 0.3}s"><circle cx="${x}" cy="${y}" r="28" fill="url(#glow)"/><circle cx="${x}" cy="${y}" r="11" fill="${c}" stroke="${INK}" stroke-width="2"/></g>`;

/** phase: 'day' | 'evening' | 'night' – הסטודיו לפי השעה האמיתית */
export function studioSet(phase = 'day') {
  const lights = [];
  for (let i = 0; i < 13; i++) { const x = 90 + i * 120; const y = 120 + Math.sin(i * 0.9) * 22 + (i % 2) * 18; lights.push(bulb(x, y, ['#FFD23F', '#FF4F8B', '#5ED0FF', '#22D3A6', '#FF8C42'][i % 5])); }
  const cloud = (x, y, s, d) => `<g class="cloud-drift" style="--dur:${d}s"><g transform="translate(${x},${y}) scale(${s})"><g fill="#fff" stroke="${INK}" stroke-width="3" opacity=".95">
    <ellipse cx="0" cy="0" rx="70" ry="34"/><ellipse cx="-40" cy="8" rx="44" ry="26"/><ellipse cx="44" cy="6" rx="48" ry="28"/><ellipse cx="10" cy="-22" rx="40" ry="30"/></g>
    <ellipse cx="0" cy="12" rx="90" ry="14" fill="#fff"/></g></g>`;
  return `${defs}
  <defs><linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7B5CFF"/><stop offset=".55" stop-color="#FF8FC0"/><stop offset="1" stop-color="#FFC27A"/></linearGradient>
    <linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1C1240"/><stop offset="1" stop-color="#3B2A8A"/></linearGradient></defs>
  <rect x="-200" width="2000" height="1200" fill="${phase === 'night' ? 'url(#night)' : phase === 'evening' ? 'url(#dusk)' : 'url(#sky)'}"/>
  <g class="plx" data-depth=".12">
  ${phase === 'night' ? `${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 151) % 1600}" cy="${40 + ((i * 97) % 520)}" r="${2 + (i % 3)}" fill="#FFF3B0" class="twinkle" style="--d:${(i % 6) * 0.35}s"/>`).join('')}
  <g class="moon" transform="translate(1250,250)"><circle r="78" fill="#FFF3B0" stroke="${INK}" stroke-width="5"/><circle cx="34" cy="-18" r="70" fill="#2A1F6A"/><circle cx="-36" cy="6" r="7" fill="${INK}"/><path d="M-50,30 Q-38,40 -26,30" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/></g>` : ''}
  <g class="sun" transform="translate(1250,${phase === 'evening' ? 420 : 250})" ${phase === 'night' ? 'style="display:none"' : ''}><g class="sun-rays">${Array.from({ length: 12 }, (_, i) => `<path d="M0,-200 L14,-86 L-14,-86Z" fill="#FFD23F" transform="rotate(${i * 30})"/>`).join('')}</g>
    <circle r="74" fill="#FFD23F" stroke="${INK}" stroke-width="5"/><circle cx="-24" cy="-6" r="7" fill="${INK}"/><circle cx="24" cy="-6" r="7" fill="${INK}"/>
    <path d="M-24,20 Q0,40 24,20" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="-44" cy="16" r="10" fill="#FF8FC0"/><circle cx="44" cy="16" r="10" fill="#FF8FC0"/></g>
  </g>
  <g class="plx" data-depth=".3">${cloud(330, 260, 1, 38)}${cloud(900, 200, 0.75, 52)}${cloud(1500, 330, 0.6, 44)}</g>
  <g class="plx" data-depth=".5"><path d="M-200,660 C-60,620 -20,630 0,640 C200,560 420,600 620,640 C860,580 1100,560 1300,620 C1420,600 1520,610 1600,630 C1650,620 1690,640 1800,650 V1200 H-200Z" fill="#7BE08F" stroke="${INK}" stroke-width="4"/>
  <path d="M-200,705 C-60,700 -20,700 0,700 C260,660 500,690 800,710 C1100,680 1350,670 1600,700 C1650,705 1690,705 1800,705 V1200 H-200Z" fill="#4CCB6A"/></g>
  <g class="plx" data-depth=".75"><path d="M-200,120 Q-60,100 0,110 Q200,170 400,125 T800,130 T1200,120 T1600,130 Q1660,140 1800,120" fill="none" stroke="${INK}" stroke-width="3"/>
  ${lights.join('')}</g>
  <rect x="-200" y="780" width="2000" height="420" fill="url(#stageboards)"/>
  <path d="M-200,780 H1800" stroke="${INK}" stroke-width="5"/>
  <ellipse cx="800" cy="905" rx="520" ry="60" fill="#FFE070" opacity=".6"/>
  <g class="plx plx-front" data-depth="1.3">
  <path d="M-200,0 H150 C140,300 160,600 120,1000 V1200 H-200Z" fill="url(#curtain)" stroke="${INK}" stroke-width="4"/>
  <path d="M1800,0 H1450 C1460,300 1440,600 1480,1000 V1200 H1800Z" fill="url(#curtain)" stroke="${INK}" stroke-width="4"/>
  ${stitch('M60,0 C55,300 70,600 50,1000')}${stitch('M1540,0 C1545,300 1530,600 1550,1000')}
  </g>`;
}

/** הדוכן של בית הקפה בסטודיו – מציג את התפריט שנשמר */
export function cafeBooth(menu) {
  const items = (menu?.items || []).slice(0, 4);
  return `<g class="booth cafe-booth">
    <rect x="-210" y="-380" width="420" height="380" rx="14" fill="#FFFFFF" stroke="${INK}" stroke-width="5"/>
    <path d="M-235,-380 h470 l-20,70 h-430z" fill="#FF4F8B" stroke="${INK}" stroke-width="5"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${-215 + i * 72},-310 a36,26 0 0 0 72,0" fill="${i % 2 ? '#FFFFFF' : '#FF4F8B'}" stroke="${INK}" stroke-width="4"/>`).join('')}
    <rect x="-150" y="-260" width="140" height="260" rx="10" fill="#FF8C42" stroke="${INK}" stroke-width="5"/>
    <circle cx="-30" cy="-130" r="9" fill="#f2c14e" stroke="${INK}" stroke-width="3"/>
    <rect x="20" y="-262" width="160" height="${items.length ? 190 : 120}" rx="12" fill="#2A1A5E" stroke="${INK}" stroke-width="5"/>
    ${items.length ? items.map((it, i) => `<g transform="translate(${60 + (i % 2) * 80},${-212 + Math.floor(i / 2) * 82}) scale(.5)">${prop(it)}</g>`).join('')
      : `<text x="100" y="-195" text-anchor="middle" font-size="46" fill="#fffaf0" font-family="Fredoka, sans-serif">☕</text>`}
    <text x="0" y="-395" text-anchor="middle" font-size="40" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif" class="booth-title">${escape(menu?.name || 'Café')}</text>
  </g>`;
}

/** הדוכן של "טוטו טועה!": ✓ ו־✗ גדולים, שרואים מיד שזה משחק של נכון/לא נכון */
export function sillyBooth() {
  return `<g class="booth silly-booth">
    <rect x="-170" y="-320" width="340" height="320" rx="18" fill="#22D3A6" stroke="${INK}" stroke-width="5"/>
    <path d="M-190,-320 H190 L170,-262 H-170Z" fill="#FFD23F" stroke="${INK}" stroke-width="5"/>
    ${[-150, -90, -30, 30, 90, 150].map((x, i) => `<circle cx="${x}" cy="-291" r="8" fill="${i % 2 ? '#FF4F8B' : '#fff'}" stroke="${INK}" stroke-width="3"/>`).join('')}
    <g transform="translate(-75,-160)"><circle r="62" fill="#fff" stroke="${INK}" stroke-width="5"/><path d="M-28,2 L-8,24 L30,-22" fill="none" stroke="#18A957" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g transform="translate(75,-160)"><circle r="62" fill="#fff" stroke="${INK}" stroke-width="5"/><path d="M-24,-24 L24,24 M24,-24 L-24,24" stroke="#E5383B" stroke-width="16" stroke-linecap="round"/></g>
    <g transform="translate(0,-60)"><ellipse rx="34" ry="22" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="-26" cy="-22" r="11" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="-8" cy="-30" r="11" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="12" cy="-30" r="11" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="28" cy="-22" r="11" fill="#fff" stroke="${INK}" stroke-width="4"/></g>
    <rect x="-170" y="-30" width="340" height="30" fill="#FF8C42" stroke="${INK}" stroke-width="5"/>
    <text x="0" y="-337" text-anchor="middle" font-size="40" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif" class="booth-title">Silly Toto</text>
  </g>`;
}


/** דוכן הקריוקי: במה קטנה עם מיקרופון גדול, תווים ואורות */
export function karaokeBooth() {
  return `<g class="booth karaoke-booth">
    <rect x="-160" y="-320" width="320" height="320" rx="18" fill="#7B5CFF" stroke="${INK}" stroke-width="5"/>
    <path d="M-180,-320 H180 L160,-262 H-160Z" fill="#FF4F8B" stroke="${INK}" stroke-width="5"/>
    ${[-135, -81, -27, 27, 81, 135].map((x, i) => `<circle cx="${x}" cy="-291" r="8" fill="${['#FFD23F', '#fff', '#22D3A6'][i % 3]}" stroke="${INK}" stroke-width="3" class="twinkle" style="--d:${i * 0.25}s"/>`).join('')}
    <circle cx="0" cy="-150" r="96" fill="#FFD23F" opacity=".35"/>
    <g transform="translate(0,-150) rotate(-18)">
      <rect x="-30" y="-12" width="60" height="120" rx="14" fill="#2A1A5E"/>
      <circle cy="-40" r="52" fill="#E5383B" stroke="${INK}" stroke-width="6"/>
      <path d="M-30,-58 H30 M-36,-40 H36 M-30,-22 H30" stroke="#FFB3BC" stroke-width="5" stroke-linecap="round"/>
    </g>
    <g fill="#FFD23F" stroke="${INK}" stroke-width="4"><circle cx="-110" cy="-210" r="14"/><path d="M-96,-210 V-262 L-70,-252" fill="none" stroke-width="6"/>
      <circle cx="104" cy="-100" r="14"/><path d="M118,-100 V-152 L144,-142" fill="none" stroke-width="6"/></g>
    <rect x="-160" y="-30" width="320" height="30" fill="#FF8C42" stroke="${INK}" stroke-width="5"/>
    <text x="0" y="-337" text-anchor="middle" font-size="40" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif" class="booth-title">Karaoke</text>
  </g>`;
}

/** צרור בלונים מרחף – הדלת למשחק הבלונים */
export function balloonBunch() {
  const B = [[-70, -250, '#FF4F8B'], [10, -300, '#FFD23F'], [85, -240, '#22D3A6'], [-10, -200, '#4FA3FF'], [60, -170, '#8B5CF6']];
  return `<g class="booth balloon-booth">
    ${B.map(([x, y]) => `<path d="M${x},${y + 62} C${x * 0.6},${y + 130} ${x * 0.2},-40 0,0" stroke="#fffaf0" stroke-width="4" opacity=".85" fill="none"/>`).join('')}
    ${B.map(([x, y, c], i) => `<g class="bob" style="--d:${i * 0.4}s"><ellipse cx="${x}" cy="${y}" rx="52" ry="62" fill="${c}" stroke="${INK}" stroke-width="5"/><path d="M${x - 6},${y + 61} L${x + 6},${y + 61} L${x},${y + 72}Z" fill="${c}" stroke="${INK}" stroke-width="3"/><ellipse cx="${x - 20}" cy="${y - 26}" rx="9" ry="16" fill="#fff" opacity=".5" transform="rotate(-25 ${x - 20} ${y - 26})"/></g>`).join('')}
    <circle r="12" fill="#FF8C42" stroke="${INK}" stroke-width="4"/>
  </g>`;
}

/** תפאורה מכוסה בבד – פרק שעוד לא נפתח. לא מתחזה לתוכן מוכן. */
export function coveredSet(icon, color) {
  return `<g class="booth covered">
    <path d="M-170,-330 C-120,-350 120,-350 170,-330 C180,-200 190,-80 200,0 H-200 C-190,-80 -180,-200 -170,-330Z" fill="${color}" stroke="${INK}" stroke-width="5"/>
    ${stitch('M-120,-320 C-130,-200 -140,-100 -150,0')}${stitch('M120,-320 C130,-200 140,-100 150,0')}${stitch('M0,-335 V0', 'rgba(255,255,255,.35)')}
    <g class="tag" transform="translate(0,-180)"><circle r="54" fill="#fffaf0" stroke="${INK}" stroke-width="4"/>${icon}</g>
  </g>`;
}

export const ICONS = {
  note: `<path d="M-10,22 V-26 L22,-34 V12" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><circle cx="-18" cy="22" r="12" fill="${INK}"/><circle cx="14" cy="14" r="12" fill="${INK}"/>`,
  teddy: `<g stroke="${INK}" stroke-width="3" fill="#c98b5e"><circle cx="-20" cy="-22" r="11"/><circle cx="20" cy="-22" r="11"/><circle cy="0" r="26"/></g><circle cx="-8" cy="-4" r="3" fill="${INK}"/><circle cx="8" cy="-4" r="3" fill="${INK}"/><ellipse cy="8" rx="9" ry="6" fill="#f3e6d0"/>`,
  hat: `<g stroke="${INK}" stroke-width="3"><ellipse cy="18" rx="40" ry="10" fill="#6d597a"/><path d="M-22,16 C-24,-20 24,-20 22,16Z" fill="#6d597a"/><rect x="-22" y="4" width="44" height="8" fill="#e05f7e"/></g>`,
};

export function cafeSet() {
  return `${defs}
  <rect x="-200" width="2000" height="1200" fill="url(#wallpaper)"/>
  <g class="window" transform="translate(300,300)">
    <rect x="-170" y="-150" width="340" height="270" rx="20" fill="#B8F0FF" stroke="${INK}" stroke-width="6"/>
    <g class="cloud"><ellipse cx="-60" cy="-60" rx="60" ry="26" fill="#fff"/><ellipse cx="-30" cy="-80" rx="40" ry="26" fill="#fff"/></g>
    <circle cx="90" cy="-80" r="34" fill="#f2c14e" stroke="${INK}" stroke-width="3"/>
    <path d="M-170,-15 H170 M0,-150 V120" stroke="#fffaf0" stroke-width="12"/>
    <path d="M-185,-165 C-100,-120 -60,-60 -80,120 L-185,120Z M185,-165 C100,-120 60,-60 80,120 L185,120Z" fill="#FF4F8B" stroke="${INK}" stroke-width="4" opacity=".95"/>
  </g>
  <g class="menu-board" transform="translate(1180,250)">
    <rect x="-200" y="-150" width="400" height="290" rx="18" fill="#2A1A5E" stroke="#FF8C42" stroke-width="16"/>
    ${stitch('M-180,-130 H180 V120 H-180Z', 'rgba(255,255,255,.25)')}
    <g class="menu-slots"></g>
  </g>
  ${[600, 860].map((x) => `<g class="lamp" transform="translate(${x},0)"><path d="M0,0 V90" stroke="${INK}" stroke-width="4"/>
    <path d="M-60,150 C-60,100 60,100 60,150Z" fill="#FFD23F" stroke="${INK}" stroke-width="4"/><circle cy="160" r="40" fill="url(#glow)"/></g>`).join('')}
  <g class="door" transform="translate(1470,780)"><rect x="-110" y="-420" width="220" height="420" rx="14" fill="#FF8C42" stroke="${INK}" stroke-width="6"/>
    <rect x="-80" y="-380" width="160" height="150" rx="80" fill="#B8F0FF" stroke="${INK}" stroke-width="4"/><circle cx="-70" cy="-200" r="10" fill="#f2c14e" stroke="${INK}" stroke-width="3"/></g>
  <rect x="-200" y="780" width="2000" height="420" fill="url(#planks)"/>
  <path d="M-200,780 H1800" stroke="${INK}" stroke-width="4"/>
  <path d="M-200,0 H1800 V60 H-200Z" fill="#FF4F8B" stroke="${INK}" stroke-width="4"/>
  ${Array.from({ length: 17 }, (_, i) => `<path d="M${i * 100},60 a50,34 0 0 0 100,0" fill="${i % 2 ? '#FFFFFF' : '#FF4F8B'}" stroke="${INK}" stroke-width="4"/>`).join('')}`;
}

/** שולחן/דלפק עם מפה – נפרד כדי שהמפה תשתנה לפי הבחירה */
export function table(cloth = 'none') {
  const fill = cloth === 'none' ? '#d9b48a' : `url(#cloth-${cloth})`;
  return `<g class="table">
    <rect x="-420" y="0" width="840" height="34" rx="10" fill="#FF8C42" stroke="${INK}" stroke-width="5"/>
    <path class="cloth" d="M-440,-6 H440 L460,120 C300,140 -300,140 -460,120Z" fill="${fill}" stroke="${INK}" stroke-width="5"/>
    ${stitch('M-430,100 C-300,118 300,118 430,100', 'rgba(60,40,40,.35)')}
    <rect x="-380" y="120" width="40" height="110" fill="#FF8C42" stroke="${INK}" stroke-width="4"/>
    <rect x="340" y="120" width="40" height="110" fill="#FF8C42" stroke="${INK}" stroke-width="4"/>
  </g>`;
}

export function shutter() {
  return `<g class="shutter">
    <rect x="-200" y="0" width="2000" height="1100" fill="url(#shutter-pat)"/>
    <rect x="-200" y="1060" width="2000" height="40" fill="#FF8C42" stroke="${INK}" stroke-width="4"/>
    <rect x="740" y="930" width="120" height="40" rx="20" fill="#3b2a2a"/>
    <g transform="translate(800,420)"><rect x="-230" y="-80" width="460" height="160" rx="30" fill="#fffaf0" stroke="${INK}" stroke-width="6"/>
    <text x="0" y="22" text-anchor="middle" font-size="76" font-weight="800" fill="#FF4F8B" font-family="Fredoka, sans-serif">CAFÉ</text></g>
  </g>`;
}

function escape(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/** אולפן הלהקה: במה עם וילון, זרקורים, רמקולים ותווים */
export function bandSet() {
  const spot = (x, c) => `<path d="M${x},0 L${x - 160},780 H${x + 160}Z" fill="${c}" opacity=".18"/>`;
  const note = (x, y, d) => `<g class="note-float" style="--d:${d}s" transform="translate(${x},${y})">${ICONS.note}</g>`;
  return `${defs}
  <rect x="-200" width="2000" height="1200" fill="#2A1A5E"/>
  <rect x="-200" y="0" width="2000" height="780" fill="#3B2A8A"/>
  ${Array.from({ length: 24 }, (_, i) => `<circle cx="${(i * 137) % 1600}" cy="${40 + ((i * 89) % 380)}" r="${2 + (i % 3)}" fill="#FFD23F" class="twinkle" style="--d:${(i % 5) * 0.4}s"/>`).join('')}
  ${spot(420, '#FFD23F')}${spot(800, '#FF8FC0')}${spot(1180, '#5ED0FF')}
  <g transform="translate(160,560)"><rect x="-70" y="-180" width="140" height="220" rx="18" fill="#1C1240" stroke="${INK}" stroke-width="5"/><circle cy="-110" r="40" fill="#3B2A8A" stroke="#7B5CFF" stroke-width="6"/><circle cy="-10" r="26" fill="#3B2A8A" stroke="#7B5CFF" stroke-width="6"/></g>
  <g transform="translate(1440,560)"><rect x="-70" y="-180" width="140" height="220" rx="18" fill="#1C1240" stroke="${INK}" stroke-width="5"/><circle cy="-110" r="40" fill="#3B2A8A" stroke="#7B5CFF" stroke-width="6"/><circle cy="-10" r="26" fill="#3B2A8A" stroke="#7B5CFF" stroke-width="6"/></g>
  ${note(330, 230, 0)}${note(1270, 200, 1.2)}${note(800, 140, 2.1)}
  <rect x="-200" y="720" width="2000" height="480" fill="#FF8C42"/>
  <path d="M0,720 H1600" stroke="${INK}" stroke-width="6"/>
  ${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 200},720 V1200" stroke="#E07020" stroke-width="4"/>`).join('')}
  <path d="M0,0 H1600 V70 C1400,110 1200,60 1000,95 C800,60 600,110 400,80 C250,60 120,100 0,80Z" fill="url(#curtain)" stroke="${INK}" stroke-width="4"/>
  <g class="lights">${Array.from({ length: 11 }, (_, i) => `<circle cx="${80 + i * 144}" cy="${100 + (i % 2) * 14}" r="12" fill="${['#FFD23F', '#FF4F8B', '#5ED0FF', '#22D3A6'][i % 4]}" stroke="${INK}" stroke-width="3" class="bulb"/>`).join('')}</g>`;
}

/** וילון במה שנפתח (שני חלקים) */
export function stageCurtain() {
  return `<g class="stage-curtain">
    <path class="sc-l" d="M0,0 H820 C800,300 830,600 800,1200 H0Z" fill="url(#curtain)" stroke="${INK}" stroke-width="5"/>
    <path class="sc-r" d="M1600,0 H780 C800,300 770,600 800,1200 H1600Z" fill="url(#curtain)" stroke="${INK}" stroke-width="5"/>
    <g class="sc-star" transform="translate(800,420)"><circle r="90" fill="#FFD23F" stroke="${INK}" stroke-width="6"/>${ICONS.note.replace(/stroke-width="7"/, 'stroke-width="9"')}</g>
  </g>`;
}

/** דוכן הלהקה בסטודיו – במה קטנה שמציגה את הכלי והשיר שנשמרו */
export function bandBooth(song) {
  const words = (song?.words || []).slice(0, 4);
  const inst = song?.instrument || 'drum';
  return `<g class="booth band-booth">
    <rect x="-190" y="-330" width="380" height="330" rx="16" fill="#3B2A8A" stroke="${INK}" stroke-width="5"/>
    <path d="M-190,-330 H-110 C-120,-220 -100,-120 -130,0 H-190Z M190,-330 H110 C120,-220 100,-120 130,0 H190Z" fill="url(#curtain)" stroke="${INK}" stroke-width="4"/>
    <path d="M-210,-330 H210 V-290 C120,-260 -120,-260 -210,-290Z" fill="#7B5CFF" stroke="${INK}" stroke-width="5"/>
    ${[-150, -75, 0, 75, 150].map((x, i) => `<circle cx="${x}" cy="-300" r="9" fill="${['#FFD23F', '#FF4F8B', '#5ED0FF', '#22D3A6', '#FFD23F'][i]}" stroke="${INK}" stroke-width="3"/>`).join('')}
    <rect x="-190" y="-40" width="380" height="40" fill="#FF8C42" stroke="${INK}" stroke-width="5"/>
    <g transform="translate(0,-110) scale(.95)">${prop(inst)}</g>
    ${words.length ? words.map((w, i) => `<g transform="translate(${-90 + i * 60},-225) scale(.36)">${prop(w)}</g>`).join('')
      : `<g transform="translate(0,-220)">${ICONS.note}</g>`}
    <text x="0" y="-345" text-anchor="middle" font-size="40" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif" class="booth-title">Band</text>
  </g>`;
}
