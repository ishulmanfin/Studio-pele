// מיקה המורה: דמות אנושית מאוירת בגוף מלא, בסגנון סדרת אנימציה (נפח, תאורה רכה, עיניים גדולות).
// בנויה משכבות שאפשר להניע (שלד פשוט). (0,0) = בין כפות הרגליים.
// שמות הקבוצות (data-rig) והמידות ב-GEOM הם החוזה מול src/engine/teacher.js.

export const GEOM = { neck: [0, -486], brow: { x: 44, y: -676 }, beret: [-6, -770], shoulder: 84, upper: 120, fore: 98 };

const INK = '#3A2160';
const P = 'mk'; // קידומת למזהי מעברי צבע
const u = (id) => `url(#${P}-${id})`;

const defs = () => `
<defs>
  <radialGradient id="${P}-skin" cx="42%" cy="34%" r="75%"><stop offset="0" stop-color="#FFEADB"/><stop offset=".65" stop-color="#FFD5BC"/><stop offset="1" stop-color="#F2B293"/></radialGradient>
  <linearGradient id="${P}-skinV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F7C2A3"/><stop offset=".45" stop-color="#FFE0CB"/><stop offset="1" stop-color="#EFAE8E"/></linearGradient>
  <linearGradient id="${P}-hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9E52"/><stop offset=".55" stop-color="#FA7136"/><stop offset="1" stop-color="#D9481F"/></linearGradient>
  <radialGradient id="${P}-curl" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#FFB06A"/><stop offset=".6" stop-color="#F86A30"/><stop offset="1" stop-color="#CF431C"/></radialGradient>
  <linearGradient id="${P}-dress" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFE066"/><stop offset=".5" stop-color="#FFD23F"/><stop offset="1" stop-color="#F0A92A"/></linearGradient>
  <linearGradient id="${P}-sleeve" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F4B330"/><stop offset=".4" stop-color="#FFE27A"/><stop offset="1" stop-color="#EBA024"/></linearGradient>
  <radialGradient id="${P}-beret" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#A994FF"/><stop offset=".6" stop-color="#7B5CFF"/><stop offset="1" stop-color="#5636D6"/></radialGradient>
  <radialGradient id="${P}-iris" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="#E2A35C"/><stop offset=".55" stop-color="#9A5A26"/><stop offset="1" stop-color="#4B2610"/></radialGradient>
  <linearGradient id="${P}-sclera" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9E2F5"/><stop offset=".35" stop-color="#fff"/></linearGradient>
  <linearGradient id="${P}-shoe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF85B5"/><stop offset="1" stop-color="#F0407E"/></linearGradient>
  <pattern id="${P}-tights" width="30" height="34" patternUnits="userSpaceOnUse"><rect width="30" height="34" fill="#6A4BE8"/><rect y="0" width="30" height="13" fill="#A898FF"/></pattern>
  <linearGradient id="${P}-legShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1E0F4A" stop-opacity=".35"/><stop offset=".45" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#1E0F4A" stop-opacity=".4"/></linearGradient>
  <filter id="${P}-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="${P}-blur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter>
</defs>`;

// תלתל: כדור שיער עם ברק למעלה וצל למטה
const curl = (x, y, r) => `<g>
  <circle cx="${x}" cy="${y}" r="${r}" fill="${u('curl')}" stroke="${INK}" stroke-width="3"/>
  <path d="M${x - r * 0.55},${y - r * 0.25} a${r * 0.62},${r * 0.62} 0 0 1 ${r * 0.85},-${r * 0.35}" fill="none" stroke="#FFD0A0" stroke-width="${Math.max(2.5, r * 0.13)}" stroke-linecap="round" opacity=".85"/>
  <path d="M${x - r * 0.2},${y + r * 0.55} a${r * 0.6},${r * 0.6} 0 0 0 ${r * 0.72},-${r * 0.5}" fill="none" stroke="#B8391A" stroke-width="${Math.max(2, r * 0.1)}" stroke-linecap="round" opacity=".6"/>
</g>`;

// כף יד: אצבעות כלפי מטה, אגודל לכיוון הגוף (x שלילי)
const hand = () => `
  <g data-rig="hand">
    <path d="M-18,-4 C-23,14 -21,36 -7,43 C5,48 21,41 22,24 C24,9 20,-3 16,-7 Z" fill="${u('skinV')}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M-17,6 C-31,8 -35,21 -25,25 C-18,27 -14,20 -13,15" fill="#FFD8C2" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M-4,30 v10 M5,30 v11 M13,27 v9" stroke="#E39C7C" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="4" cy="12" rx="7" ry="5" fill="#fff" opacity=".35"/>
  </g>`;

// זרוע: כתף ב-(0,0), מרפק ב-(0,120), שורש כף היד ב-(0,218)
const arm = (side) => `
  <g data-rig="arm-${side}" class="t-arm">
    <g data-rig="upper-${side}">
      <rect x="-21" y="-14" width="42" height="146" rx="21" fill="${u('sleeve')}" stroke="${INK}" stroke-width="3.5"/>
      <path d="M-30,-6 C-34,-34 30,-38 30,-6 C30,18 -30,18 -30,-6 Z" fill="${u('dress')}" stroke="${INK}" stroke-width="3.5"/>
      <path d="M-14,26 C-10,60 -10,90 -12,112" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".35"/>
      <g data-rig="fore-${side}" transform="translate(0,120)">
        <rect x="-19" y="-16" width="38" height="112" rx="19" fill="${u('sleeve')}" stroke="${INK}" stroke-width="3.5"/>
        <path d="M-12,-2 C-9,30 -9,60 -11,80" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".3"/>
        <rect x="-21" y="80" width="42" height="18" rx="8" fill="#fff" stroke="${INK}" stroke-width="3"/>
        <path d="M-17,89 H17" stroke="#FF5C9A" stroke-width="3" stroke-dasharray="4 4"/>
        <g transform="translate(0,100)">${hand()}</g>
      </g>
    </g>
  </g>`;

// צורות פה. כל אחת סביב (0,0) = מרכז השפתיים.
const LIP = '#E0526C';
const IN = '#6B1F3A';
const TONGUE = '#F27A8F';
const mouths = () => `
  <g data-rig="mouth">
    <g data-v="X"><path d="M-24,-5 Q0,15 24,-5" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
      <path d="M-27,-8 q3,1 4,5 M27,-8 q-3,1 -4,5" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M-10,12 Q0,16 10,12" stroke="#E39C7C" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/></g>
    <g data-v="M"><path d="M-20,0 Q0,9 20,0" fill="none" stroke="${LIP}" stroke-width="7" stroke-linecap="round"/>
      <path d="M-20,0 Q0,7 20,0" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/></g>
    <g data-v="A"><path d="M-23,-7 Q0,-3 23,-7 Q21,30 0,33 Q-21,30 -23,-7 Z" fill="${IN}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M-19,-6 Q0,-3 19,-6 L17,2 Q0,5 -17,2 Z" fill="#fff"/>
      <path d="M-13,26 Q0,14 13,26 Q0,32 -13,26 Z" fill="${TONGUE}"/></g>
    <g data-v="E"><path d="M-26,-5 Q0,-1 26,-5 Q21,16 0,18 Q-21,16 -26,-5 Z" fill="${IN}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M-21,-4 Q0,-1 21,-4 L19,3 Q0,6 -19,3 Z" fill="#fff"/>
      <path d="M-10,13 Q0,8 10,13 Q0,17 -10,13 Z" fill="${TONGUE}"/></g>
    <g data-v="O"><ellipse cx="0" cy="6" rx="14" ry="18" fill="${IN}" stroke="${INK}" stroke-width="3.5"/>
      <path d="M-8,-6 Q0,-9 8,-6" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="0" cy="17" rx="8" ry="5" fill="${TONGUE}"/></g>
    <g data-v="U"><ellipse cx="0" cy="3" rx="9" ry="9" fill="${IN}" stroke="${LIP}" stroke-width="6"/>
      <ellipse cx="0" cy="3" rx="12" ry="12" fill="none" stroke="${INK}" stroke-width="2.5"/></g>
    <g data-v="F"><path d="M-21,-4 Q0,0 21,-4 Q17,12 0,13 Q-17,12 -21,-4 Z" fill="${IN}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M-16,-3 Q0,0 16,-3 L15,6 Q0,8 -15,6 Z" fill="#fff"/>
      <path d="M-17,9 Q0,14 17,9" fill="none" stroke="${LIP}" stroke-width="5" stroke-linecap="round"/></g>
    <g data-v="W"><path d="M-30,-8 Q0,-2 30,-8 Q26,31 0,34 Q-26,31 -30,-8 Z" fill="${IN}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M-25,-7 Q0,-2 25,-7 L23,2 Q0,6 -23,2 Z" fill="#fff"/>
      <path d="M-15,26 Q0,13 15,26 Q0,33 -15,26 Z" fill="${TONGUE}"/></g>
  </g>`;

const eye = (x, side) => {
  const s = side === 'l' ? -1 : 1; // צד חיצוני
  return `
  <g data-rig="eye-${side}" transform="translate(${x},-622)">
    <g data-rig="eye-open-${side}">
      <ellipse cx="0" cy="0" rx="24" ry="28" fill="${u('sclera')}" stroke="${INK}" stroke-width="2.5"/>
      <g data-rig="pupil-${side}">
        <circle cx="0" cy="3" r="17" fill="${u('iris')}"/>
        <circle cx="0" cy="3" r="17" fill="none" stroke="#3B1D0B" stroke-width="2"/>
        <circle cx="0" cy="4" r="8.5" fill="#1F0E06"/>
        <ellipse cx="${6 * s}" cy="-5" rx="6.5" ry="7.5" fill="#fff"/>
        <circle cx="${-6 * s}" cy="11" r="3" fill="#fff" opacity=".9"/>
        <path d="M-11,13 Q0,20 11,13" stroke="#FFD08A" stroke-width="2.5" fill="none" opacity=".55" stroke-linecap="round"/>
      </g>
      <path d="M-25,-4 C-22,-26 22,-30 26,-6" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
      <path d="M${24 * s},-9 l${9 * s},-7 M${21 * s},-17 l${7 * s},-9" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M-14,26 Q0,31 14,26" fill="none" stroke="#C98E7A" stroke-width="2" stroke-linecap="round" opacity=".7"/>
    </g>
    <g data-rig="eye-happy-${side}" style="display:none">
      <path d="M-20,6 Q0,-18 20,6" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M${20 * s},4 l${8 * s},-4" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
    </g>
  </g>`;
};

const brow = (side) => `
  <g data-rig="brow-${side}" transform="translate(${side === 'l' ? -GEOM.brow.x : GEOM.brow.x},${GEOM.brow.y})">
    <path d="M-18,4 C-12,-6 10,-8 18,0 C10,-3 -8,-1 -18,4 Z" fill="#C2441F" stroke="#C2441F" stroke-width="4" stroke-linejoin="round"/>
  </g>`;

export const teacher = () => `
<g class="teacher" data-rig="root">
  ${defs()}
  <ellipse cx="0" cy="4" rx="140" ry="18" fill="#2A1A5E" opacity=".25" filter="${u('blur')}"/>
  <g data-rig="body">
    <!-- רגליים בגרביונים מפוספסים, נעלי ספורט ורודות -->
    <g data-rig="legs">
      <rect x="-56" y="-236" width="40" height="214" rx="18" fill="${u('tights')}" stroke="${INK}" stroke-width="3.5"/>
      <rect x="16" y="-236" width="40" height="214" rx="18" fill="${u('tights')}" stroke="${INK}" stroke-width="3.5"/>
      <rect x="-56" y="-236" width="40" height="214" rx="18" fill="${u('legShade')}"/>
      <rect x="16" y="-236" width="40" height="214" rx="18" fill="${u('legShade')}"/>
      ${[-1, 1].map((k) => `<g transform="scale(${k},1)">
        <path d="M-82,-4 C-86,-34 -64,-46 -36,-42 C-14,-40 -8,-20 -10,-4 Z" fill="${u('shoe')}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M-84,-6 H-8 Q-6,6 -16,8 H-78 Q-88,6 -84,-6 Z" fill="#fff" stroke="${INK}" stroke-width="3"/>
        <path d="M-56,-38 l12,8 M-46,-40 l12,8" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
        <ellipse cx="-64" cy="-28" rx="8" ry="4" fill="#fff" opacity=".5"/>
      </g>`).join('')}
    </g>
    <g data-rig="torso">
      <!-- שמלת סרפן בגזרת A -->
      <path d="M-80,-472 C-100,-420 -124,-320 -144,-222 Q0,-196 144,-222 C124,-320 100,-420 80,-472 Q0,-494 -80,-472 Z" fill="${u('dress')}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M-60,-300 C-70,-270 -78,-240 -84,-212 M58,-330 C68,-290 80,-250 88,-212 M-20,-260 C-22,-240 -24,-222 -26,-206" fill="none" stroke="#E29A1E" stroke-width="4" stroke-linecap="round" opacity=".55"/>
      <path d="M-76,-460 C-90,-410 -104,-350 -116,-290" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".3"/>
      <!-- שוליים מסולסלים -->
      <path d="M-144,-222 ${[...Array(12)].map((_, i) => `q12,16 24,1`).join(' ')}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".9"/>
      <!-- כפתורי לב -->
      ${[-418, -368, -318].map((y) => `<path d="M0,${y + 7} C-10,${y - 1} -9,${y - 10} 0,${y - 5} C9,${y - 10} 10,${y - 1} 0,${y + 7} Z" fill="#FF5C9A" stroke="${INK}" stroke-width="2.5"/>`).join('')}
      <!-- כיס עם עפרון וטלאי כוכב -->
      <path d="M48,-304 h54 l-5,48 q-22,10 -44,0 z" fill="#F7BC33" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M52,-292 h46" stroke="#fff" stroke-width="3" stroke-dasharray="5 5" opacity=".8"/>
      <g transform="translate(66,-306) rotate(-12)"><rect x="-6" y="-40" width="12" height="42" rx="2" fill="#3FC1A5" stroke="${INK}" stroke-width="2.5"/>
        <path d="M-6,-40 L0,-53 L6,-40 Z" fill="#FFE0CB" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="0" cy="-50" r="2" fill="${INK}"/></g>
      <path d="M-84,-262 l7,-15 l7,15 l16,1 l-12,10 l4,16 l-15,-9 l-14,9 l4,-16 l-12,-10 Z" fill="#7B5CFF" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- צווארון פיטר פן -->
      <path d="M-58,-480 Q-40,-436 -2,-450 Q-8,-470 -58,-480 Z M58,-480 Q40,-436 2,-450 Q8,-470 58,-480 Z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-52,-474 Q-38,-446 -10,-452 M52,-474 Q38,-446 10,-452" fill="none" stroke="#FF85B5" stroke-width="3" stroke-dasharray="4 4"/>
    </g>
  </g>
  <!-- זרועות -->
  <g transform="translate(${-GEOM.shoulder},-452)"><g transform="scale(-1,1)">${arm('l')}</g></g>
  <g transform="translate(${GEOM.shoulder},-452)">${arm('r')}</g>
  <g data-rig="head"><g transform="translate(0,-490) scale(1.12) translate(0,490)">
    <!-- צוואר וצל הסנטר -->
    <path d="M-19,-512 L-19,-466 Q0,-456 19,-466 L19,-512 Z" fill="#F3B898" stroke="${INK}" stroke-width="3"/>
    <path d="M-19,-506 Q0,-490 19,-506" fill="none" stroke="#D98E6C" stroke-width="6" opacity=".6"/>
    <!-- שיער מאחור -->
    <path d="M-118,-640 C-140,-740 -60,-800 0,-796 C60,-800 140,-740 118,-640 C126,-590 112,-548 96,-530 C70,-548 -70,-548 -96,-530 C-112,-548 -126,-590 -118,-640 Z" fill="${u('hair')}" stroke="${INK}" stroke-width="3.5"/>
    <!-- קוקיות מתולתלות עם סרטים -->
    ${[-1, 1].map((k) => `<g transform="scale(${k},1)">
      ${curl(-150, -646, 36)}${curl(-168, -598, 32)}${curl(-150, -554, 28)}${curl(-172, -548, 22)}${curl(-140, -514, 20)}
      <g transform="translate(-128,-684) rotate(-20)">
        <path d="M0,0 C-26,-22 -40,4 -22,14 C-12,18 -4,8 0,0 C4,8 12,18 22,14 C40,4 26,-22 0,0 Z" fill="#FF5C9A" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="0" cy="2" r="7" fill="#FF85B5" stroke="${INK}" stroke-width="2.5"/>
        <path d="M-26,-6 q6,-6 12,-2" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
      </g>
    </g>`).join('')}
    <!-- אוזניים עם עגילי כוכב -->
    ${[-1, 1].map((k) => `<g transform="scale(${k},1)">
      <ellipse cx="-100" cy="-604" rx="15" ry="21" fill="${u('skin')}" stroke="${INK}" stroke-width="3"/>
      <path d="M-102,-614 q-6,8 0,16" stroke="#E39C7C" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M-100,-585 l3,6 l7,1 l-5,4 l1,7 l-6,-3 l-6,3 l1,-7 l-5,-4 l7,-1 Z" fill="#FFD23F" stroke="${INK}" stroke-width="2"/>
    </g>`).join('')}
    <!-- פנים -->
    <path d="M-102,-640 C-104,-716 104,-716 102,-640 C104,-574 66,-516 0,-512 C-66,-516 -104,-574 -102,-640 Z" fill="${u('skin')}" stroke="${INK}" stroke-width="4"/>
    <g data-rig="face">
      <ellipse cx="-62" cy="-574" rx="22" ry="14" fill="#FF6F9F" opacity=".5" filter="${u('blur2')}"/>
      <ellipse cx="62" cy="-574" rx="22" ry="14" fill="#FF6F9F" opacity=".5" filter="${u('blur2')}"/>
      ${[[-70, -584], [-60, -576], [-74, -572], [64, -584], [74, -576], [60, -572]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#D9663A" opacity=".55"/>`).join('')}
      ${brow('l')}${brow('r')}
      ${eye(-44, 'l')}${eye(44, 'r')}
      <path d="M-3,-596 q9,10 -1,17" fill="none" stroke="#D98E6C" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="2" cy="-590" r="2.5" fill="#fff" opacity=".7"/>
      <g transform="translate(0,-552)">${mouths()}</g>
    </g>
    <!-- פוני מתולתל עם ברק -->
    <path d="M-106,-636 C-116,-716 -50,-752 0,-748 C54,-752 116,-716 106,-636 C96,-668 76,-680 58,-672 C50,-694 22,-700 8,-684 C-6,-702 -40,-700 -50,-678 C-66,-690 -92,-676 -106,-636 Z" fill="${u('hair')}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M-70,-716 C-40,-734 30,-736 66,-718" fill="none" stroke="#FFD0A0" stroke-width="8" stroke-linecap="round" opacity=".75"/>
    <path d="M-50,-690 q-8,-14 4,-28 M10,-690 q-6,-14 6,-30 M62,-680 q-2,-14 10,-24" stroke="#C2441F" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
    <!-- כומתה -->
    <g data-rig="beret">
      <ellipse cx="-6" cy="-770" rx="108" ry="34" fill="${u('beret')}" stroke="${INK}" stroke-width="4"/>
      <path d="M-108,-764 Q-6,-736 94,-764" fill="none" stroke="#4A2CC0" stroke-width="7" stroke-linecap="round"/>
      <path d="M-70,-786 C-40,-800 20,-802 50,-792" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".35"/>
      <path d="M-12,-802 q-4,-18 8,-22 q10,2 6,20" fill="${u('beret')}" stroke="${INK}" stroke-width="3"/>
      <g transform="translate(62,-756)"><path d="M0,-14 l4,9 l10,1 l-7,7 l2,10 l-9,-5 l-9,5 l2,-10 l-7,-7 l10,-1 Z" fill="#FFD23F" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g>
    </g>
  </g></g>
</g>`;

// קלף תמונה שהמורה מראה (אביזר)
export const card = (emoji, label) => `
<g class="t-card">
  <rect x="-95" y="-112" width="190" height="230" rx="22" fill="#2A1A5E" opacity=".25" transform="translate(6,8)"/>
  <rect x="-95" y="-120" width="190" height="230" rx="22" fill="#fffaf0" stroke="${INK}" stroke-width="5"/>
  <rect x="-80" y="-104" width="160" height="198" rx="14" fill="none" stroke="#FFD23F" stroke-width="3" stroke-dasharray="8 6"/>
  <text x="0" y="0" font-size="110" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  ${label ? `<text x="0" y="82" font-size="34" font-weight="700" text-anchor="middle" fill="${INK}" font-family="Fredoka, Rubik, sans-serif" style="direction:ltr">${label}</text>` : ''}
</g>`;
