// Plays the site on a real Android phone (USB debugging, Chrome open) and measures, per stretch of the story, what makes
// phones blank out parts of the picture: GPU tile memory, how often Chrome ran out of it, and how many layers it drew
// with tiles missing ("checkerboarding" — on a phone a missing tile shows as a hole). Also frame pacing.
//
// Usage: node scripts/phone.mjs [--url=https://<the site>/] [--adb=path/to/adb] [--secs=3]
//   Without --url it serves dist/ (run `npm run build` first) and routes the phone to it over USB (adb reverse).
// Target: out of memory 0 %, checkerboarded draws 0, in every stretch.
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const secs = Number(opt("secs", "3"));
const sdkAdb = path.join(os.homedir(), "AppData", "Local", "Android", "Sdk", "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
const ADB = opt("adb", process.env.ADB ?? (existsSync(sdkAdb) ? sdkAdb : "adb"));
const adb = (...a) => execFileSync(ADB, a).toString();

// scene boundaries in frames, read from the timeline so this script never drifts from it
const timeline = readFileSync(path.join(root, "src", "story", "timeline.ts"), "utf8");
const fpb = Number(/export const FPS = (\d+)/.exec(timeline)[1]) / Number(/export const BEAT_FPS = (\d+)/.exec(timeline)[1]);
const SCENES = Object.fromEntries([...timeline.matchAll(/(\w+): \{ start: (\d+), end: (\d+) \}/g)].map(([, id, a, b]) => [id, { start: +a * fpb, end: +b * fpb }]));
// stretches to measure: [label, first frame] (each plays `secs` seconds from there)
const at = (id, p) => Math.round(SCENES[id].start + (SCENES[id].end - SCENES[id].start) * p);
const STRETCHES = [
  ["holud: the bowl, the sun coming in", at("holud", 0.08)],
  ["holud: the names over the courtyard", at("holud", 0.24)],
  ["holud: haldi, hands, ulu", at("holud", 0.78)],
  ["holud → wedding (the turn of the day)", at("wedding", 0) - 40],
  ["wedding: the piri carried in", at("wedding", 0.2)],
  ["wedding: first look, garlands", at("wedding", 0.5)],
  ["wedding tableau → card", at("wedding", 0.9)],
  ["invitation", at("invitation", 0.5)],
];

let server = null;
let url = opt("url", "");
if (!url) {
  const dist = path.join(root, "dist");
  if (!existsSync(path.join(dist, "index.html"))) throw new Error("dist/ is missing: run `npm run build` first, or pass --url");
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".webmanifest": "application/manifest+json" };
  server = createServer((req, res) => {
    let file = path.join(dist, decodeURIComponent((req.url ?? "/").split("?")[0]));
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!file.startsWith(dist) || !existsSync(file)) return res.writeHead(404).end();
    res.setHeader("content-type", TYPES[path.extname(file)] ?? "application/octet-stream");
    res.setHeader("cache-control", "no-store");
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(4173, "127.0.0.1", r));
  adb("reverse", "tcp:4173", "tcp:4173");
  url = "http://localhost:4173/";
}
const target = `${url}${url.includes("?") ? "&" : "?"}debug`;

adb("forward", "tcp:9222", "localabstract:chrome_devtools_remote");
const model = adb("shell", "getprop", "ro.product.model").trim();
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const ctx = browser.contexts()[0];
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.bringToFront().catch(() => {});
await page.goto(target, { waitUntil: "commit", timeout: 90000 }).catch(() => {});
const loadStart = Date.now();
await page.waitForSelector(".cover .btn--primary", { timeout: 120000 });
const loadSecs = (Date.now() - loadStart) / 1000;
await page.waitForTimeout(2500);
// "Watch the story" with a trusted input event (the story and audio need a user gesture)
const box = await page.evaluate(() => {
  const r = document.querySelector(".cover .btn--primary").getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
const pcdp = await ctx.newCDPSession(page);
await pcdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x, y: box.y }] });
await pcdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await page.waitForFunction(() => window.__weddingPlayer?.current?.isPlaying(), null, { timeout: 20000 });

const bcdp = await browser.newBrowserCDPSession();
const trace = async () => {
  const events = [];
  const onData = (e) => events.push(...e.value);
  bcdp.on("Tracing.dataCollected", onData);
  const done = new Promise((r) => bcdp.once("Tracing.tracingComplete", r));
  await bcdp.send("Tracing.start", {
    traceConfig: { includedCategories: ["cc", "disabled-by-default-cc.debug", "viz", "disabled-by-default-memory-infra"], memoryDumpConfig: { triggers: [] } },
    transferMode: "ReportEvents",
  });
  await page.evaluate(() => {
    window.__dts = [];
    let last = performance.now();
    window.__rafOn = true;
    const tick = (t) => {
      window.__dts.push(t - last);
      last = t;
      if (window.__rafOn) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.waitForTimeout(secs * 500);
  await bcdp.send("Tracing.requestMemoryDump", { deterministic: false, levelOfDetail: "detailed" }).catch(() => {});
  await page.waitForTimeout(secs * 500);
  const dts = await page.evaluate(() => {
    window.__rafOn = false;
    return window.__dts.slice(1);
  });
  await bcdp.send("Tracing.end");
  await done;
  bcdp.off("Tracing.dataCollected", onData);
  return { events, dts };
};

const rows = [];
for (const [label, frame] of STRETCHES) {
  await page.evaluate((f) => {
    const p = window.__weddingPlayer.current;
    p.seekTo(f);
    p.play();
  }, frame);
  await page.waitForTimeout(400);
  const { events, dts } = await trace();
  // the page's renderer is the process doing the rastering
  const byPid = new Map();
  for (const e of events) if (e.name === "LayerTreeHostImpl::BuildRasterQueue") byPid.set(e.pid, (byPid.get(e.pid) ?? 0) + 1);
  const pid = [...byPid].sort((a, b) => b[1] - a[1])[0]?.[0];
  const mine = events.filter((e) => e.pid === pid);
  const assign = mine.filter((e) => e.name === "TileManager::AssignGpuMemoryToTiles");
  const short = assign.filter((e) => e.args?.had_enough_memory_to_schedule_tiles_needed_now === false).length;
  const cb = mine.filter((e) => e.name === "TileBasedLayerImpl::AppendQuads checkerboard");
  let tileMB = 0;
  let canvasMB = 0;
  for (const e of mine) {
    const alloc = e.ph === "v" ? e.args?.dumps?.allocators : null;
    if (!alloc) continue;
    tileMB = Math.max(tileMB, parseInt(alloc["cc/tile_memory"]?.attrs?.size?.value ?? "0", 16) / 1e6);
    canvasMB = Math.max(canvasMB, parseInt(alloc["canvas"]?.attrs?.size?.value ?? "0", 16) / 1e6);
  }
  const avg = dts.reduce((a, b) => a + b, 0) / Math.max(1, dts.length);
  const sorted = [...dts].sort((a, b) => a - b);
  rows.push({
    stretch: label,
    from: frame,
    "tile MB": +tileMB.toFixed(1),
    "canvas MB": +canvasMB.toFixed(1),
    "out of memory": assign.length ? `${Math.round((100 * short) / assign.length)}%` : "-",
    "checkerboarded draws": cb.length,
    "missing tiles": cb.reduce((s, e) => s + (e.args?.missing_tile_count ?? 0), 0),
    fps: +(1000 / avg).toFixed(1),
    "p95 ms": +(sorted[Math.floor(sorted.length * 0.95)] ?? 0).toFixed(1),
  });
}
await browser.close().catch(() => {});
server?.close();
if (!opt("url", "")) adb("reverse", "--remove", "tcp:4173");
console.log(`\n${model}, ${target} — cover after ${loadSecs.toFixed(1)} s`);
console.table(rows);
