// מיקה המורה: דמות אנושית מאוירת בגוף מלא, בנויה משכבות שאפשר להניע (שלד פשוט).
// (0,0) = בין כפות הרגליים. הראש סביב (0,-600). הזרועות מצוירות כלפי מטה ומסתובבות סביב הכתף והמרפק.
// שמות הקבוצות (data-rig) הם החוזה מול src/engine/teacher.js.

const INK = '#2A1A5E';
const SKIN = '#FFD9C0';
const SKIN_SH = '#F4BFA0';
const HAIR = '#FF6B3D';
const HAIR_SH = '#E2522A';
const DRESS = '#FFD23F';
const DRESS_SH = '#F2B92B';
const BERET = '#7B5CFF';
const PINK = '#FF4F8B';
const stitch = (d, c = 'rgba(255,255,255,.6)', w = 3) =>
  `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-dasharray="7 6" stroke-linecap="round"/>`;

// כף יד פתוחה (כפפה רכה עם אגודל). מצוירת כשהאצבעות כלפי מטה, האגודל לכיוון הגוף (x שלילי).
const hand = () => `
  <g data-rig="hand">
    <path d="M-17,-6 C-22,10 -20,34 -6,40 C6,45 20,38 21,22 C23,8 19,-4 15,-8 Z" fill="${SKIN}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M-16,4 C-30,6 -34,18 -24,22 C-18,24 -14,18 -13,14" fill="${SKIN}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M-2,26 v10 M7,25 v10" stroke="${SKIN_SH}" stroke-width="3" stroke-linecap="round"/>
  </g>`;

// זרוע: כתף ב-(0,0), מרפק ב-(0,118), שורש כף היד ב-(0,222)
const arm = (side) => `
  <g data-rig="arm-${side}" class="t-arm">
    <g data-rig="upper-${side}">
      <path d="M0,0 L0,118" stroke="${INK}" stroke-width="44" stroke-linecap="round"/>
      <path d="M0,0 L0,118" stroke="${DRESS}" stroke-width="37" stroke-linecap="round"/>
      ${stitch('M-9,14 L-9,100', 'rgba(255,255,255,.55)', 2.5)}
      <g data-rig="fore-${side}" transform="translate(0,118)">
        <path d="M0,0 L0,96" stroke="${INK}" stroke-width="40" stroke-linecap="round"/>
        <path d="M0,0 L0,96" stroke="${DRESS}" stroke-width="33" stroke-linecap="round"/>
        <rect x="-19" y="82" width="38" height="16" rx="7" fill="#fff" stroke="${INK}" stroke-width="3"/>
        <g transform="translate(0,102)">${hand()}</g>
      </g>
    </g>
  </g>`;

// צורות פה. כל אחת סביב (0,0) = מרכז השפתיים.
const LIP = '#D9475E';
const MOUTH_IN = '#7a2d33';
const mouths = () => `
  <g data-rig="mouth">
    <g data-v="X"><path d="M-25,-4 Q0,16 25,-4" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M-28,-7 q3,1 4,4 M28,-7 q-3,1 -4,4" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"/></g>
    <g data-v="M"><path d="M-21,0 Q0,8 21,0" fill="none" stroke="${LIP}" stroke-width="8" stroke-linecap="round"/>
      <path d="M-21,0 Q0,7 21,0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g>
    <g data-v="A"><path d="M-24,-7 Q0,-3 24,-7 Q22,30 0,32 Q-22,30 -24,-7 Z" fill="${MOUTH_IN}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M-20,-6 Q0,-3 20,-6 L18,1 Q0,4 -18,1 Z" fill="#fff"/>
      <ellipse cx="0" cy="22" rx="12" ry="7" fill="#EC8A8E"/></g>
    <g data-v="E"><path d="M-27,-5 Q0,-1 27,-5 Q22,16 0,17 Q-22,16 -27,-5 Z" fill="${MOUTH_IN}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M-22,-4 Q0,-1 22,-4 L20,3 Q0,6 -20,3 Z" fill="#fff"/>
      <ellipse cx="0" cy="11" rx="10" ry="4" fill="#EC8A8E"/></g>
    <g data-v="O"><ellipse cx="0" cy="6" rx="15" ry="19" fill="${MOUTH_IN}" stroke="${INK}" stroke-width="4"/>
      <ellipse cx="0" cy="16" rx="8" ry="5" fill="#EC8A8E"/></g>
    <g data-v="U"><ellipse cx="0" cy="3" rx="9" ry="9" fill="${MOUTH_IN}" stroke="${LIP}" stroke-width="6"/>
      <ellipse cx="0" cy="3" rx="9" ry="9" fill="none" stroke="${INK}" stroke-width="2.5"/></g>
    <g data-v="F"><path d="M-22,-4 Q0,0 22,-4 Q18,12 0,13 Q-18,12 -22,-4 Z" fill="${MOUTH_IN}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M-17,-3 Q0,0 17,-3 L16,6 Q0,8 -16,6 Z" fill="#fff"/>
      <path d="M-18,9 Q0,14 18,9" fill="none" stroke="${LIP}" stroke-width="5" stroke-linecap="round"/></g>
    <g data-v="W"><path d="M-30,-8 Q0,-2 30,-8 Q26,30 0,33 Q-26,30 -30,-8 Z" fill="${MOUTH_IN}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M-25,-7 Q0,-2 25,-7 L23,1 Q0,5 -23,1 Z" fill="#fff"/>
      <ellipse cx="0" cy="22" rx="14" ry="8" fill="#EC8A8E"/></g>
  </g>`;

const eye = (x, side) => `
  <g data-rig="eye-${side}" transform="translate(${x},-608)">
    <g data-rig="eye-open-${side}">
      <ellipse cx="0" cy="0" rx="17" ry="21" fill="#fff" stroke="${INK}" stroke-width="3.5"/>
      <g data-rig="pupil-${side}"><ellipse cx="0" cy="2" rx="11" ry="13" fill="${INK}"/>
        <circle cx="4" cy="-4" r="4.5" fill="#fff"/><circle cx="-4" cy="7" r="2" fill="#fff"/></g>
      <g data-rig="lid-${side}" style="display:none"><path d="M-19,-23 H19 V0 H-19 Z" fill="${SKIN}" stroke="none"/>
        <path d="M-17,0 Q0,7 17,0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/></g>
      <path d="M${side === 'l' ? '-15,-16 l-8,-6' : '15,-16 l8,-6'}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    </g>
    <path data-rig="eye-happy-${side}" d="M-15,4 Q0,-14 15,4" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" style="display:none"/>
  </g>`;

const brow = (x, side) => `
  <g data-rig="brow-${side}" transform="translate(${x},-640)">
    <path d="M-15,3 Q0,-6 15,3" fill="none" stroke="${HAIR_SH}" stroke-width="6" stroke-linecap="round"/>
  </g>`;

export const teacher = () => `
<g class="teacher" data-rig="root">
  <ellipse cx="0" cy="4" rx="150" ry="20" fill="${INK}" opacity=".18"/>
  <g data-rig="body">
    <!-- רגליים ונעליים -->
    <g data-rig="legs">
      <path d="M-34,-215 L-38,-22" stroke="${INK}" stroke-width="34" stroke-linecap="round"/>
      <path d="M34,-215 L38,-22" stroke="${INK}" stroke-width="34" stroke-linecap="round"/>
      <path d="M-34,-215 L-38,-22" stroke="#4C3A9A" stroke-width="27" stroke-linecap="round"/>
      <path d="M34,-215 L38,-22" stroke="#4C3A9A" stroke-width="27" stroke-linecap="round"/>
      <path d="M-70,-2 C-72,-28 -50,-36 -26,-30 C-14,-26 -12,-6 -16,2 Z" fill="${PINK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M70,-2 C72,-28 50,-36 26,-30 C14,-26 12,-6 16,2 Z" fill="${PINK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M-52,-30 l18,-4 M52,-30 l-18,-4" stroke="${INK}" stroke-width="3"/>
    </g>
    <g data-rig="torso">
      <!-- שמלה בגזרת A -->
      <path d="M-78,-470 C-96,-420 -120,-300 -138,-200 Q0,-176 138,-200 C120,-300 96,-420 78,-470 Q0,-492 -78,-470 Z" fill="${DRESS}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M40,-470 C64,-400 82,-300 92,-192 Q118,-196 138,-200 C120,-300 96,-420 78,-470 Z" fill="${DRESS_SH}" opacity=".55"/>
      ${stitch('M-126,-214 Q0,-192 126,-214')}
      ${stitch('M0,-468 L0,-200', 'rgba(42,26,94,.25)', 2.5)}
      <circle cx="0" cy="-420" r="8" fill="${PINK}" stroke="${INK}" stroke-width="2.5"/>
      <circle cx="0" cy="-370" r="8" fill="${PINK}" stroke="${INK}" stroke-width="2.5"/>
      <circle cx="0" cy="-320" r="8" fill="${PINK}" stroke="${INK}" stroke-width="2.5"/>
      <!-- כיס עם עפרון -->
      <path d="M50,-300 h48 l-4,44 q-20,8 -40,0 z" fill="${DRESS_SH}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <g transform="translate(66,-302) rotate(-12)"><rect x="-5" y="-38" width="10" height="40" rx="2" fill="#3FC1A5" stroke="${INK}" stroke-width="3"/>
        <path d="M-5,-38 L0,-50 L5,-38 Z" fill="#FFD9C0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></g>
      <!-- צווארון -->
      <path d="M-52,-478 Q-30,-440 0,-452 Q30,-440 52,-478 Q0,-462 -52,-478 Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    </g>
  </g>
  <!-- זרועות: מאחורי הראש, לפני הגוף -->
  <g transform="translate(-82,-452)"><g transform="scale(-1,1)">${arm('l')}</g></g>
  <g transform="translate(82,-452)">${arm('r')}</g>
  <g data-rig="head">
    <path d="M-18,-500 L-18,-462 Q0,-452 18,-462 L18,-500 Z" fill="${SKIN_SH}" stroke="${INK}" stroke-width="3.5"/>
    <!-- שיער מאחור: תלתלים וקוקיות -->
    <g fill="${HAIR}" stroke="${INK}" stroke-width="3.5">
      <circle cx="-104" cy="-640" r="40"/><circle cx="104" cy="-640" r="40"/>
      <circle cx="-96" cy="-580" r="34"/><circle cx="96" cy="-580" r="34"/>
      <circle cx="-86" cy="-530" r="26"/><circle cx="86" cy="-530" r="26"/>
    </g>
    <circle cx="-138" cy="-602" r="30" fill="${HAIR}" stroke="${INK}" stroke-width="3.5"/>
    <circle cx="138" cy="-602" r="30" fill="${HAIR}" stroke="${INK}" stroke-width="3.5"/>
    <path d="M-150,-612 q10,-14 24,-8 M126,-620 q14,-6 24,8" stroke="${HAIR_SH}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <!-- אוזניים ופנים -->
    <ellipse cx="-88" cy="-590" rx="14" ry="20" fill="${SKIN}" stroke="${INK}" stroke-width="3.5"/>
    <ellipse cx="88" cy="-590" rx="14" ry="20" fill="${SKIN}" stroke="${INK}" stroke-width="3.5"/>
    <circle cx="-88" cy="-568" r="5" fill="${PINK}" stroke="${INK}" stroke-width="2"/><circle cx="88" cy="-568" r="5" fill="${PINK}" stroke="${INK}" stroke-width="2"/>
    <path d="M-88,-628 C-92,-700 92,-700 88,-628 C92,-560 60,-512 0,-508 C-60,-512 -92,-560 -88,-628 Z" fill="${SKIN}" stroke="${INK}" stroke-width="4.5"/>
    <ellipse cx="-44" cy="-664" rx="20" ry="10" fill="#fff" opacity=".35" transform="rotate(-20 -44 -664)"/>
    <g data-rig="face">
      ${brow(-38, 'l')}${brow(38, 'r')}
      ${eye(-38, 'l')}${eye(38, 'r')}
      <path d="M-2,-588 q8,10 -2,16" fill="none" stroke="${SKIN_SH}" stroke-width="4" stroke-linecap="round"/>
      <ellipse class="blush" cx="-60" cy="-566" rx="16" ry="11" fill="#FF6FA3" opacity=".55"/>
      <ellipse class="blush" cx="60" cy="-566" rx="16" ry="11" fill="#FF6FA3" opacity=".55"/>
      <circle cx="-66" cy="-572" r="2" fill="#E2522A" opacity=".5"/><circle cx="-58" cy="-562" r="2" fill="#E2522A" opacity=".5"/>
      <circle cx="62" cy="-572" r="2" fill="#E2522A" opacity=".5"/><circle cx="70" cy="-562" r="2" fill="#E2522A" opacity=".5"/>
      <g transform="translate(0,-548)">${mouths()}</g>
    </g>
    <!-- פוני -->
    <path d="M-92,-626 C-96,-700 -40,-722 0,-716 C44,-722 96,-700 92,-626 C80,-660 60,-668 44,-660 C34,-680 6,-684 -6,-666 C-24,-684 -56,-680 -64,-656 C-74,-664 -86,-650 -92,-626 Z" fill="${HAIR}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-40,-700 q-10,14 -6,30 M20,-706 q-6,12 -2,26" stroke="${HAIR_SH}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <!-- כומתה -->
    <g data-rig="beret" transform="rotate(-9 -10 -722)">
      <ellipse cx="-10" cy="-722" rx="100" ry="32" fill="${BERET}" stroke="${INK}" stroke-width="4.5"/>
      <path d="M-104,-716 Q-10,-692 86,-716" fill="none" stroke="#5B3FD9" stroke-width="6" stroke-linecap="round"/>
      <rect x="-17" y="-768" width="13" height="20" rx="5" fill="${BERET}" stroke="${INK}" stroke-width="3.5"/>
      ${stitch('M-86,-728 C-40,-746 30,-746 74,-730', 'rgba(255,255,255,.5)')}
      <circle cx="58" cy="-706" r="9" fill="${PINK}" stroke="${INK}" stroke-width="2.5"/>
    </g>
  </g>
</g>`;

// קלף תמונה שהמורה מראה (אביזר)
export const card = (emoji, label) => `
<g class="t-card">
  <rect x="-95" y="-120" width="190" height="230" rx="22" fill="#fff" stroke="${INK}" stroke-width="5"/>
  ${stitch('M-80,-104 H80 V94 H-80 Z', 'rgba(42,26,94,.25)', 2.5)}
  <text x="0" y="10" font-size="110" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  ${label ? `<text x="0" y="86" font-size="32" font-weight="700" text-anchor="middle" fill="${INK}" font-family="Fredoka, Rubik, sans-serif">${label}</text>` : ''}
</g>`;
