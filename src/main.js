// נקודת כניסה: ניתוב בין מסכים. כל מסך מקבל את #app ומנקה אחריו.
import { whoScreen, homeScreen } from './ui/home.js';
import { runCafe } from './ui/cafe.js';
import { runBand } from './ui/band.js';
import { runSilly } from './ui/silly.js';
import { runKaraoke } from './ui/karaoke.js';
import { parentGate, parentArea } from './ui/parents.js';
import { store } from './engine/store.js';
import { loadVoiceManifest } from './engine/voice.js';
import { siteGate } from './gate.js';
loadVoiceManifest();

const app = document.getElementById('app');
if (new URLSearchParams(location.search).has('fast')) window.__FAST = true; // לבדיקות אוטומטיות בלבד
let players = null;
let rest = false;

function applySettings() {
  document.documentElement.classList.toggle('reduce-motion', !!store.settings().reduceMotion);
}

function who() { applySettings(); players = null; whoScreen(app, { onPick: (ps) => { players = ps; rest = false; home(); }, onParents: parents }); }
function home() {
  applySettings();
  homeScreen(app, { players, rest, onPlay: play, onBack: who, onParents: parents });
}
function play(place) {
  const run = { cafe: runCafe, band: runBand, silly: runSilly, karaoke: runKaraoke }[place];
  if (!run) return home();
  const fresh = players.map((p) => store.profile(p.id));
  run(app, { players: fresh }, ({ overTime }) => { rest = overTime; home(); });
}
function parents() {
  parentGate(app, { onPass: () => parentArea(app, { onExit: () => (players ? home() : who()) }), onCancel: () => (players ? home() : who()) });
}

window.addEventListener('contextmenu', (e) => e.preventDefault());
// אייפד: ספארי מתעלם מ־user-scalable=no – ילדה שנוגעת בשתי אצבעות או בנגיעה כפולה מגדילה את המסך ו"נתקעת". חוסמים זום.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || (window.visualViewport && visualViewport.scale !== 1)) e.preventDefault(); }, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => { const now = Date.now(); if (now - lastTouchEnd < 320 && e.cancelable) e.preventDefault(); lastTouchEnd = now; }, { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
siteGate(app, who);
