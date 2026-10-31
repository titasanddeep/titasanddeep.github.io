/**
 * Animation helpers: pure re-implementations of the bits of Remotion's `interpolate` / `Easing` the story uses, so the
 * whole story core runs without Remotion (node, tests, canvas renderer). Outputs equal Remotion's exactly.
 * Inputs are usually beats (1/30 s), but every helper is unit-agnostic.
 */

/** A [from, to] range, as used by BEATS in the timeline. */
export type Range = readonly [number, number];

export type Easing = (t: number) => number;

// --- cubic-bezier easing (the same solver Remotion uses: React Native's bezier.js) ----------------------------------
const NEWTON_ITERATIONS = 4;
const NEWTON_MIN_SLOPE = 0.001;
const SUBDIVISION_PRECISION = 0.0000001;
const SUBDIVISION_MAX_ITERATIONS = 10;
const SPLINE_TABLE_SIZE = 11;
const SAMPLE_STEP = 1.0 / (SPLINE_TABLE_SIZE - 1.0);

const bzA = (a1: number, a2: number) => 1.0 - 3.0 * a2 + 3.0 * a1;
const bzB = (a1: number, a2: number) => 3.0 * a2 - 6.0 * a1;
const bzC = (a1: number) => 3.0 * a1;
const calcBezier = (t: number, a1: number, a2: number) => ((bzA(a1, a2) * t + bzB(a1, a2)) * t + bzC(a1)) * t;
const getSlope = (t: number, a1: number, a2: number) => 3.0 * bzA(a1, a2) * t * t + 2.0 * bzB(a1, a2) * t + bzC(a1);

const binarySubdivide = (x: number, lo: number, hi: number, x1: number, x2: number): number => {
  let a = lo;
  let b = hi;
  let currentX: number;
  let currentT: number;
  let i = 0;
  do {
    currentT = a + (b - a) / 2.0;
    currentX = calcBezier(currentT, x1, x2) - x;
    if (currentX > 0.0) b = currentT;
    else a = currentT;
  } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
  return currentT;
};

const newtonRaphson = (x: number, guess: number, x1: number, x2: number): number => {
  let t = guess;
  for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
    const slope = getSlope(t, x1, x2);
    if (slope === 0.0) return t;
    t -= (calcBezier(t, x1, x2) - x) / slope;
  }
  return t;
};

/** CSS `cubic-bezier(x1, y1, x2, y2)` as an easing function (x1, x2 in [0, 1]). */
export const bezier = (x1: number, y1: number, x2: number, y2: number): Easing => {
  if (!(x1 >= 0 && x1 <= 1 && x2 >= 0 && x2 <= 1)) throw new Error("bezier x values must be in [0, 1] range");
  const samples = new Float32Array(SPLINE_TABLE_SIZE);
  if (x1 !== y1 || x2 !== y2) {
    for (let i = 0; i < SPLINE_TABLE_SIZE; ++i) samples[i] = calcBezier(i * SAMPLE_STEP, x1, x2);
  }
  const tForX = (x: number): number => {
    let start = 0.0;
    let cur = 1;
    const last = SPLINE_TABLE_SIZE - 1;
    for (; cur !== last && samples[cur] <= x; ++cur) start += SAMPLE_STEP;
    --cur;
    const dist = (x - samples[cur]) / (samples[cur + 1] - samples[cur]);
    const guess = start + dist * SAMPLE_STEP;
    const slope = getSlope(guess, x1, x2);
    if (slope >= NEWTON_MIN_SLOPE) return newtonRaphson(x, guess, x1, x2);
    if (slope === 0.0) return guess;
    return binarySubdivide(x, start, start + SAMPLE_STEP, x1, x2);
  };
  return (x: number): number => {
    const cx = Math.min(1, Math.max(0, x));
    if (x1 === y1 && x2 === y2) return cx;
    if (cx === 0) return 0;
    if (cx === 1) return 1;
    return calcBezier(tForX(cx), y1, y2);
  };
};

const cubic: Easing = (t) => t * t * t;
const out = (e: Easing): Easing => (t) => 1 - e(1 - t);
const inOut = (e: Easing): Easing => (t) => (t < 0.5 ? e(t * 2) / 2 : 1 - e((1 - t) * 2) / 2);

/** Fast start, soft landing (cubic). */
export const easeOut: Easing = out(cubic);
/** Soft start and landing (cubic). The default easing of `progress` and `ramp`. */
export const easeInOut: Easing = inOut(cubic);
/** Gentle fade-in curve for headings and text. */
export const easeSoft: Easing = bezier(0.22, 0.61, 0.36, 1);
/** The invitation card's rise. */
export const rise: Easing = bezier(0.42, 0, 0.1, 1);

/** Springy settle used by the lotus: 0 at t <= 0, overshoots a little, then rests at 1. */
export const settle = (t: number): number => (t <= 0 ? 0 : 1 - Math.exp(-5 * t) * Math.cos(4.2 * t));

/** Clamped linear map of `x` from [inMin, inMax] to [outMin, outMax] through `easing` (Remotion `interpolate`, clamped). */
const mapClamped = (x: number, inMin: number, inMax: number, outMin: number, outMax: number, easing: Easing): number => {
  let r = x;
  if (r < inMin) r = inMin;
  if (r > inMax) r = inMax;
  if (outMin === outMax) return outMin;
  r = (r - inMin) / (inMax - inMin);
  r = easing(r);
  return r * (outMax - outMin) + outMin;
};

/** Clamped 0 to 1 progress of `frame` through `range` (beats or frames), eased (default easeInOut). */
export const progress = (frame: number, range: Range, easing: Easing = easeInOut): number =>
  mapClamped(frame, range[0], range[1], 0, 1, easing);

/** Clamped map of `frame` across `range` to [a, b], eased (default easeInOut). */
export const ramp = (frame: number, range: Range, a: number, b: number, easing: Easing = easeInOut): number =>
  mapClamped(frame, range[0], range[1], a, b, easing);

/** Multi-stop, clamped, piecewise-linear interpolation (Remotion `interpolate` with both sides clamped). */
export const keyframes = (frame: number, inputs: readonly number[], outputs: readonly number[]): number => {
  let i: number;
  for (i = 1; i < inputs.length - 1; ++i) if (inputs[i] >= frame) break;
  const k = i - 1;
  return mapClamped(frame, inputs[k], inputs[k + 1], outputs[k], outputs[k + 1], (t) => t);
};

/** Linear interpolation a to b by t (not clamped). */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Clamps `v` into [lo, hi]. */
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Deterministic pseudo-random in [0,1) from a number seed (no Math.random: renders must be repeatable). */
export const seeded = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

/** Multi-stop interpolation with each segment eased in and out, so motion never starts or stops abruptly. */
export const smoothKeyframes = (frame: number, inputs: readonly number[], outputs: readonly number[]): number => {
  if (frame <= inputs[0]) return outputs[0];
  for (let i = 1; i < inputs.length; i++) {
    if (frame <= inputs[i]) {
      const t = (frame - inputs[i - 1]) / (inputs[i] - inputs[i - 1]);
      return lerp(outputs[i - 1], outputs[i], easeInOut(t));
    }
  }
  return outputs[outputs.length - 1];
};

/** Half-sine bump 0 to 1 to 0 across [a, b] (linear progress). */
export const bump = (f: number, a: number, b: number): number => Math.sin(Math.PI * progress(f, [a, b], (t) => t));
