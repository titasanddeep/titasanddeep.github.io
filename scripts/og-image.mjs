import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findChrome } from "./chrome.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// the last frame of the film (the fully revealed card), read from the timeline
const timeline = readFileSync(path.join(root, "src", "story", "timeline.ts"), "utf8");
const fpb = Number(/export const FPS = (\d+)/.exec(timeline)[1]) / Number(/export const BEAT_FPS = (\d+)/.exec(timeline)[1]);
const LAST_FRAME = Math.max(...[...timeline.matchAll(/\w+: \{ start: \d+, end: (\d+) \}/g)].map(([, end]) => +end * fpb)) - 1;
const work = path.join(root, "out", "og");
mkdirSync(work, { recursive: true });

// 1. the finished card, straight from the composition
const serveUrl = await bundle({ entryPoint: path.join(root, "src/remotion/index.ts"), publicDir: path.join(root, "public") });
const inputProps = { lang: "bn" };
const browserExecutable = findChrome(root);
const composition = await selectComposition({ serveUrl, id: "TitasAndDeepWedding", inputProps, browserExecutable });
const cardPng = path.join(work, "card.png");
await renderStill({ composition, serveUrl, frame: LAST_FRAME, output: cardPng, inputProps, scale: 1, browserExecutable });

// 2. compose
const fonts = (p) => pathToFileURL(path.join(root, "node_modules", p.startsWith("anek") ? "@fontsource-variable" : "@fontsource", p)).href;
const html = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="${fonts("anek-bangla/wght.css")}">
<link rel="stylesheet" href="${fonts("galada/bengali-400.css")}">
<link rel="stylesheet" href="${fonts("cormorant-garamond/latin-400.css")}">
<link rel="stylesheet" href="${fonts("cormorant-garamond/latin-400-italic.css")}">
<link rel="stylesheet" href="${fonts("cormorant-garamond/latin-600.css")}">
<style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;overflow:hidden;position:relative;background:#f5ebdd;color:#30251f;font-family:"Anek Bangla Variable",serif}
  .paper{position:absolute;inset:0;background:url("${pathToFileURL(path.join(root, "public/art/paper.webp")).href}") center/cover}
  .frame{position:absolute;inset:22px;border:2px solid #c49a52;border-radius:6px}
  .frame::after{content:"";position:absolute;inset:8px;border:1px solid rgba(120,31,43,.55);border-radius:3px}
  .panel{position:absolute;right:0;top:0;bottom:0;width:440px;background:radial-gradient(circle at 50% 30%,#62262d 0%,#3b1b1c 60%,#26110f 100%)}
  .card{position:absolute;right:62px;top:48px;height:534px;border-radius:12px;box-shadow:0 18px 40px rgba(0,0,0,.5)}
  .text{position:absolute;left:84px;top:0;bottom:0;width:640px;display:flex;flex-direction:column;justify-content:center}
  .kicker{font-size:30px;color:#781f2b;letter-spacing:.03em}
  .rule{display:flex;align-items:center;gap:12px;margin:10px 0 26px;width:300px}
  .rule i{flex:1;height:2px;background:linear-gradient(90deg,#c49a52,transparent)}
  .rule b{width:12px;height:12px;background:#781f2b;transform:rotate(45deg)}
  .names{font-family:"Galada","Anek Bangla Variable",serif;font-size:118px;line-height:1.2;color:#781f2b}
  .en{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:54px;color:#781f2b;margin-top:-4px}
  .dates{margin-top:26px;font-size:30px;line-height:1.55;color:#30251f}
  .dates span{color:#8f6c2a;font-family:"Anek Bangla Variable",sans-serif;font-weight:600;font-size:24px;margin-right:10px}
  .dates-en{margin-top:8px;font-family:"Cormorant Garamond",serif;font-size:27px;color:#665343;letter-spacing:.02em}
</style>
<div class="paper"></div><div class="frame"></div><div class="panel"></div>
<div class="text">
  <div class="kicker">সাদর আমন্ত্রণ</div>
  <div class="rule"><i></i><b></b></div>
  <div class="names">তিতাস ও দীপ</div>
  <div class="en">Titas &amp; Deep</div>
  <div class="dates"><span>শুভবিবাহ</span>২৫শে নভেম্বর ২০২৬</div>
  <div class="dates-en">Wedding · 25 November 2026 · Kolkata</div>
</div>
<div class="card" style="width:${Math.round((940 * 534) / 1690)}px;overflow:hidden;background:#fbf4e6">
  <img src="${pathToFileURL(cardPng).href}" style="width:${Math.round(1080 * (534 / 1690))}px;margin-left:-${Math.round(70 * (534 / 1690))}px;margin-top:-${Math.round(150 * (534 / 1690))}px;display:block">
</div>
`;
// (the card is the 940×1690 region of the 1080×1920 frame, scaled to 534 px tall)
const doc = html;
const htmlPath = path.join(work, "og.html");
writeFileSync(htmlPath, doc);

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(pathToFileURL(htmlPath).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(root, "public", "og-image.jpg"), type: "jpeg", quality: 90 });
await browser.close();
console.log("wrote public/og-image.jpg");
