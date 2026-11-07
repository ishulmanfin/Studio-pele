// הכיתה של מיקה: קיר חם, חלון, ספרייה, שרשרת אותיות, שטיח, וכן ציור (לוח) שעליו מיקה מראה מילה חדשה.
const INK = '#3A2160';

export const EASEL = { x: 720, y: 430 }; // מרכז הקלף על כן הציור

export function classroomSet() {
  const letters = 'ABCDEFGHIJ'.split('');
  const colors = ['#FF5C9A', '#FFB020', '#3FC1A5', '#4FB6FF', '#8C6BFF'];
  return `
  <defs>
    <linearGradient id="cr-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1DD"/><stop offset="1" stop-color="#FFE0C2"/></linearGradient>
    <linearGradient id="cr-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9A066"/><stop offset="1" stop-color="#C97E48"/></linearGradient>
    <linearGradient id="cr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FD0FF"/><stop offset="1" stop-color="#C9F0FF"/></linearGradient>
    <radialGradient id="cr-light" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <pattern id="cr-paper" width="60" height="60" patternUnits="userSpaceOnUse"><circle cx="30" cy="30" r="3" fill="#FFC9A0" opacity=".5"/></pattern>
  </defs>
  <g class="plx" data-depth="0.9">
    <rect x="-300" y="0" width="2200" height="1000" fill="url(#cr-wall)"/>
    <rect x="-300" y="0" width="2200" height="820" fill="url(#cr-paper)"/>
    <ellipse cx="800" cy="380" rx="900" ry="520" fill="url(#cr-light)"/>
    <!-- חלון -->
    <g transform="translate(1180,120)">
      <rect x="-10" y="-10" width="320" height="260" rx="26" fill="#fff" stroke="${INK}" stroke-width="5"/>
      <rect x="8" y="8" width="284" height="224" rx="16" fill="url(#cr-sky)"/>
      <circle cx="226" cy="64" r="32" fill="#FFD23F"/><circle cx="226" cy="64" r="44" fill="#FFD23F" opacity=".25"/>
      <path d="M40,150 q20,-30 50,-12 q20,-26 50,-4 q34,-6 30,22 Z" fill="#fff"/>
      <path d="M150,8 V232 M8,120 H292" stroke="#fff" stroke-width="12"/>
      <path d="M-30,-20 C30,40 20,200 -20,260 L-40,260 L-40,-20 Z M330,-20 C270,40 280,200 320,260 L340,260 L340,-20 Z" fill="#FF8FB8" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    </g>
    <!-- שרשרת אותיות -->
    <path d="M-40,60 Q400,140 1100,70" fill="none" stroke="${INK}" stroke-width="3"/>
    ${letters.map((l, i) => { const x = 20 + i * 108; const y = 72 + Math.sin((i / 9) * Math.PI) * 52 - i * 2; return `<g transform="translate(${x},${y}) rotate(${(i % 2 ? 4 : -4)})">
      <rect x="-34" y="0" width="68" height="74" rx="10" fill="${colors[i % 5]}" stroke="${INK}" stroke-width="3.5"/>
      <text x="0" y="52" font-size="46" font-weight="700" text-anchor="middle" fill="#fff" font-family="Fredoka, Rubik, sans-serif" style="direction:ltr">${l}</text></g>`; }).join('')}
    <!-- ספרייה -->
    <g transform="translate(1180,470)">
      <rect x="0" y="0" width="330" height="360" rx="14" fill="#B9774A" stroke="${INK}" stroke-width="5"/>
      <rect x="16" y="16" width="298" height="150" rx="6" fill="#8E5530"/><rect x="16" y="190" width="298" height="150" rx="6" fill="#8E5530"/>
      ${[[24, '#FF5C9A', 40, 120], [68, '#4FB6FF', 34, 104], [106, '#FFD23F', 44, 128], [154, '#3FC1A5', 30, 98], [188, '#8C6BFF', 46, 124], [238, '#FF9E52', 36, 110]].map(([x, c, w, h]) => `<rect x="${x}" y="${166 - h}" width="${w}" height="${h}" rx="5" fill="${c}" stroke="${INK}" stroke-width="3"/><rect x="${x + 6}" y="${166 - h + 14}" width="${w - 12}" height="8" rx="3" fill="#fff" opacity=".6"/>`).join('')}
      <g transform="translate(70,340)"><circle cx="0" cy="-60" r="44" fill="#9BE38A" stroke="${INK}" stroke-width="4"/><path d="M-30,0 L-24,-36 H24 L30,0 Z" fill="#FF8FB8" stroke="${INK}" stroke-width="4"/></g>
      ${[[180, '#FFD23F'], [250, '#FF5C9A']].map(([x, c]) => `<circle cx="${x}" cy="300" r="34" fill="${c}" stroke="${INK}" stroke-width="4"/><path d="M${x - 24},290 Q${x},270 ${x + 24},290" fill="none" stroke="#fff" stroke-width="5" opacity=".6" stroke-linecap="round"/>`).join('')}
    </g>
  </g>
  <!-- רצפה ושטיח -->
  <rect x="-300" y="820" width="2200" height="200" fill="url(#cr-floor)"/>
  <path d="M-300,820 H1900" stroke="${INK}" stroke-width="5"/>
  ${[...Array(10)].map((_, i) => `<path d="M${-200 + i * 220},850 h140 M${-120 + i * 220},905 h150 M${-180 + i * 220},960 h130" stroke="#B86E3A" stroke-width="5" stroke-linecap="round" opacity=".6"/>`).join('')}
  <ellipse cx="800" cy="930" rx="640" ry="70" fill="#8C6BFF" stroke="${INK}" stroke-width="5"/>
  <ellipse cx="800" cy="930" rx="560" ry="54" fill="none" stroke="#FFD23F" stroke-width="6" stroke-dasharray="20 14"/>
  <ellipse cx="800" cy="930" rx="460" ry="40" fill="#A994FF"/>
  <!-- כן ציור -->
  <g transform="translate(${EASEL.x},${EASEL.y})">
    <path d="M-110,140 L-150,500 M110,140 L150,500 M0,140 L0,470" stroke="#9A6038" stroke-width="16" stroke-linecap="round"/>
    <path d="M-110,140 L-150,500 M110,140 L150,500" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".4"/>
    <rect x="-150" y="-170" width="300" height="320" rx="20" fill="#fff" stroke="${INK}" stroke-width="5"/>
    <rect x="-136" y="-156" width="272" height="292" rx="12" fill="#FFFBF2" stroke="#FFD23F" stroke-width="4" stroke-dasharray="12 9"/>
    <rect x="-170" y="140" width="340" height="24" rx="10" fill="#B9774A" stroke="${INK}" stroke-width="4"/>
    ${[['-120', '#FF5C9A'], ['-80', '#4FB6FF'], ['-40', '#FFD23F']].map(([x, c]) => `<rect x="${x}" y="122" width="26" height="18" rx="4" fill="${c}" stroke="${INK}" stroke-width="2.5"/>`).join('')}
  </g>`;
}
