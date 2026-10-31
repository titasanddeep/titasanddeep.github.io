# Transient-blink scanner for a phone screen recording (ported from the investigation's window.py).
# Finds regions of the picture that change and change back within 1-3 frames (a part vanishing or a hole appearing),
# prints each one's time and box, frame-gap stats, and saves strips (before | blink | after | mask) for review.
# Usage: python -I phone-scan.py <video.mp4> <outdir> <t0_seconds> <t1_seconds>   (env KEEP = max strips, default 40)
# Fast legitimate motion (a petal, a twinkle) also shows up here; judge by eye from the strips.
import sys, os, json
import cv2
import numpy as np

video, outdir, t0, t1 = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
os.makedirs(outdir, exist_ok=True)
cap = cv2.VideoCapture(video)
small, times, idx = [], [], []
n = -1
while True:
    ok, fr = cap.read()
    if not ok:
        break
    n += 1
    t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
    if t < t0:
        continue
    if t > t1:
        break
    small.append(cv2.resize(fr, (216, 480), interpolation=cv2.INTER_AREA))
    times.append(t)
    idx.append(n)
cap.release()
sm = small
gaps = np.diff(times)
stats = {"frames": len(sm), "median_gap_ms": float(np.median(gaps) * 1000), "gaps_over_40ms": int((gaps > 0.040).sum()), "max_gap_ms": float(gaps.max() * 1000)}
print(f"{stats['frames']} frames in {t0:.1f}-{t1:.1f}s; frame gaps: median {stats['median_gap_ms']:.0f}ms, >40ms: {stats['gaps_over_40ms']}, max {stats['max_gap_ms']:.0f}ms")


def mask(a, b, thr=45):
    return np.abs(a.astype(np.int16) - b.astype(np.int16)).sum(axis=2) > thr


hits = []
for k in range(1, len(sm) - 4):
    a = sm[k - 1]
    for run in (1, 2, 3):
        c = sm[k + run]
        m_ac = mask(a, c)
        m_bad = mask(a, sm[k]) & mask(sm[k], c) if run == 1 else mask(a, sm[k]) & mask(sm[k + run - 1], c)
        trans = m_bad & ~m_ac
        pct = trans.mean() * 100
        if pct > 0.3:
            ys, xs = np.nonzero(trans)
            hits.append({"t": round(times[k], 3), "run": run, "pct": round(float(pct), 2), "box": [int(xs.min() * 5), int(ys.min() * 5), int(xs.max() * 5), int(ys.max() * 5)], "k": k})
            break

# merge hits on consecutive frames into one event
events = []
for h in hits:
    if events and h["k"] - events[-1]["k"] <= 2:
        continue
    events.append(h)
keep = int(os.environ.get("KEEP", "40"))
want = {e["k"]: i for i, e in enumerate(events[:keep])}
if want:
    cap = cv2.VideoCapture(video)
    need = {}
    for k in want:
        for j in range(max(k - 1, 0), min(k + 5, len(idx))):
            need[idx[j]] = None
    last = max(need)
    n = -1
    while n < last:
        ok, fr = cap.read()
        if not ok:
            break
        n += 1
        if n in need:
            need[n] = cv2.resize(fr, (360, 800), interpolation=cv2.INTER_AREA)
    cap.release()
    for k, i in want.items():
        e = events[i]
        a, b, c = need[idx[k - 1]], need[idx[k]], need[idx[min(k + e["run"], len(idx) - 1)]]
        diff = cv2.absdiff(a, c)
        m = cv2.cvtColor(cv2.absdiff(a, b), cv2.COLOR_BGR2GRAY)
        m = cv2.cvtColor(cv2.threshold(m, 20, 255, cv2.THRESH_BINARY)[1], cv2.COLOR_GRAY2BGR)
        cv2.imwrite(os.path.join(outdir, f"g{i:02d}_{e['t']:.2f}.jpg"), np.hstack([a, b, c, m]))
for e in events:
    print(f"t={e['t']:.3f}s run={e['run']} transient {e['pct']:.2f}% box x{e['box'][0]}-{e['box'][2]} y{e['box'][1]}-{e['box'][3]}")
print(f"{len(events)} transient changes")
json.dump({"stats": stats, "events": [{k: v for k, v in e.items() if k != 'k'} for e in events]}, open(os.path.join(outdir, "scan.json"), "w"))
