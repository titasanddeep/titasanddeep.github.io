// Drives every control of the built site on a USB-connected Android phone with real touch events and checks the
// result through the ?debug hooks: watch, skip, pause/resume, mute, replay, language, map link, explore + hotspots.
// Usage: npx vite build && node scripts/phone-controls.mjs [--adb=path]
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const opt = (name, fallback) => process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const sdkAdb = path.join(os.homedir(), "AppData", "Local", "Android", "Sdk", "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
const ADB = opt("adb", process.env.ADB ?? (existsSync(sdkAdb) ? sdkAdb : "adb"));
const adb = (...a) => execFileSync(ADB, a).toString();
const mapUrl = /mapUrl:\s*"([^"]+)"/.exec(readFileSync(path.join(root, "src", "content", "wedding.ts"), "utf8"))[1];

const dist = path.join(root, "dist");
const server = createServer((req, res) => {
  let file = path.join(dist, decodeURIComponent((req.url ?? "/").split("?")[0]));
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!file.startsWith(dist) || !existsSync(file)) return res.writeHead(404).end();
  const t = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".svg": "image/svg+xml" }[path.extname(file)];
  if (t) res.setHeader("content-type", t);
  res.setHeader("cache-control", "no-store");
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(4173, "127.0.0.1", r));
adb("reverse", "tcp:4173", "tcp:4173");
adb("forward", "tcp:9222", "localabstract:chrome_devtools_remote");
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const ctx = browser.contexts()[0];
const page = ctx.pages()[0];
const cdp = await ctx.newCDPSession(page);

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ control: name, result: ok ? "pass" : "FAIL", detail });
};
const state = () => page.evaluate(() => ({ phase: window.__weddingState?.current?.phase, frame: window.__weddingPlayer?.current?.getCurrentFrame() ?? -1, playing: window.__weddingPlayer?.current?.isPlaying() ?? false }));
const tap = async (selector, index = 0) => {
  const box = await page.evaluate(([s, i]) => {
    const el = [...document.querySelectorAll(s)].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden";
    })[i];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, [selector, index]);
  if (!box) throw new Error(`nothing visible matches ${selector}`);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x, y: box.y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(700);
};
const load = async () => {
  await page.goto("http://localhost:4173/?debug", { waitUntil: "commit", timeout: 90000 }).catch(() => {});
  await page.waitForSelector(".cover .btn--primary", { timeout: 120000 });
  await page.waitForTimeout(2500);
};

try {
  // Watch the story
  await load();
  await tap(".cover .btn--primary");
  await page.waitForTimeout(1500);
  let s = await state();
  check("Watch the story starts playback", s.playing && s.frame > 0, `phase ${s.phase}, frame ${s.frame}`);

  // Pause / resume (first control)
  await tap(".controls .ctl", 0);
  const a = await state();
  await page.waitForTimeout(800);
  const b = await state();
  check("Pause stops the story", !b.playing && a.frame === b.frame, `frame ${a.frame} → ${b.frame}`);
  await tap(".controls .ctl", 0);
  await page.waitForTimeout(800);
  s = await state();
  check("Resume continues", s.playing && s.frame > b.frame, `frame ${s.frame}`);

  // Mute
  const before = await page.evaluate(() => document.querySelector(".controls .ctl--icon")?.getAttribute("aria-pressed"));
  await tap(".controls .ctl--icon");
  const after = await page.evaluate(() => document.querySelector(".controls .ctl--icon")?.getAttribute("aria-pressed"));
  check("Mute toggles", before !== after, `aria-pressed ${before} → ${after}`);

  // Language toggle: every overlay text changes
  const texts = () => page.evaluate(() => [...document.querySelectorAll('[data-overlay="text"]')].map((e) => e.textContent).join("|") + document.querySelector(".controls")?.textContent);
  const bnText = await texts();
  await tap(".lang-toggle__btn", 1);
  const enText = await texts();
  const lang = await page.evaluate(() => document.documentElement.lang);
  check("Language toggle switches to English", enText !== bnText && lang === "en", `html lang=${lang}`);
  await tap(".lang-toggle__btn", 0);

  // Skip to the invitation (last control)
  const skipIdx = (await page.evaluate(() => document.querySelectorAll(".controls .ctl").length)) - 1;
  await tap(".controls .ctl", skipIdx);
  await page.waitForTimeout(6000);
  s = await state();
  check("Skip goes to the invitation", s.frame >= 6300, `phase ${s.phase}, frame ${s.frame}`);
  await page.waitForFunction(() => window.__weddingState?.current?.phase === "finished", null, { timeout: 60000 }).catch(() => {});
  s = await state();
  check("Story finishes on the invitation", s.phase === "finished" && s.frame >= 7190, `phase ${s.phase}, frame ${s.frame}`);

  // Map link
  const href = await page.evaluate(() => [...document.querySelectorAll('[data-overlay="link"]')].filter((a) => getComputedStyle(a).visibility !== "hidden").map((a) => a.getAttribute("href")));
  check("Map link opens the venue's Google Maps listing", href.length > 0 && href.every((h) => h === mapUrl), href.join(", "));

  // Replay
  await tap(".controls .ctl", 0);
  await page.waitForTimeout(1500);
  s = await state();
  check("Replay starts again from the beginning", s.playing && s.frame < 400, `phase ${s.phase}, frame ${s.frame}`);

  // Explore: guided mode stops at each checkpoint and its hotspot continues
  await load();
  await tap(".cover .btn--ghost");
  const stops = [];
  // six stops: the lamp, the tattva tray, the bangles, the বরণডালা, the betel leaves, the ornament
  for (let i = 0; i < 6; i++) {
    const ok = await page.waitForFunction(() => {
      const hs = [...document.querySelectorAll('[data-overlay="hotspot"]')].find((h) => getComputedStyle(h).visibility !== "hidden" && h.getBoundingClientRect().width > 0);
      return hs ? hs.getAttribute("data-id") : false;
    }, null, { timeout: 90000 }).then((h) => h.jsonValue()).catch(() => null);
    if (!ok) break;
    const paused = await state();
    stops.push(`${ok}@${paused.frame}${paused.playing ? "(still playing!)" : ""}`);
    await tap(`[data-overlay="hotspot"][data-id="${ok}"] .hs-btn`);
    await page.waitForTimeout(1200);
  }
  s = await state();
  check("Explore stops at each hotspot and tapping it continues", stops.length === 6 && !stops.some((x) => x.includes("still")), stops.join(" → ") + ` · then phase ${s.phase}`);
} catch (e) {
  check("script", false, String(e.message).split("\n")[0]);
}
await browser.close().catch(() => {});
server.close();
adb("reverse", "--remove", "tcp:4173");
console.table(results);
