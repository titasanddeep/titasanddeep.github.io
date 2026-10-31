import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome } from "./chrome.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const throttle = Number(opt("throttle", "4"));
const width = Number(opt("width", "390"));
const height = Number(opt("height", "844"));
const dpr = Number(opt("dpr", "3"));
// --url=… profiles an already deployed build (any page with ?debug); --timeline=… reads its scene boundaries
// (e.g. the groom's film: --url=https://deepandtitas.github.io/ --timeline=reference/deep-film/src/story/timeline.ts)
const remote = opt("url", "");
const timelineFile = path.resolve(root, opt("timeline", path.join("src", "story", "timeline.ts")));

if (!remote && !args.includes("--no-build")) execSync("npm run build", { cwd: root, stdio: "inherit" });

const dist = path.join(root, "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".svg": "image/svg+xml", ".jpg": "image/jpeg" };
const server = createServer((req, res) => {
  let file = path.join(dist, decodeURIComponent((req.url ?? "/").split("?")[0]));
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!file.startsWith(dist) || !existsSync(file)) {
    res.statusCode = 404;
    res.end();
    return;
  }
  const body = readFileSync(file);
  res.setHeader("content-type", TYPES[path.extname(file)] ?? "application/octet-stream");
  res.setHeader("content-length", body.length);
  res.end(body);
});
if (!remote) await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = remote ? `${remote}${remote.includes("?") ? "&" : "?"}debug` : `http://127.0.0.1:${server.address().port}/?debug`;

const browser = await chromium.launch({
  executablePath: findChrome(root),
  headless: true,
  args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await page.goto(url);
await page.waitForFunction(() => window.__weddingPlayer?.current, null, { timeout: 60000 });
await page.waitForTimeout(800);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });

// record every animation frame with the Player's current frame
await page.evaluate(() => {
  const log = [];
  window.__frameLog = log;
  const tick = (t) => {
    log.push([t, window.__weddingPlayer.current?.getCurrentFrame() ?? -1]);
    if (!window.__frameDone) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await cdp.send("Performance.enable");
// composited layers: phones drop GPU tiles (parts of the picture blink out) when there are too many, or when layers
// are created and destroyed while playing
let layerCount = 0;
cdp.on("LayerTree.layerTreeDidChange", (e) => {
  if (e.layers) layerCount = e.layers.filter((l) => l.drawsContent && !l.invisible).length;
});
await cdp.send("LayerTree.enable");
// GPU tile memory: a Chrome memory-infra dump (cc/tile_memory of the page's renderer process), taken every ~2 s
const memEvents = [];
cdp.on("Tracing.dataCollected", (e) => memEvents.push(...e.value));
const tracingDone = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
await cdp.send("Tracing.start", { traceConfig: { includedCategories: ["-*", "disabled-by-default-memory-infra"], memoryDumpConfig: { triggers: [] } }, transferMode: "ReportEvents" });
const tileSamples = [];
let lastDump = 0;
const sampleTiles = async (frame) => {
  const before = memEvents.length;
  try {
    await cdp.send("Tracing.requestMemoryDump", { levelOfDetail: "light" });
  } catch {
    return;
  }
  const mb = tileMbOf(memEvents.slice(before));
  if (mb !== null) tileSamples.push({ frame, mb });
};
// sums the cc/tile_memory allocators of every process in the dump; the renderer is the one that has them
const tileMbOf = (events) => {
  let best = null;
  for (const ev of events) {
    const allocators = ev?.args?.dumps?.allocators;
    if (!allocators) continue;
    const entries = Object.entries(allocators).filter(([k]) => k === "cc/tile_memory" || k.startsWith("cc/tile_memory/"));
    if (!entries.length) continue;
    const size = (v) => parseInt(v?.attrs?.size?.value ?? "0", 16) || 0;
    const children = entries.filter(([k]) => k !== "cc/tile_memory");
    const total = children.length ? children.reduce((n, [, v]) => n + size(v), 0) : size(entries[0][1]);
    best = Math.max(best ?? 0, total / 1048576);
  }
  return best;
};
await page.tap(".cover .btn--primary");
const started = Date.now();
// sample main-thread time (script / style / layout) every half second, attributed to the scene being played
const samples = [];
for (;;) {
  const [{ metrics }, state] = await Promise.all([
    cdp.send("Performance.getMetrics"),
    page.evaluate(() => [window.__weddingPlayer.current?.getCurrentFrame() ?? 0, window.__weddingState?.current?.phase]),
  ]);
  const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
  samples.push({ t: Date.now(), frame: state[0], layers: layerCount, script: m.ScriptDuration, style: m.RecalcStyleDuration, layout: m.LayoutDuration, task: m.TaskDuration });
  if (Date.now() - lastDump > 2000) {
    lastDump = Date.now();
    await sampleTiles(state[0]);
  }
  if (state[1] === "finished" || Date.now() - started > 180000) break;
  await new Promise((r) => setTimeout(r, 500));
}
const wall = (Date.now() - started) / 1000;
const log = await page.evaluate(() => {
  window.__frameDone = true;
  return window.__frameLog;
});
await cdp.send("Tracing.end").catch(() => undefined);
await Promise.race([tracingDone, new Promise((r) => setTimeout(r, 5000))]);
await browser.close();
if (!remote) server.close();

// scene boundaries in frames, read from the timeline (beats × frames-per-beat) so this script never drifts from it
const timeline = readFileSync(timelineFile, "utf8");
const fpb = Number(/export const FPS = (\d+)/.exec(timeline)[1]) / Number(/export const BEAT_FPS = (\d+)/.exec(timeline)[1]);
const SCENES = Object.fromEntries(
  [...timeline.matchAll(/(\w+): \{ start: (\d+), end: (\d+) \}/g)].map(([, id, a, b]) => [id, { start: +a * fpb, end: +b * fpb }]),
);

const rows = [];
for (const [id, s] of Object.entries(SCENES)) {
  const frames = log.filter(([, f]) => f >= s.start && f < s.end);
  if (frames.length < 3) continue;
  const dts = [];
  for (let i = 1; i < frames.length; i++) dts.push(frames[i][0] - frames[i - 1][0]);
  dts.sort((a, b) => a - b);
  const avg = dts.reduce((a, b) => a + b, 0) / dts.length;
  const p95 = dts[Math.floor(dts.length * 0.95)];
  const dropped = dts.filter((d) => d > 25).length;
  const advanced = frames[frames.length - 1][1] - frames[0][1];
  // main-thread share of wall time while this scene played (CPU throttling inflates these proportionally)
  const ss = samples.filter((x, i) => i > 0 && x.frame >= s.start && x.frame < s.end);
  const share = (k) => {
    let busy = 0;
    let span = 0;
    for (const x of ss) {
      const prev = samples[samples.indexOf(x) - 1];
      busy += x[k] - prev[k];
      span += (x.t - prev.t) / 1000;
    }
    return span > 0 ? `${Math.round((busy / span) * 100)}%` : "-";
  };
  // layer churn: how often the layer count changed after the scene's first second (target 0)
  const settled = ss.filter((x) => x.frame >= s.start + 60);
  const churn = settled.filter((x, i) => i > 0 && x.layers !== settled[i - 1].layers).length;
  const maxLayers = Math.max(0, ...ss.map((x) => x.layers));
  const tiles = tileSamples.filter((x) => x.frame >= s.start && x.frame < s.end).map((x) => x.mb);
  const tileMb = tiles.length ? +Math.max(...tiles).toFixed(1) : "-";
  rows.push({ scene: id, fps: +(1000 / avg).toFixed(1), "p95 ms": +p95.toFixed(1), "long frames": dropped, "player frames": advanced, expected: s.end - s.start, script: share("script"), style: share("style"), layout: share("layout"), busy: share("task"), layers: maxLayers, "layer churn": churn, "tile MB": tileMb });
}
console.log(`\n${width}×${height} @${dpr}x, CPU throttle ${throttle}×, wall ${wall.toFixed(1)} s (story is ${(Math.max(...Object.values(SCENES).map((s) => s.end)) / 60).toFixed(0)} s)`);
console.table(rows);
console.log("target: ≈60 fps, tile memory ≤ 80 MB, no layer churn");

