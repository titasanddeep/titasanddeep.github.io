// Records the phone's screen while the whole story plays in real time, then scans the video for transient blinks
// (a part of the picture that vanishes or a hole that opens for 1-3 frames) and prints frame-pacing stats.
//
// Needs: a phone with USB debugging and Chrome open, `npx vite build` done, and the Python + OpenCV venv for the
// scanner (scripts/phone-scan.py): pass `--python=<path to python.exe>` (or set PYTHON) for a Python with opencv-python
// and numpy installed, e.g. `python -m venv .venv && .venv/Scripts/pip install opencv-python numpy` (.venv is git-ignored).
//
// Usage: node scripts/phone-record.mjs [--python=path] [--adb=path] [--out=out/qa-phone/run1] [--url=...]
// The scanner flags every region that changes and changes back within 1-3 frames; legitimate fast motion (petals,
// twinkles) also qualifies, so LOOK at the saved strips (before | blink | after | mask) and count only real vanishings.
import { chromium } from "playwright-core";
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const sdkAdb = path.join(os.homedir(), "AppData", "Local", "Android", "Sdk", "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
const ADB = opt("adb", process.env.ADB ?? (existsSync(sdkAdb) ? sdkAdb : "adb"));
const PY = opt("python", process.env.PYTHON ?? "python");
const outDir = path.resolve(root, opt("out", "out/qa-phone/run1"));
mkdirSync(outDir, { recursive: true });
const adb = (...a) => execFileSync(ADB, a, { maxBuffer: 1 << 28 }).toString();

let server = null;
let url = opt("url", "");
if (!url) {
  const dist = path.join(root, "dist");
  if (!existsSync(path.join(dist, "index.html"))) throw new Error("dist/ is missing: run `npx vite build` first, or pass --url");
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
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const ctx = browser.contexts()[0];
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.bringToFront().catch(() => {});
await page.goto(target, { waitUntil: "commit", timeout: 90000 }).catch(() => {});
await page.waitForSelector(".cover .btn--primary", { timeout: 120000 });
await page.waitForTimeout(3000);
const box = await page.evaluate(() => {
  const r = document.querySelector(".cover .btn--primary").getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
const cdp = await ctx.newCDPSession(page);

const rec = spawn(ADB, ["shell", "screenrecord", "--bit-rate", "20000000", "--time-limit", "180", "/sdcard/dt-qa.mp4"], { stdio: "ignore" });
const recStart = Date.now();
await new Promise((r) => setTimeout(r, 2500));
const tapAt = (Date.now() - recStart) / 1000;
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x, y: box.y }] });
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await page.waitForFunction(() => window.__weddingState?.current?.phase === "finished", null, { timeout: 120000, polling: 500 });
const endAt = (Date.now() - recStart) / 1000;
await new Promise((r) => setTimeout(r, 1500));
adb("shell", "pkill", "-INT", "screenrecord");
await new Promise((r) => setTimeout(r, 2500));
rec.kill();
const mp4 = path.join(outDir, "story.mp4");
adb("pull", "/sdcard/dt-qa.mp4", mp4);
adb("shell", "rm", "/sdcard/dt-qa.mp4");
await browser.close().catch(() => {});
server?.close();
if (!opt("url", "")) adb("reverse", "--remove", "tcp:4173");
console.log(`recorded ${mp4}; tap at ${tapAt.toFixed(1)} s, story finished at ${endAt.toFixed(1)} s (recording clock, +-1 s)`);

const scan = path.join(root, "scripts", "phone-scan.py");
const out = execFileSync(PY, ["-I", scan, mp4, path.join(outDir, "strips"), String(tapAt + 0.5), String(endAt + 1)], { maxBuffer: 1 << 26, timeout: 900000 }).toString();
console.log(out);
