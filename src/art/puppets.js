// דמויות ואביזרים כ-SVG בסגנון בובות לבד: צורות רכות, תפרים מקווקווים, כפתורי עיניים.
// כל דמות מצוירת סביב (0,0) = נקודת הבסיס התחתונה. קבוצות-משנה מקבלות מחלקות לאנימציה.

const INK = '#2A1A5E';
const stitch = (d, c = 'rgba(255,255,255,.55)', w = 3) =>
  `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-dasharray="7 6" stroke-linecap="round"/>`;

const eyes = (x1, x2, y, r0 = 15) => {
  const r = r0 * 1.35;
  const one = (x) => `<g class="eye"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.12}" fill="#fff" stroke="${INK}" stroke-width="3.5"/>
      <g class="pupil"><ellipse cx="${x + 1}" cy="${y + 3}" rx="${r * 0.62}" ry="${r * 0.7}" fill="${INK}"/>
      <circle cx="${x + r * 0.28}" cy="${y - r * 0.18}" r="${r * 0.24}" fill="#fff"/><circle cx="${x - r * 0.22}" cy="${y + r * 0.32}" r="${r * 0.11}" fill="#fff"/></g></g>`;
  return `<g class="eyes">${one(x1)}${one(x2)}
    <g class="lids"><ellipse cx="${x1}" cy="${y}" rx="${r + 2}" ry="${r * 1.12 + 2}" fill="var(--lid)" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="${x2}" cy="${y}" rx="${r + 2}" ry="${r * 1.12 + 2}" fill="var(--lid)" stroke="${INK}" stroke-width="3"/></g></g>`;
};

const mouth = (x, y, w = 34) => `
  <g class="mouth">
    <path class="m-closed" d="M${x - w / 2},${y} Q${x},${y + w * 0.55} ${x + w / 2},${y}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <g class="m-open"><ellipse cx="${x}" cy="${y + 6}" rx="${w * 0.42}" ry="${w * 0.38}" fill="#7a2d33" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="${x}" cy="${y + 14}" rx="${w * 0.25}" ry="${w * 0.14}" fill="#e98a8a"/></g>
    <path class="m-oops" d="M${x - w / 2},${y + 8} q${w / 4},-9 ${w / 2},0 q${w / 4},9 ${w / 2},0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  </g>`;

const extras = (x, y) => `
  <g class="sweat"><path d="M${x},${y} q10,16 0,24 q-10,-8 0,-24z" fill="#9fd3e6" stroke="${INK}" stroke-width="2"/></g>
  <g class="zz"><text x="${x}" y="${y - 10}" font-size="34" fill="${INK}" font-family="Fredoka, sans-serif" font-weight="700">z</text></g>`;

// ---------- מיקה: במאית הסטודיו ----------
export const mika = () => `
<g class="puppet mika">
  <g class="body">
    <path d="M-95,0 C-100,-110 -80,-165 0,-170 C80,-165 100,-110 95,0 Z" fill="#FFD23F" stroke="${INK}" stroke-width="4"/><ellipse class="gloss" cx="-55" cy="-120" rx="14" ry="34" fill="#fff" opacity=".4" transform="rotate(-20 -55 -120)"/>
    ${stitch('M-88,-55 C-40,-62 40,-62 88,-55')}${stitch('M-80,-105 C-40,-112 40,-112 80,-105')}
    <circle cx="0" cy="-138" r="9" fill="#FF4F8B"/><circle cx="0" cy="-80" r="9" fill="#FF4F8B"/>
  </g>
  <g class="arm-l"><path d="M-78,-140 C-130,-120 -140,-70 -125,-40" fill="none" stroke="#FFD23F" stroke-width="30" stroke-linecap="round"/>
    <circle cx="-125" cy="-36" r="19" fill="#FFD9C0" stroke="${INK}" stroke-width="3"/></g>
  <g class="arm-r"><path d="M78,-140 C125,-150 145,-190 140,-215" fill="none" stroke="#FFD23F" stroke-width="30" stroke-linecap="round"/>
    <g transform="translate(140,-240) rotate(-12)">
      <rect x="-38" y="-10" width="76" height="52" rx="6" fill="#2f2b36" stroke="${INK}" stroke-width="3"/>
      <rect x="-38" y="-26" width="76" height="16" rx="3" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <path d="M-26,-26 l10,16 M-4,-26 l10,16 M18,-26 l10,16" stroke="${INK}" stroke-width="6"/>
      ${stitch('M-28,8 H28 M-28,24 H10', 'rgba(255,255,255,.6)', 2)}
    </g>
    <circle cx="140" cy="-218" r="19" fill="#FFD9C0" stroke="${INK}" stroke-width="3"/></g>
  <g class="head">
    <g fill="#FF6B3D" stroke="${INK}" stroke-width="3">
      <circle cx="-78" cy="-262" r="34"/><circle cx="78" cy="-262" r="34"/><circle cx="-70" cy="-212" r="28"/><circle cx="70" cy="-212" r="28"/>
    </g>
    <circle cx="0" cy="-250" r="86" fill="#FFD9C0" stroke="${INK}" stroke-width="4"/><ellipse class="gloss" cx="-42" cy="-292" rx="22" ry="12" fill="#fff" opacity=".4" transform="rotate(-20 -42 -292)"/>
    <path d="M-80,-285 C-60,-345 60,-345 80,-285 C40,-300 -20,-300 -80,-285Z" fill="#FF6B3D" stroke="${INK}" stroke-width="3"/>
    <g class="beret"><ellipse cx="-12" cy="-330" rx="86" ry="28" fill="#7B5CFF" stroke="${INK}" stroke-width="4" transform="rotate(-8 -12 -330)"/>
      <rect x="-18" y="-372" width="12" height="18" rx="5" fill="#7B5CFF" stroke="${INK}" stroke-width="3"/>
      ${stitch('M-80,-322 C-40,-306 30,-310 66,-330', 'rgba(255,255,255,.45)')}</g>
    ${eyes(-30, 30, -258, 15)}
    <circle class="blush" cx="-52" cy="-222" r="15" fill="#FF6FA3" opacity=".75"/><circle class="blush" cx="52" cy="-222" r="15" fill="#FF6FA3" opacity=".75"/>
    ${mouth(0, -214, 36)}
    ${extras(72, -300)}
  </g>
</g>`;

// ---------- טוטו: כלבלב גרב ----------
export const toto = () => `
<g class="puppet toto">
  <g class="body">
    <path d="M-70,0 C-78,-80 -70,-150 -55,-175 L55,-175 C70,-150 78,-80 70,0Z" fill="#FFF7EA" stroke="${INK}" stroke-width="4"/>
    <path d="M10,-130 C40,-140 60,-110 50,-80 C30,-70 5,-90 10,-130Z" fill="#FFB347" opacity=".85"/>
    ${stitch('M-62,-20 H62', 'rgba(150,110,80,.6)')}
    <path class="tail" d="M62,-40 C100,-50 110,-90 95,-105" fill="none" stroke="#FFF7EA" stroke-width="18" stroke-linecap="round"/>
  </g>
  <g class="head">
    <g class="ear-l"><path d="M-68,-262 C-118,-250 -122,-170 -98,-140 C-80,-150 -72,-200 -50,-240Z" fill="#FF8C42" stroke="${INK}" stroke-width="4"/></g>
    <g class="ear-r"><path d="M68,-262 C118,-250 122,-170 98,-140 C80,-150 72,-200 50,-240Z" fill="#FF8C42" stroke="${INK}" stroke-width="4"/></g>
    <ellipse cx="0" cy="-232" rx="82" ry="74" fill="#FFF7EA" stroke="${INK}" stroke-width="4"/><ellipse class="gloss" cx="-40" cy="-275" rx="20" ry="11" fill="#fff" opacity=".4" transform="rotate(-20 -40 -275)"/>
    <ellipse cx="-34" cy="-260" rx="26" ry="22" fill="#FFB347" opacity=".8"/>
    ${eyes(-30, 30, -255, 14)}
    <ellipse cx="0" cy="-210" rx="22" ry="15" fill="${INK}"/><ellipse cx="-6" cy="-214" rx="6" ry="4" fill="#fff" opacity=".7"/>
    ${mouth(0, -190, 30)}
    <path class="tongue" d="M-9,-182 q9,30 18,0z" fill="#e98a8a" stroke="${INK}" stroke-width="2"/>
    ${extras(70, -300)}
  </g>
  <g class="collar"><path d="M-62,-168 C-20,-150 20,-150 62,-168" fill="none" stroke="#3BA3FF" stroke-width="16" stroke-linecap="round"/>
    <circle cx="0" cy="-152" r="12" fill="#f2c14e" stroke="${INK}" stroke-width="3"/></g>
  <g class="arm-l"><ellipse cx="-62" cy="-70" rx="20" ry="34" fill="#FFF7EA" stroke="${INK}" stroke-width="3"/></g>
  <g class="arm-r"><ellipse cx="62" cy="-70" rx="20" ry="34" fill="#FFF7EA" stroke="${INK}" stroke-width="3"/></g>
</g>`;

// ---------- בום: גוש קצב ----------
export const bum = () => `
<g class="puppet bum">
  <g class="body">
    <ellipse cx="-45" cy="-6" rx="24" ry="12" fill="#14A37F" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="45" cy="-6" rx="24" ry="12" fill="#14A37F" stroke="${INK}" stroke-width="3"/>
    <path d="M-100,-20 C-120,-110 -70,-175 0,-175 C70,-175 120,-110 100,-20 C70,0 -70,0 -100,-20Z" fill="#22D3A6" stroke="${INK}" stroke-width="4"/><ellipse class="gloss" cx="-62" cy="-118" rx="16" ry="30" fill="#fff" opacity=".4" transform="rotate(-20 -62 -118)"/>
    <ellipse cx="0" cy="-168" rx="70" ry="18" fill="#FFD23F" stroke="${INK}" stroke-width="4"/>
    ${stitch('M-62,-168 a62,12 0 0 0 124,0', 'rgba(120,80,20,.5)')}
    <g fill="#FF4F8B" stroke="${INK}" stroke-width="2.5"><circle cx="-60" cy="-70" r="10"/><circle cx="70" cy="-100" r="8"/><circle cx="40" cy="-40" r="7"/></g>
  </g>
  <g class="head">
    ${eyes(-28, 28, -110, 12)}
    ${mouth(0, -78, 30)}
    ${extras(80, -150)}
  </g>
  <g class="arm-l"><path d="M-96,-80 q-40,-10 -46,-40" fill="none" stroke="#22D3A6" stroke-width="18" stroke-linecap="round"/></g>
  <g class="arm-r"><path d="M96,-80 q40,-10 46,-40" fill="none" stroke="#22D3A6" stroke-width="18" stroke-linecap="round"/></g>
</g>`;

// ---------- לולו: ג׳ירפה סרוגה ----------
export const lulu = () => `
<g class="puppet lulu">
  <g class="body">
    <ellipse cx="0" cy="-70" rx="110" ry="80" fill="#FFC93C" stroke="${INK}" stroke-width="4"/>
    <g fill="#FF8C42" opacity=".85"><circle cx="-50" cy="-90" r="18"/><circle cx="20" cy="-110" r="14"/><circle cx="50" cy="-55" r="20"/><circle cx="-20" cy="-40" r="12"/></g>
  </g>
  <g class="neck-group">
    <path d="M-34,-130 C-40,-230 -30,-310 -26,-360 L26,-360 C30,-310 40,-230 34,-130Z" fill="#FFC93C" stroke="${INK}" stroke-width="4"/>
    <g fill="#FF8C42" opacity=".85"><circle cx="-8" cy="-300" r="11"/><circle cx="12" cy="-250" r="13"/><circle cx="-12" cy="-200" r="10"/></g>
    <g class="scarf"><path d="M-44,-170 C-10,-150 10,-150 44,-170 L44,-140 C10,-120 -10,-120 -44,-140Z" fill="#FF4F8B" stroke="${INK}" stroke-width="3"/>
      <path d="M20,-140 l18,70 l-30,4z" fill="#FF4F8B" stroke="${INK}" stroke-width="3"/>
      ${stitch('M-40,-155 C-10,-135 10,-135 40,-155', 'rgba(255,255,255,.7)')}</g>
    <g class="head">
      <path d="M-26,-430 l-6,-40 M26,-430 l6,-40" stroke="#FF8C42" stroke-width="10" stroke-linecap="round"/>
      <circle cx="-32" cy="-474" r="11" fill="#FF8C42"/><circle cx="32" cy="-474" r="11" fill="#FF8C42"/>
      <ellipse class="ear-l" cx="-74" cy="-418" rx="30" ry="14" fill="#FFC93C" stroke="${INK}" stroke-width="3" transform="rotate(-20 -74 -418)"/>
      <ellipse class="ear-r" cx="74" cy="-418" rx="30" ry="14" fill="#FFC93C" stroke="${INK}" stroke-width="3" transform="rotate(20 74 -418)"/>
      <ellipse cx="0" cy="-395" rx="64" ry="74" fill="#FFC93C" stroke="${INK}" stroke-width="4"/><ellipse class="gloss" cx="-28" cy="-440" rx="16" ry="10" fill="#fff" opacity=".4" transform="rotate(-20 -28 -440)"/>
      <ellipse cx="0" cy="-348" rx="48" ry="32" fill="#FFE9A8" stroke="${INK}" stroke-width="3"/>
      <circle cx="-14" cy="-352" r="5" fill="${INK}"/><circle cx="14" cy="-352" r="5" fill="${INK}"/>
      ${eyes(-26, 26, -410, 14)}
      <circle class="blush" cx="-48" cy="-372" r="11" fill="#FF6FA3" opacity=".75"/><circle class="blush" cx="48" cy="-372" r="11" fill="#FF6FA3" opacity=".75"/>
      ${mouth(0, -334, 28)}
      ${extras(56, -460)}
    </g>
  </g>
  <g class="arm-l"><path d="M-96,-90 C-130,-60 -128,-30 -112,-10" fill="none" stroke="#FFC93C" stroke-width="24" stroke-linecap="round"/></g>
  <g class="arm-r"><path d="M96,-90 C130,-60 128,-30 112,-10" fill="none" stroke="#FFC93C" stroke-width="24" stroke-linecap="round"/></g>
</g>`;

// ---------- מר ינשוף: אורח הביקור החוזר ----------
export const owl = () => `
<g class="puppet owl">
  <g class="body">
    <path d="M-110,0 C-130,-160 -90,-300 0,-300 C90,-300 130,-160 110,0Z" fill="#8B6CF6" stroke="${INK}" stroke-width="4"/><ellipse class="gloss" cx="-62" cy="-220" rx="18" ry="36" fill="#fff" opacity=".4" transform="rotate(-20 -62 -220)"/>
    <path d="M-70,-10 C-80,-120 -50,-190 0,-190 C50,-190 80,-120 70,-10Z" fill="#FFE29A" stroke="${INK}" stroke-width="3"/>
    ${stitch('M-50,-150 q12,12 25,0 q12,12 25,0 q12,12 25,0', 'rgba(255,170,60,.8)')}
    ${stitch('M-58,-100 q12,12 25,0 q12,12 25,0 q12,12 25,0 q12,12 25,0', 'rgba(255,170,60,.8)')}
  </g>
  <g class="head">
    <path d="M-80,-280 l-20,-50 l50,25z M80,-280 l20,-50 l-50,25z" fill="#8B6CF6" stroke="${INK}" stroke-width="3"/>
    ${eyes(-42, 42, -230, 22)}
    <g fill="none" stroke="#2A1A5E" stroke-width="6"><circle cx="-42" cy="-230" r="34"/><circle cx="42" cy="-230" r="34"/><path d="M-8,-232 h16"/></g>
    <path d="M-12,-196 l12,22 l12,-22z" fill="#f2a541" stroke="${INK}" stroke-width="3"/>
    <g class="mouth"><path class="m-closed" d="M0,0"/><g class="m-open"><path d="M-12,-190 l12,30 l12,-30z" fill="#f2a541" stroke="${INK}" stroke-width="3"/></g><path class="m-oops" d="M0,0"/></g>
    ${extras(80, -300)}
  </g>
  <g class="arm-l"><path d="M-104,-170 C-150,-130 -150,-60 -120,-30 C-110,-80 -100,-120 -104,-170Z" fill="#6A4EE0" stroke="${INK}" stroke-width="3"/></g>
  <g class="arm-r"><path d="M104,-170 C150,-130 150,-60 120,-30 C110,-80 100,-120 104,-170Z" fill="#6A4EE0" stroke="${INK}" stroke-width="3"/></g>
</g>`;

export const CAST = { mika, toto, bum, lulu, owl };

// ---------- אביזרים ----------
let uid = 0;

// ---------- חיות (משחק "עולם החיות") ----------
const ae = (x, y, r = 9) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="${x + 1}" cy="${y + 1}" r="${r * 0.55}" fill="${INK}"/><circle cx="${x + 3}" cy="${y - 2}" r="${r * 0.2}" fill="#fff"/>`;
const blush = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="5" fill="#FF7A9C" opacity=".55"/>`;
const ANIMALS = {
  cow: () => `<path d="M-46,-40 C-60,-62 -54,-74 -44,-70 M46,-40 C60,-62 54,-74 44,-70" stroke="${INK}" stroke-width="10" stroke-linecap="round" fill="none"/>
    <path d="M-46,-40 C-60,-62 -54,-74 -44,-70 M46,-40 C60,-62 54,-74 44,-70" stroke="#F3E3C3" stroke-width="5" stroke-linecap="round" fill="none"/>
    <ellipse cx="-62" cy="-22" rx="20" ry="11" fill="#fff" stroke="${INK}" stroke-width="3.5" transform="rotate(-20 -62 -22)"/><ellipse cx="62" cy="-22" rx="20" ry="11" fill="#fff" stroke="${INK}" stroke-width="3.5" transform="rotate(20 62 -22)"/>
    <path d="M-48,-30 C-50,-62 50,-62 48,-30 C52,0 46,40 0,44 C-46,40 -52,0 -48,-30Z" fill="#fff" stroke="${INK}" stroke-width="4"/>
    <path d="M-48,-30 C-44,-50 -20,-56 -14,-44 C-10,-28 -34,-16 -46,-14Z" fill="${INK}"/><path d="M30,-2 C40,-8 50,0 47,12 C40,16 30,10 30,-2Z" fill="${INK}"/>
    <ellipse cy="26" rx="38" ry="24" fill="#FFB3BC" stroke="${INK}" stroke-width="4"/><ellipse cx="-13" cy="26" rx="5" ry="7" fill="${INK}"/><ellipse cx="13" cy="26" rx="5" ry="7" fill="${INK}"/>
    ${ae(-20, -18, 10)}${ae(20, -18, 10)}`,
  dog: () => `<path d="M-40,-46 C-74,-50 -80,0 -62,22 C-50,30 -40,10 -38,-10Z" fill="#8B5A2B" stroke="${INK}" stroke-width="4"/><path d="M40,-46 C74,-50 80,0 62,22 C50,30 40,10 38,-10Z" fill="#8B5A2B" stroke="${INK}" stroke-width="4"/>
    <path d="M-44,-20 C-46,-60 46,-60 44,-20 C48,20 30,48 0,48 C-30,48 -48,20 -44,-20Z" fill="#E8B57A" stroke="${INK}" stroke-width="4"/>
    <ellipse cx="22" cy="-22" rx="14" ry="16" fill="#8B5A2B" opacity=".7"/>
    <ellipse cy="18" rx="24" ry="18" fill="#FFF1DC"/><ellipse cy="8" rx="11" ry="8" fill="${INK}"/><path d="M0,16 V24 M-10,28 C-4,34 4,34 10,28" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M-6,32 C-6,46 6,46 6,32Z" fill="#FF6B8A" stroke="${INK}" stroke-width="2.5"/>${ae(-18, -14)}${ae(20, -14)}`,
  cat: () => `<path d="M-46,-14 L-50,-66 L-14,-42Z M46,-14 L50,-66 L14,-42Z" fill="#FF9F43" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-42,-26 L-44,-54 L-24,-40Z M42,-26 L44,-54 L24,-40Z" fill="#FFB3BC"/>
    <ellipse cy="0" rx="52" ry="44" fill="#FF9F43" stroke="${INK}" stroke-width="4"/>
    <path d="M-10,-42 l4,14 M0,-44 v14 M10,-42 l-4,14" stroke="#D9711C" stroke-width="5" stroke-linecap="round"/>
    ${ae(-20, -6, 10)}${ae(20, -6, 10)}<path d="M-6,10 L6,10 L0,17Z" fill="#FF6B8A" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M0,17 C-4,24 -12,24 -14,20 M0,17 C4,24 12,24 14,20" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M-24,14 H-62 M-24,20 L-58,28 M24,14 H62 M24,20 L58,28" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>${blush(-34, 12)}${blush(34, 12)}`,
  duck: () => `<path d="M-50,10 C-60,50 40,58 56,20 C62,4 48,-6 34,4 C10,18 -20,0 -50,10Z" fill="#FFD23F" stroke="${INK}" stroke-width="4"/>
    <path d="M-30,18 C-14,34 10,34 20,20" stroke="#E8A800" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="-26" cy="-26" r="30" fill="#FFD23F" stroke="${INK}" stroke-width="4"/>
    <path d="M-56,-24 C-80,-30 -84,-12 -70,-8 C-62,-6 -56,-12 -52,-14Z" fill="#FF8C42" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    ${ae(-30, -32, 8)}${blush(-14, -16)}<path d="M-30,-56 C-26,-66 -18,-64 -16,-56" stroke="${INK}" stroke-width="3" fill="none"/>`,
  lion: () => `<g fill="#D9711C" stroke="${INK}" stroke-width="4">${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<circle cx="${(Math.cos(a) * 46).toFixed(1)}" cy="${(Math.sin(a) * 46).toFixed(1)}" r="22"/>`; }).join('')}</g>
    <circle r="48" fill="#D9711C"/>
    <circle cx="-30" cy="-34" r="11" fill="#FFC94D" stroke="${INK}" stroke-width="3"/><circle cx="30" cy="-34" r="11" fill="#FFC94D" stroke="${INK}" stroke-width="3"/>
    <circle r="40" fill="#FFC94D" stroke="${INK}" stroke-width="4"/>
    ${ae(-15, -10, 9)}${ae(15, -10, 9)}<ellipse cy="14" rx="18" ry="13" fill="#FFF1DC"/><path d="M-8,6 L8,6 L0,14Z" fill="${INK}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M0,14 V20 M-10,22 C-4,28 4,28 10,22" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>${blush(-26, 10)}${blush(26, 10)}`,
  fish: () => `<path d="M40,0 L70,-30 C74,-10 74,10 70,30Z" fill="#FF8C42" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-62,0 C-50,-40 20,-46 46,0 C20,46 -50,40 -62,0Z" fill="#4FA3FF" stroke="${INK}" stroke-width="4"/>
    <path d="M-10,-34 C0,-52 20,-50 24,-30" fill="#FF8C42" stroke="${INK}" stroke-width="3.5"/>
    <path d="M-6,-24 C4,-8 4,8 -6,24 M10,-26 C20,-8 20,8 10,26" stroke="#9FD0FF" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${ae(-36, -6, 9)}<path d="M-58,8 C-54,14 -48,14 -46,10" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <g fill="#B8F0FF" stroke="${INK}" stroke-width="2"><circle cx="-70" cy="-30" r="6"/><circle cx="-62" cy="-48" r="4"/></g>`,
  bird: () => `<path d="M-30,46 l-4,14 M-14,48 l0,14" stroke="#FF8C42" stroke-width="5" stroke-linecap="round"/>
    <path d="M30,0 L66,-14 L58,10Z" fill="#4FA3FF" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <ellipse cx="-6" cy="4" rx="48" ry="44" fill="#4FA3FF" stroke="${INK}" stroke-width="4"/>
    <ellipse cx="-12" cy="22" rx="28" ry="20" fill="#B8E2FF"/>
    <path d="M6,-2 C30,-6 40,20 18,30 C8,24 4,10 6,-2Z" fill="#2D7DD2" stroke="${INK}" stroke-width="3"/>
    <path d="M-6,-40 C-4,-56 8,-58 10,-46 M-6,-40 C-14,-54 -24,-50 -20,-40" stroke="${INK}" stroke-width="3" fill="#4FA3FF"/>
    ${ae(-22, -12, 9)}<path d="M-50,-4 L-68,2 L-50,10Z" fill="#FFD23F" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>${blush(-30, 6)}`,
  frog: () => `<ellipse cy="14" rx="58" ry="38" fill="#4CC66B" stroke="${INK}" stroke-width="4"/>
    <circle cx="-28" cy="-24" r="22" fill="#4CC66B" stroke="${INK}" stroke-width="4"/><circle cx="28" cy="-24" r="22" fill="#4CC66B" stroke="${INK}" stroke-width="4"/>
    ${ae(-28, -26, 13)}${ae(28, -26, 13)}
    <path d="M-34,14 C-20,34 20,34 34,14" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
    ${blush(-40, 8)}${blush(40, 8)}<g fill="#2E9E4F"><circle cx="-20" cy="36" r="5"/><circle cx="16" cy="40" r="4"/><circle cx="40" cy="30" r="3"/></g>`,
  horse: () => `<path d="M-20,-50 L-12,-72 L0,-52 M14,-50 L22,-72 L30,-50" fill="#B5733A" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-28,-44 C-6,-60 30,-58 36,-34 C40,-10 36,20 26,44 C18,60 -20,60 -24,44 C-30,20 -40,-30 -28,-44Z" fill="#C98B4E" stroke="${INK}" stroke-width="4"/>
    <path d="M-30,-48 C-44,-30 -46,0 -40,24 C-52,0 -54,-40 -30,-48Z M-20,-56 C-30,-66 -10,-70 -4,-58" fill="#5A3825" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="2" cy="40" rx="30" ry="20" fill="#E8C49A" stroke="${INK}" stroke-width="3.5"/><ellipse cx="-8" cy="40" rx="4" ry="6" fill="${INK}"/><ellipse cx="12" cy="40" rx="4" ry="6" fill="${INK}"/>
    ${ae(-10, -16, 9)}${ae(22, -16, 9)}<path d="M2,-36 l0,12" stroke="#fff" stroke-width="10" stroke-linecap="round"/>`,
  sheep: () => `<g fill="#fff" stroke="${INK}" stroke-width="3.5">${[[-40, -20], [-20, -44], [10, -48], [38, -30], [50, 0], [40, 30], [10, 44], [-22, 42], [-48, 18]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="24"/>`).join('')}</g>
    <circle r="46" fill="#fff"/>
    <ellipse cx="-36" cy="-4" rx="16" ry="9" fill="#5A4A6E" stroke="${INK}" stroke-width="3" transform="rotate(25 -36 -4)"/><ellipse cx="36" cy="-4" rx="16" ry="9" fill="#5A4A6E" stroke="${INK}" stroke-width="3" transform="rotate(-25 36 -4)"/>
    <ellipse cy="6" rx="26" ry="32" fill="#5A4A6E" stroke="${INK}" stroke-width="4"/>
    <g fill="#fff" stroke="${INK}" stroke-width="3"><circle cx="-12" cy="-26" r="10"/><circle cx="4" cy="-30" r="11"/><circle cx="16" cy="-24" r="9"/></g>
    ${ae(-10, 0, 8)}${ae(10, 0, 8)}<path d="M-6,20 C-2,26 2,26 6,20" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>${blush(-16, 14)}${blush(16, 14)}`,
};

export function prop(id, opts = {}) {
  if (ANIMALS[id]) return `<g class="prop animal ${id}">${ANIMALS[id]()}</g>`;
  const k = ++uid;
  switch (id) {
    case 'apple': return `<g class="prop apple">
      <path d="M0,-38 C-30,-58 -62,-34 -58,4 C-54,40 -24,58 0,46 C24,58 54,40 58,4 C62,-34 30,-58 0,-38Z" fill="#FF3B5C" stroke="${INK}" stroke-width="4"/>
      <path d="M-34,-18 C-40,-4 -38,10 -32,20" stroke="rgba(255,255,255,.6)" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M0,-38 C2,-52 6,-60 12,-66" stroke="#6b4226" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M8,-52 C24,-70 44,-62 46,-56 C34,-42 16,-44 8,-52Z" fill="#6aa84f" stroke="${INK}" stroke-width="3"/></g>`;
    case 'banana': return `<g class="prop banana">
      <path d="M-58,-30 C-50,30 30,52 62,10 C64,0 56,-4 50,4 C24,30 -26,16 -40,-34 Z" fill="#FFE03D" stroke="${INK}" stroke-width="4"/>
      ${stitch('M-46,-18 C-30,20 20,30 48,10', 'rgba(170,120,20,.5)')}
      <path d="M-58,-30 l-6,-12 l14,2z" fill="#6b4226" stroke="${INK}" stroke-width="3"/>
      <circle cx="58" cy="8" r="5" fill="#6b4226"/></g>`;
    case 'cookie': return `<g class="prop cookie">
      <circle r="52" fill="#F2A65A" stroke="${INK}" stroke-width="4"/>
      ${stitch('M-38,0 a38,38 0 1 0 76,0 a38,38 0 1 0 -76,0', 'rgba(120,70,30,.4)')}
      <g fill="#5a3825"><circle cx="-18" cy="-16" r="7"/><circle cx="16" cy="-22" r="6"/><circle cx="22" cy="12" r="8"/><circle cx="-12" cy="20" r="6"/><circle cx="2" cy="-2" r="5"/></g></g>`;
    case 'water': return glass('#5ED0FF', 'water', k, `<g fill="#fff" opacity=".8"><circle cx="-10" cy="10" r="4"/><circle cx="8" cy="22" r="3"/><circle cx="2" cy="-4" r="3"/></g>`);
    case 'juice': return glass('#f59e2d', 'juice', k, `<path d="M14,-62 l18,-34" stroke="#e05f7e" stroke-width="8" stroke-linecap="round"/>
      <g transform="translate(-30,-52)"><circle r="18" fill="#f8c35a" stroke="${INK}" stroke-width="3"/><path d="M0,-14 v28 M-14,0 h28 M-10,-10 l20,20 M10,-10 l-20,20" stroke="#f59e2d" stroke-width="2"/></g>`);
    case 'milk': return `<g class="prop milk">
      <path d="M-30,-30 L-30,48 C-30,56 30,56 30,48 L30,-30 L18,-50 L-18,-50Z" fill="#fffdf6" stroke="${INK}" stroke-width="4"/>
      <rect x="-20" y="-70" width="40" height="22" rx="6" fill="#4a7cc9" stroke="${INK}" stroke-width="3"/>
      <rect x="-30" y="0" width="60" height="26" fill="#4a7cc9" opacity=".85"/>
      <path d="M-14,-24 C-4,-30 10,-22 6,-10 C-4,-4 -18,-12 -14,-24Z" fill="${INK}" opacity=".75"/>
      ${stitch('M-24,40 H24', 'rgba(74,124,201,.6)', 2)}</g>`;
    case 'shoe': return `<g class="prop shoe">
      <path d="M-62,20 C-64,-10 -50,-38 -30,-40 C-20,-20 0,-14 14,-14 C40,-10 64,0 64,22 C64,34 -62,34 -62,20Z" fill="#7B5CFF" stroke="${INK}" stroke-width="4"/>
      <rect x="-64" y="20" width="128" height="14" rx="7" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <path d="M-30,-28 l14,10 M-22,-36 l14,10 M-12,-22 l14,8" stroke="#fff" stroke-width="5" stroke-linecap="round"/></g>`;
    case 'sock': return `<g class="prop sock">
      <path d="M-20,-56 L22,-56 L22,10 C22,40 -10,52 -40,46 C-62,40 -60,14 -36,10 L-20,4Z" fill="#e05f7e" stroke="${INK}" stroke-width="4"/>
      <path d="M-20,-36 H22 M-20,-16 H22" stroke="#fff" stroke-width="8"/></g>`;
    case 'cup': {
      const c = opts.color || '#4a7cc9';
      const fill = opts.fill || '#fffdf6';
      return `<g class="prop cup">
        <defs><clipPath id="cupclip${k}"><path d="M-40,-40 L-32,44 C-30,54 30,54 32,44 L40,-40Z"/></clipPath></defs>
        <path d="M38,-20 C70,-20 70,30 34,26" fill="none" stroke="${c}" stroke-width="12"/>
        <path d="M-40,-40 L-32,44 C-30,54 30,54 32,44 L40,-40Z" fill="#fff" stroke="${INK}" stroke-width="4"/>
        <g clip-path="url(#cupclip${k})"><rect class="cup-fill" x="-50" y="-40" width="100" height="100" fill="${fill}" style="transform: translateY(100px)"/></g>
        <path d="M-40,-40 L-32,44 C-30,54 30,54 32,44 L40,-40Z" fill="none" stroke="${INK}" stroke-width="4"/>
        <rect x="-41" y="-8" width="82" height="16" fill="${c}" opacity=".9"/>
      </g>`;
    }
    case 'tray': return `<g class="prop tray"><ellipse rx="150" ry="34" fill="#b98b5e" stroke="${INK}" stroke-width="4"/>
      ${stitch('M-130,0 a130,24 0 1 0 260,0 a130,24 0 1 0 -260,0', 'rgba(255,255,255,.4)')}</g>`;
    case 'crate': return `<g class="prop crate">
      <g class="crate-lid"><rect x="-120" y="-92" width="240" height="30" rx="8" fill="#c98b5e" stroke="${INK}" stroke-width="4"/></g>
      <rect x="-110" y="-64" width="220" height="120" rx="10" fill="#F2A65A" stroke="${INK}" stroke-width="4"/>
      ${stitch('M-96,-30 H96 M-96,14 H96', 'rgba(110,70,40,.5)')}
      <text y="40" text-anchor="middle" font-size="40" fill="#7a4b2a" font-family="Fredoka, sans-serif" font-weight="800">?</text></g>`;
    case 'swatch': return `<g class="prop swatch"><circle r="62" fill="url(#cloth-${opts.pattern})" stroke="${INK}" stroke-width="5"/>
      ${stitch('M-48,0 a48,48 0 1 0 96,0 a48,48 0 1 0 -96,0', 'rgba(60,40,40,.35)')}</g>`;
    case 'cord': return `<g class="prop cord"><path d="M0,-120 V-20" stroke="${INK}" stroke-width="5"/><rect x="-26" y="-26" width="52" height="64" rx="22" fill="#e07a5f" stroke="${INK}" stroke-width="4"/>
      ${stitch('M-14,-10 V24 M14,-10 V24', 'rgba(255,255,255,.6)', 2)}</g>`;
    case 'bell': return `<g class="prop bell"><path d="M-46,20 C-46,-30 46,-30 46,20Z" fill="#f2c14e" stroke="${INK}" stroke-width="4"/>
      <rect x="-56" y="18" width="112" height="14" rx="7" fill="#9c6b45" stroke="${INK}" stroke-width="3"/><circle cy="-32" r="9" fill="#f2c14e" stroke="${INK}" stroke-width="3"/></g>`;
    case 'orange': return `<g class="prop orange">
      <circle r="50" fill="#FF9F1C" stroke="${INK}" stroke-width="4"/>
      <g fill="#E07B00" opacity=".55"><circle cx="-18" cy="10" r="3"/><circle cx="14" cy="22" r="3"/><circle cx="22" cy="-8" r="3"/><circle cx="-6" cy="-18" r="3"/><circle cx="-26" cy="-10" r="2.5"/></g>
      <path d="M-30,-20 C-36,-6 -34,8 -28,18" stroke="rgba(255,255,255,.6)" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M0,-50 C6,-66 26,-70 36,-62 C26,-50 10,-48 0,-50Z" fill="#4CB944" stroke="${INK}" stroke-width="3"/></g>`;
    case 'grapes': return `<g class="prop grapes">
      <path d="M0,-50 C2,-62 8,-68 14,-72" stroke="#6b4226" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M6,-56 C22,-74 42,-64 44,-58 C30,-46 16,-48 6,-56Z" fill="#6aa84f" stroke="${INK}" stroke-width="3"/>
      <g fill="#9B5DE5" stroke="${INK}" stroke-width="3">${[[-30,-34],[0,-38],[30,-34],[-16,-8],[16,-8],[-30,18],[0,18],[30,18],[-14,42],[14,42],[0,64]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="16"/>`).join('')}</g>
      <g fill="rgba(255,255,255,.65)">${[[-34,-40],[-4,-44],[-20,-14],[-34,12]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4"/>`).join('')}</g></g>`;
    case 'strawberry': return `<g class="prop strawberry">
      <path d="M0,58 C-40,30 -56,-6 -46,-28 C-36,-48 36,-48 46,-28 C56,-6 40,30 0,58Z" fill="#FF3B5C" stroke="${INK}" stroke-width="4"/>
      <g fill="#FFE8A3">${[[-24,-18],[0,-24],[24,-18],[-14,4],[14,4],[-26,10],[26,10],[0,22],[-8,40],[8,40]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="3" ry="4.5"/>`).join('')}</g>
      <path d="M-34,-40 L-18,-34 L-10,-52 L0,-36 L10,-52 L18,-34 L34,-40 L22,-26 C8,-22 -8,-22 -22,-26Z" fill="#4CB944" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M0,-40 V-60" stroke="#4CB944" stroke-width="6" stroke-linecap="round"/></g>`;
    case 'carrot': return `<g class="prop carrot">
      <path d="M-22,-36 C-10,-46 14,-44 24,-30 C18,0 6,34 -4,62 C-10,40 -24,4 -22,-36Z" fill="#FF8C42" stroke="${INK}" stroke-width="4" stroke-linejoin="round" transform="rotate(-20)"/>
      <g transform="rotate(-20)" stroke="#C85E1A" stroke-width="3" stroke-linecap="round"><path d="M-14,-14 h10 M8,2 h-10 M-8,22 h8"/></g>
      <g transform="rotate(-20) translate(0,-40)" fill="#4CB944" stroke="${INK}" stroke-width="3"><path d="M0,0 C-10,-20 -26,-30 -30,-24 C-22,-14 -10,-6 0,0Z"/><path d="M0,0 C0,-24 4,-38 12,-38 C12,-22 8,-10 0,0Z"/><path d="M0,0 C14,-16 30,-20 32,-14 C22,-6 10,-2 0,0Z"/></g></g>`;
    case 'lemonade': return glass('#FFE45C', 'lemonade', k, `<path d="M14,-62 l18,-34" stroke="#22D3A6" stroke-width="8" stroke-linecap="round"/>
      <g transform="translate(-30,-52)"><circle r="18" fill="#FFF27A" stroke="${INK}" stroke-width="3"/><path d="M0,-14 v28 M-14,0 h28 M-10,-10 l20,20 M10,-10 l-20,20" stroke="#E8C800" stroke-width="2"/></g>`);
    case 'cake': return `<g class="prop cake">
      <path d="M-50,-4 L50,-4 L50,44 C50,52 -50,52 -50,44Z" fill="#FFB4D0" stroke="${INK}" stroke-width="4"/>
      <path d="M-50,-4 C-50,-30 50,-30 50,-4 C40,8 30,-2 22,10 C14,0 4,12 -6,2 C-16,12 -26,0 -34,10 C-42,0 -48,6 -50,-4Z" fill="#FFFDF6" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M-50,22 H50" stroke="#FF4F8B" stroke-width="6"/>
      <circle cx="0" cy="-30" r="12" fill="#FF3B5C" stroke="${INK}" stroke-width="3"/><path d="M0,-42 C2,-50 6,-54 10,-56" stroke="#6b4226" stroke-width="3" fill="none"/></g>`;
    case 'drum': return `<g class="prop drum">
      <ellipse cy="34" rx="62" ry="18" fill="#C2185B" stroke="${INK}" stroke-width="4"/>
      <path d="M-62,-20 V34 C-62,44 62,44 62,34 V-20" fill="#FF4F8B" stroke="${INK}" stroke-width="4"/>
      <path d="M-62,-6 L-30,30 L0,-6 L30,30 L62,-6" fill="none" stroke="#FFD23F" stroke-width="6" stroke-linejoin="round"/>
      <ellipse cy="-20" rx="62" ry="18" fill="#FFF7E6" stroke="${INK}" stroke-width="4"/>
      <g stroke="#6b4226" stroke-width="7" stroke-linecap="round"><path d="M-30,-60 L-6,-26"/><path d="M34,-62 L10,-26"/></g>
      <circle cx="-32" cy="-62" r="8" fill="#FFD23F" stroke="${INK}" stroke-width="3"/><circle cx="36" cy="-64" r="8" fill="#FFD23F" stroke="${INK}" stroke-width="3"/></g>`;
    case 'shaker': return `<g class="prop shaker">
      <g transform="rotate(-18)"><rect x="-7" y="6" width="14" height="56" rx="7" fill="#FF8C42" stroke="${INK}" stroke-width="4"/>
      <ellipse cy="-20" rx="36" ry="42" fill="#22D3A6" stroke="${INK}" stroke-width="4"/>
      <path d="M-30,-30 C-10,-20 10,-20 30,-30 M-34,-6 C-10,4 10,4 34,-6" fill="none" stroke="#FFD23F" stroke-width="6"/>
      <g fill="#fff"><circle cx="-14" cy="-40" r="5"/><circle cx="12" cy="-44" r="4"/></g></g>
      <g stroke="${INK}" stroke-width="4" stroke-linecap="round"><path d="M44,-56 l12,-8 M50,-36 l14,0 M46,-16 l12,8"/></g></g>`;
    case 'xylo': return `<g class="prop xylo">
      <path d="M-70,30 L70,14 M-70,-26 L70,-14" stroke="#6b4226" stroke-width="8" stroke-linecap="round"/>
      ${['#FF3B5C', '#FF8C42', '#FFD23F', '#22D3A6', '#4FC3FF', '#7B5CFF'].map((c, i) => `<rect x="${-62 + i * 22}" y="${-38 + i * 2}" width="18" height="${80 - i * 8}" rx="6" fill="${c}" stroke="${INK}" stroke-width="3"/>`).join('')}
      <path d="M40,-70 L10,-30" stroke="#6b4226" stroke-width="6" stroke-linecap="round"/><circle cx="42" cy="-72" r="10" fill="#FF4F8B" stroke="${INK}" stroke-width="3"/></g>`;
    case 'stop': return `<g class="prop stopsign">
      <path d="M-26,-62 H26 L62,-26 V26 L26,62 H-26 L-62,26 V-26Z" fill="#FF3B5C" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M-20,-52 H20 L52,-20" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="5" stroke-linecap="round"/>
      <g fill="#fff" stroke="${INK}" stroke-width="3"><path d="M-22,36 C-30,10 -30,-6 -26,-12 C-22,-16 -18,-12 -18,-6 V-28 C-18,-36 -8,-36 -8,-28 V-34 C-8,-42 2,-42 2,-34 V-30 C2,-38 12,-38 12,-30 V-24 C12,-30 22,-30 22,-22 V12 C22,28 12,36 2,38Z"/></g></g>`;
    case 'go': return `<g class="prop gosign">
      <circle r="64" fill="#22D3A6" stroke="${INK}" stroke-width="5"/>
      <path d="M-40,-30 A50,50 0 0 1 10,-50" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="6" stroke-linecap="round"/>
      <path d="M-22,-32 L34,0 L-22,32Z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g>`;
    case 'rabbit': return `<g class="prop rabbit">
      <g fill="#fff" stroke="${INK}" stroke-width="4">
        <path d="M-18,-40 C-30,-90 -14,-104 -6,-60Z"/><path d="M6,-42 C12,-96 30,-96 18,-50Z"/>
        <ellipse cx="6" cy="22" rx="46" ry="34"/><circle cx="-2" cy="-28" r="28"/><circle cx="50" cy="20" r="10"/></g>
      <path d="M-14,-74 C-18,-86 -12,-90 -10,-70 M14,-76 C18,-88 24,-86 18,-68" stroke="#FF8FC0" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="-12" cy="-32" r="5" fill="${INK}"/><circle cx="8" cy="-32" r="5" fill="${INK}"/><circle cx="-2" cy="-20" r="5" fill="#FF8FC0"/>
      <g stroke="${INK}" stroke-width="4" stroke-linecap="round" opacity=".7"><path d="M-70,6 h-20 M-66,26 h-28 M-70,46 h-18"/></g></g>`;
    case 'snail': return `<g class="prop snail" transform="scale(1.15)">
      <path d="M-56,30 h86 c12,0 18,-12 12,-20 l-12,-12" fill="#FFD9A0" stroke="${INK}" stroke-width="4"/>
      <circle cx="-8" cy="-6" r="34" fill="#7B5CFF" stroke="${INK}" stroke-width="4"/>
      <path d="M-8,-6 m-18,0 a18,18 0 1 0 18,-18 a10,10 0 1 0 6,12" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
      <path d="M32,-4 l6,-26 M42,0 l16,-22" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="38" cy="-32" r="5" fill="${INK}"/><circle cx="58" cy="-24" r="5" fill="${INK}"/></g>`;
    case 'yes': return `<g class="prop yesbtn">
      <circle r="64" fill="#22D3A6" stroke="${INK}" stroke-width="6"/>
      <path d="M-28,2 L-8,24 L30,-22" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-40,-30 A50,50 0 0 1 10,-50" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="6" stroke-linecap="round"/></g>`;
    case 'no': return `<g class="prop nobtn">
      <circle r="64" fill="#FF3B5C" stroke="${INK}" stroke-width="6"/>
      <path d="M-24,-24 L24,24 M24,-24 L-24,24" stroke="#fff" stroke-width="16" stroke-linecap="round"/>
      <path d="M-40,-30 A50,50 0 0 1 10,-50" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="6" stroke-linecap="round"/></g>`;
    default: return `<g class="prop"><circle r="40" fill="#ccc"/></g>`;
  }
}

function glass(color, cls, k, extra = '') {
  return `<g class="prop ${cls}">
    <defs><clipPath id="g${k}"><path d="M-36,-56 L-28,48 C-26,56 26,56 28,48 L36,-56Z"/></clipPath></defs>
    <path d="M-36,-56 L-28,48 C-26,56 26,56 28,48 L36,-56Z" fill="rgba(255,255,255,.55)" stroke="${INK}" stroke-width="4"/>
    <g clip-path="url(#g${k})"><path d="M-40,-24 q10,-6 20,0 t20,0 t20,0 t20,0 V60 H-40Z" fill="${color}"/></g>
    ${extra}
    <path d="M-24,-40 L-18,30" stroke="rgba(255,255,255,.8)" stroke-width="6" stroke-linecap="round"/>
  </g>`;
}

// סמלים אישיים – גדולים, ברורים, ללא תלות בקריאה
export const SYMBOLS = {
  star:    { he: 'כוכב',  draw: (c) => `<path d="M0,-50 L14,-16 L50,-14 L22,8 L32,44 L0,24 L-32,44 L-22,8 L-50,-14 L-14,-16Z" fill="${c}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` },
  moon:    { he: 'ירח',   draw: (c) => `<path d="M10,-48 A50,50 0 1 0 30,40 A40,40 0 1 1 10,-48Z" fill="${c}" stroke="${INK}" stroke-width="4"/>` },
  flower:  { he: 'פרח',   draw: (c) => `<g stroke="${INK}" stroke-width="3">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-26" rx="16" ry="24" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="14" fill="#f2c14e"/></g>` },
  fish:    { he: 'דג',    draw: (c) => `<g stroke="${INK}" stroke-width="4"><path d="M-40,0 C-20,-36 30,-34 44,0 C30,34 -20,36 -40,0Z" fill="${c}"/><path d="M-40,0 l-16,-22 v44z" fill="${c}"/><circle cx="22" cy="-6" r="5" fill="${INK}"/></g>` },
  car:     { he: 'מכונית', draw: (c) => `<g stroke="${INK}" stroke-width="4"><path d="M-52,14 v-18 l18,-6 l14,-22 h40 l16,22 l16,6 v18z" fill="${c}"/><rect x="-14" y="-26" width="28" height="18" fill="#cfeaf5"/><circle cx="-28" cy="18" r="12" fill="#2A1A5E"/><circle cx="28" cy="18" r="12" fill="#2A1A5E"/></g>` },
  drum:    { he: 'תוף',   draw: (c) => `<g stroke="${INK}" stroke-width="4"><path d="M-44,-20 v40 a44,14 0 0 0 88,0 v-40" fill="${c}"/><ellipse cy="-20" rx="44" ry="14" fill="#fffaf0"/><path d="M-44,0 l20,26 l20,-26 l20,26 l20,-26 l8,10" fill="none"/></g>` },
  rainbow: { he: 'קשת',   draw: () => `<g fill="none" stroke-width="12" stroke-linecap="round"><path d="M-46,20 a46,46 0 0 1 92,0" stroke="#e05f7e"/><path d="M-32,20 a32,32 0 0 1 64,0" stroke="#f2c14e"/><path d="M-18,20 a18,18 0 0 1 36,0" stroke="#5b8e7d"/></g>` },
  snail:   { he: 'חילזון', draw: (c) => `<g stroke="${INK}" stroke-width="4"><path d="M-50,26 h84 c10,0 16,-10 10,-18 l-10,-10" fill="#e8d3b0"/><circle cx="-4" cy="-4" r="30" fill="${c}"/><path d="M-4,-4 m-16,0 a16,16 0 1 0 16,-16" fill="none"/><path d="M36,-6 l6,-24 M46,-2 l14,-20" /></g>` },
};
