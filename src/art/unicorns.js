// חדי הקרן של השיעור: חברים מעופפים, צבעוניים ומגניבים. לכל ילדה חד-קרן משלה, שגדל איתה:
// כנפיים, ניצוצות והילה נפתחים לפי הרמה (data-rig="wings" / "glow" / "stars").
// מצוירים בפרופיל 3/4 כשהם פונים ימינה. (0,0) = בין הפרסות.

const INK = '#3A2160';

export const UNICORNS = {
  keshet: {
    name: 'קשתית', en: 'Rainbow',
    body: ['#FFFFFF', '#F3EEFF', '#D9CCFF'], muzzle: '#FFE3F0', hoof: '#FFC94D',
    mane: ['#FF5C9A', '#FF9E52', '#FFD23F', '#3FD9A5', '#4FB6FF', '#8C6BFF'],
    horn: ['#FFF4B8', '#FFC94D', '#F09A1F'], iris: ['#9BE7FF', '#2E7FE0', '#123A8C'],
    wing: ['#FFFFFF', '#FFE3F7', '#C9B8FF'], spots: null,
  },
  nova: {
    name: 'נובה', en: 'Nova',
    body: ['#B6A8FF', '#7F6BF0', '#4A35B8'], muzzle: '#CFC4FF', hoof: '#62F0E0',
    mane: ['#62F0E0', '#41C9FF', '#B36BFF', '#FF5CCB', '#62F0E0', '#41C9FF'],
    horn: ['#FFFFFF', '#9CF5FF', '#3FB8E0'], iris: ['#FFB8F2', '#E040B8', '#6A1470'],
    wing: ['#E9FDFF', '#9CF5FF', '#B36BFF'], spots: '#FFF6B8',
  },
  candy: {
    name: 'סוכריה', en: 'Candy',
    body: ['#F2FFF9', '#C8F7E6', '#8FE0C6'], muzzle: '#FFF0F5', hoof: '#FF85B5',
    mane: ['#FF85B5', '#FFB3D1', '#FFD6A5', '#FF85B5', '#C9A6FF', '#FFB3D1'],
    horn: ['#FFFFFF', '#FFC2DA', '#FF6FA3'], iris: ['#C8FFB0', '#38B86A', '#0F4A2A'],
    wing: ['#FFFFFF', '#FFE6F0', '#FFC2DA'], spots: null,
  },
};

let n = 0;
export function unicorn(kind = 'keshet') {
  const C = UNICORNS[kind];
  const P = `uni${++n}`;
  const u = (id) => `url(#${P}-${id})`;
  const stops = (cs) => cs.map((c, i) => `<stop offset="${i / (cs.length - 1)}" stop-color="${c}"/>`).join('');
  // קווצת שיער זורמת: טיפה מוארכת בצורת S, עם ברק
  const lock = (x, y, len, w, rot, c, hi = true) => `
    <g transform="translate(${x},${y}) rotate(${rot})">
      <path d="M${-w * 0.5},0 C${-w * 0.2},${-w * 0.5} ${w * 0.8},${-w * 0.4} ${w * 0.7},${len * 0.25} C${w * 0.6},${len * 0.6} ${w * 0.1},${len * 0.8} ${w * 0.5},${len} C${-w * 0.5},${len * 0.85} ${-w * 0.9},${len * 0.45} ${-w * 0.5},0 Z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      ${hi ? `<path d="M${-w * 0.05},${len * 0.05} C${w * 0.3},${len * 0.2} ${w * 0.25},${len * 0.45} ${w * 0.05},${len * 0.6}" fill="none" stroke="#fff" stroke-width="${Math.max(3, w * 0.14)}" stroke-linecap="round" opacity=".5"/>` : ''}
    </g>`;
  const MANE = [[30, -372, 120, 46, 28], [14, -340, 120, 44, 34], [2, -306, 112, 42, 38], [-6, -272, 100, 38, 42], [-10, -240, 86, 34, 46], [-12, -212, 70, 30, 50]];
  const mane = MANE.map(([x, y, l, w, r], i) => lock(x, y, l, w, r, C.mane[i % C.mane.length])).join('');
  const fore = [lock(92, -372, 62, 30, -64, C.mane[1]), lock(84, -366, 56, 28, -40, C.mane[0])].join('');
  const TAIL = [[-112, -196, 150, 50, 52], [-118, -186, 150, 46, 32], [-118, -178, 140, 42, 14], [-114, -170, 120, 36, -2]];
  const tail = TAIL.map(([x, y, l, w, r], i) => lock(x, y, l, w, r, C.mane[(i + 2) % C.mane.length])).join('');
  const leg = (x, far) => `
    <g data-rig="leg" data-x="${x}" transform="translate(${x},-118)">
      <path d="M-21,-6 C-22,40 -16,70 -15,92 L15,92 C16,70 22,40 21,-6 Z" fill="${far ? C.body[2] : u('bodyV')}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-17,88 H17 V106 Q17,118 5,118 H-5 Q-17,118 -17,106 Z" fill="${C.hoof}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-10,92 h12" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>
    </g>`;
  const wing = (far) => `
    <g data-rig="${far ? 'wing-far' : 'wing'}" transform="translate(${far ? 4 : -14},${far ? -228 : -206})">
      <g transform="rotate(-18)">
        <path d="M0,0 C-30,-40 -40,-110 -6,-150 C6,-120 20,-112 30,-118 C36,-92 54,-84 70,-88 C66,-60 70,-40 86,-30 C50,-6 22,4 0,0 Z" fill="${far ? C.wing[2] : u('wing')}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" opacity="${far ? 0.85 : 1}"/>
        ${far ? '' : `<path d="M6,-14 C-6,-50 -8,-90 -4,-128 M16,-14 C18,-50 24,-80 28,-104 M28,-10 C40,-30 52,-52 62,-74" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>`}
      </g>
    </g>`;
  const star = (x, y, r, c) => `<path transform="translate(${x},${y})" d="M0,${-r} L${r * 0.28},${-r * 0.28} L${r},0 L${r * 0.28},${r * 0.28} L0,${r} L${-r * 0.28},${r * 0.28} L${-r},0 L${-r * 0.28},${-r * 0.28} Z" fill="${c}"/>`;
  return `
<g class="unicorn uni-${kind}" data-rig="root">
  <defs>
    <radialGradient id="${P}-body" cx="40%" cy="30%" r="80%">${stops(C.body)}</radialGradient>
    <linearGradient id="${P}-bodyV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.body[2]}"/><stop offset=".45" stop-color="${C.body[0]}"/><stop offset="1" stop-color="${C.body[1]}"/></linearGradient>
    <linearGradient id="${P}-horn" x1="0" y1="1" x2="0" y2="0">${stops(C.horn.slice().reverse())}</linearGradient>
    <radialGradient id="${P}-iris" cx="50%" cy="62%" r="60%">${stops(C.iris)}</radialGradient>
    <linearGradient id="${P}-wing" x1="0" y1="1" x2="1" y2="0">${stops(C.wing)}</linearGradient>
    <radialGradient id="${P}-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${C.horn[1]}" stop-opacity=".9"/><stop offset="1" stop-color="${C.horn[1]}" stop-opacity="0"/></radialGradient>
    <filter id="${P}-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <ellipse data-rig="shadow" cx="0" cy="2" rx="130" ry="16" fill="#2A1A5E" opacity=".16" filter="${u('blur')}"/>
  <g data-rig="body">
    <g data-rig="glow" style="display:none"><ellipse cx="10" cy="-200" rx="210" ry="180" fill="${u('glow')}" opacity=".45"/></g>
    ${wing(true)}
    ${leg(-78, true)}${leg(62, true)}
    <g data-rig="tail">${tail}</g>
    ${leg(-50, false)}${leg(84, false)}
    <!-- גוף -->
    <path d="M-120,-170 C-126,-232 -60,-246 10,-236 C70,-240 116,-214 112,-160 C110,-112 70,-96 0,-98 C-70,-96 -116,-116 -120,-170 Z" fill="${u('body')}" stroke="${INK}" stroke-width="3.5"/>
    <path d="M-92,-206 C-60,-226 0,-228 40,-222" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".55"/>
    ${C.spots ? [[-70, -160, 5], [-30, -190, 4], [20, -150, 6], [60, -190, 4], [-90, -130, 3], [80, -140, 4]].map(([x, y, r]) => star(x, y, r * 1.6, C.spots)).join('') : ''}
    ${wing(false)}
    <!-- ראש -->
    <g data-rig="head" transform="translate(0,0)">
      <path d="M14,-214 C18,-268 40,-318 74,-336 L128,-276 C104,-246 92,-214 76,-196 Z" fill="${u('body')}"/>
      <path d="M14,-214 C18,-268 40,-318 74,-336 M128,-276 C104,-246 92,-214 76,-196" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
      <g data-rig="mane">${mane}</g>
      <circle cx="96" cy="-300" r="72" fill="${u('body')}" stroke="${INK}" stroke-width="3.5"/>
      <ellipse cx="152" cy="-262" rx="48" ry="38" fill="${C.muzzle}" stroke="${INK}" stroke-width="3.5"/>
      <ellipse cx="140" cy="-280" rx="16" ry="8" fill="#fff" opacity=".6"/>
      <ellipse cx="174" cy="-268" rx="5" ry="7" fill="${INK}" opacity=".75"/>
      <path d="M140,-240 Q156,-232 172,-242" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
      <ellipse cx="114" cy="-262" rx="16" ry="10" fill="#FF6F9F" opacity=".55" filter="${u('blur')}"/>
      <!-- אוזן -->
      <path d="M60,-352 C52,-394 70,-412 80,-414 C92,-396 92,-370 84,-350 Z" fill="${u('body')}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M68,-358 C64,-386 74,-398 78,-400 C84,-386 84,-370 80,-358 Z" fill="#FFB3D1"/>
      <!-- קרן -->
      <g data-rig="horn">
        <path d="M82,-360 L122,-494 Q126,-498 127,-492 L114,-354 Z" fill="${u('horn')}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M87,-378 L114,-368 M93,-404 L117,-396 M100,-430 L119,-424 M108,-458 L122,-454" stroke="${C.horn[2]}" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>
        <path d="M92,-372 L119,-478" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      </g>
      <g data-rig="forelock">${fore}</g>
      <!-- עין -->
      <g data-rig="eye" transform="translate(104,-306)">
        <g data-rig="eye-open">
          <ellipse cx="0" cy="0" rx="21" ry="25" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
          <g data-rig="pupil"><circle cx="2" cy="3" r="16" fill="${u('iris')}"/><circle cx="2" cy="4" r="7.5" fill="#160A2E"/>
            <ellipse cx="8" cy="-5" rx="6" ry="7" fill="#fff"/><circle cx="-4" cy="11" r="3" fill="#fff" opacity=".9"/>
            ${star(-6, -4, 4, '#fff')}</g>
          <path d="M-22,-4 C-18,-24 18,-28 23,-6" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>
          <path d="M-18,-16 l-10,-10 M-10,-22 l-6,-13 M0,-25 l-1,-13" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
        </g>
        <path data-rig="eye-happy" d="M-18,6 Q0,-16 18,6" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" style="display:none"/>
      </g>
    </g>
  </g>
  <g data-rig="stars" style="display:none">
    ${[[-150, -330, 12], [190, -420, 10], [-60, -400, 8], [220, -200, 9], [-190, -200, 7]].map(([x, y, r]) => star(x, y, r, C.horn[1])).join('')}
  </g>
</g>`;
}
