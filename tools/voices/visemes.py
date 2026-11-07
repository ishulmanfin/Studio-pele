#!/usr/bin/env python3
"""צורות פה (visemes) מתוך הקלטה, בלי שירות חיצוני: עובד על עברית ועל אנגלית.

מנתח את הצליל עצמו (עוצמה, מיקום האנרגיה בתדרים, רעש של ש/ס/פ) ומחזיר רצף צורות:
  X מנוחה · M שפתיים סגורות · A פתוח רחב · E חיוך פתוח · O עגול · U עגול קטן · F שיניים על שפה
שימוש: visemes.py  → assets/voice/visemes.json לכל ההקלטות של מיקה
       visemes.py file.mp3 [...]  → JSON על stdout: {"file": "X0 A80 O160 ..."} (זמנים במילישניות)
דורש ffmpeg ו-numpy.
"""
import json
import subprocess
import sys

import numpy as np

SR = 16000
HOP = 0.02   # 50 פריימים בשנייה
WIN = 0.04


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def frames(x):
    hop, win = int(SR * HOP), int(SR * WIN)
    n = max(1, 1 + (len(x) - win) // hop)
    w = np.hanning(win)
    out = []
    for i in range(n):
        seg = x[i * hop:i * hop + win]
        if len(seg) < win:
            seg = np.pad(seg, (0, win - len(seg)))
        out.append(np.abs(np.fft.rfft(seg * w)) ** 2)
    return np.array(out), np.fft.rfftfreq(win, 1 / SR)


def band(spec, f, lo, hi):
    return spec[:, (f >= lo) & (f < hi)].sum(axis=1) + 1e-12


def classify(spec, f):
    total = band(spec, f, 80, 8000)
    db = 10 * np.log10(total)
    peak = np.percentile(db, 95)
    loud = np.clip((db - (peak - 30)) / 30, 0, 1)           # 0 שקט … 1 שיא
    voiced = spec[:, (f >= 80) & (f < 4000)]
    fv = f[(f >= 80) & (f < 4000)]
    centroid = (voiced * fv).sum(axis=1) / (voiced.sum(axis=1) + 1e-12)   # גבוה = פה פתוח יותר (F1)
    mid = band(spec, f, 400, 1000) / total                  # אנרגיה בתחום ה"או/אה"
    hiss = band(spec, f, 4000, 8000) / total                # ש/ס/צ/פ
    shapes = []
    for i in range(len(total)):
        near = db[max(0, i - 5):i + 6].max()
        if loud[i] < 0.12:
            shapes.append('X')
        elif hiss[i] > 0.45:
            shapes.append('F')
        elif loud[i] < 0.35 or db[i] < near - 9:            # שקע בין הברות: הפה כמעט נסגר
            shapes.append('U' if mid[i] > 0.4 else 'M')
        elif centroid[i] > 600 and loud[i] > 0.55:
            shapes.append('A')
        elif centroid[i] < 330:
            shapes.append('E')
        elif mid[i] > 0.55:
            shapes.append('O')
        else:
            shapes.append('A' if loud[i] > 0.6 else 'E')
    return shapes


def smooth(shapes, min_frames=2):
    """מסיר הבהובים: כל צורה מחזיקה לפחות 60ms, ושקט קצר בין הברות הופך לשפתיים סגורות."""
    runs = []
    for s in shapes:
        if runs and runs[-1][0] == s:
            runs[-1][1] += 1
        else:
            runs.append([s, 1])
    out = []
    for i, (s, n) in enumerate(runs):
        if s == 'X' and 0 < i < len(runs) - 1 and n <= 6:
            s = 'M'
        if n < min_frames and out:
            out[-1][1] += n
            continue
        if out and out[-1][0] == s:
            out[-1][1] += n
        else:
            out.append([s, n])
    track, t = [], 0
    for s, n in out:
        track.append(f'{s}{round(t * HOP * 1000)}')
        t += n
    if not out or out[-1][0] != 'X':
        track.append(f'X{round(t * HOP * 1000)}')
    return ' '.join(track)


def analyze(path):
    spec, f = frames(decode(path))
    return smooth(classify(spec, f))




def all_mika(out='assets/voice/visemes.json', who=('mika',)):
    """לכל הקלטה של הדמויות ברשימה (manifest.json + הקבצים הבודדים) – רצף צורות פה. מפתח = who|lang|text."""
    import os
    m = json.load(open('assets/voice/manifest.json'))
    old = json.load(open(out)) if os.path.exists(out) else {}
    res = {}
    for k, f in m.items():
        if k.split('|')[0] not in who:
            continue
        res[k] = old.get(k) if k in old else analyze('assets/voice/' + f)
    json.dump(res, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
    return len(res)


if __name__ == '__main__':
    # בלי ארגומנטים: כל ההקלטות של מיקה → assets/voice/visemes.json (מריצים אחרי generate.mjs render, לפני bundle.mjs)
    if len(sys.argv) == 1:
        print(all_mika(), 'lines')
    else:
        print(json.dumps({p.rsplit('/', 1)[-1]: analyze(p) for p in sys.argv[1:]}, ensure_ascii=False, indent=1))
