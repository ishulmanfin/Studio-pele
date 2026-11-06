// שכבת שמירה: פרופילים, הגדרות, יצירות והתקדמות.
// localStorage כשזמין, אחרת זיכרון בלבד (ומדווח לאזור ההורים).
const KEY = 'studio-pele:v1';

let persistent = true;
let memory = null;

function defaults() {
  return {
    version: 1,
    profiles: {
      shaya: { id: 'shaya', name: 'שייה', track: 'older', symbol: null, color: '#FF4F8B' },
      alma:  { id: 'alma',  name: 'אלמה', track: 'younger', symbol: null, color: '#22D3A6' },
    },
    settings: {
      voice: true, deviceVoice: false, captions: true, sfx: true, music: true, reduceMotion: false,
      micAllowed: false, rate: 0.85, sessionMinutes: 15, enVoice: '', heVoice: '',
    },
    progress: {},   // profileId -> { items: {...}, sessions: [] }
    creations: {},  // profileId | 'sisters' -> { cafe: {...} }
    interests: {},  // profileId -> { tag: count }
    library: {},    // packId -> { status: 'approved'|'declined', at }
    missions: {},   // owner -> { phrase, items, parent, at, homeReports: [ts] }
    lastSessionStart: null,
  };
}

function load() {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    memory = raw ? merge(defaults(), JSON.parse(raw)) : defaults();
    const OLD = { '#e07a5f': '#FF4F8B', '#5b8e7d': '#22D3A6' }; // מעבר לפלטה הצבעונית
    for (const p of Object.values(memory.profiles)) if (OLD[p.color]) p.color = OLD[p.color];
  } catch {
    persistent = false;
    memory = defaults();
  }
  return memory;
}

function merge(base, saved) {
  for (const k of Object.keys(saved)) {
    if (saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k]) && base[k] && typeof base[k] === 'object') {
      base[k] = merge(base[k], saved[k]);
    } else base[k] = saved[k];
  }
  return base;
}

export function save() {
  if (!persistent) return false;
  try { localStorage.setItem(KEY, JSON.stringify(memory)); return true; }
  catch { persistent = false; return false; }
}

export const store = {
  get data() { return load(); },
  get persistent() { load(); return persistent; },
  profile: (id) => load().profiles[id],
  profiles: () => Object.values(load().profiles),
  settings: () => load().settings,
  setSetting(k, v) { load().settings[k] = v; save(); },
  updateProfile(id, patch) { Object.assign(load().profiles[id], patch); save(); },
  creation(owner, place) { return load().creations[owner]?.[place] || null; },
  setCreation(owner, place, value) {
    const c = load().creations;
    c[owner] = c[owner] || {};
    c[owner][place] = { ...value, updatedAt: Date.now() };
    save();
  },
  bumpInterest(id, tag, n = 1) {
    const i = load().interests;
    i[id] = i[id] || {};
    i[id][tag] = (i[id][tag] || 0) + n;
    save();
  },
  interests: (id) => load().interests[id] || {},
  mission: (owner) => load().missions[owner] || null,
  setMission(owner, m) { load().missions[owner] = { ...m, at: Date.now(), homeReports: [] }; save(); },
  reportHome(owner) { const m = load().missions[owner]; if (m) { m.homeReports.push(Date.now()); save(); } },
  packStatus: (packId) => load().library[packId]?.status || 'draft',
  setPackStatus(packId, status) { load().library[packId] = { status, at: Date.now() }; save(); },
  deleteChild(id) {
    const d = load();
    delete d.progress[id]; delete d.creations[id]; delete d.interests[id]; delete d.missions[id]; delete d.missions.sisters;
    if (d.creations.sisters) delete d.creations.sisters;
    d.profiles[id].symbol = null;
    save();
  },
  deleteAll() { memory = defaults(); try { localStorage.removeItem(KEY); } catch {} save(); },
};
