// Bakes the generated SVG art (art/*.svg, listed in art/list.json) into trimmed WebP files in public/art/ and writes
// src/art/manifest.ts: where each image's visible pixels sit in its design coordinates.
//
// Why: phones decode a WebP once and composite it on the GPU; SVG filters and big vector scenes would be re-rasterised
// on every change. Trimming transparent margins keeps GPU texture memory (and flicker on low-memory phones) down.
//
// Usage: npm run art   (or: node scripts/generate-art.mjs [group|name…] && node scripts/bake-art.mjs)
// Uses headless Chrome from Remotion's cache (installed by `npx remotion compositions …`) or CHROME_PATH.
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome } from "./chrome.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artDir = path.join(root, "out", "art-src");
const outDir = path.join(root, "public", "art");
const manifestFile = path.join(root, "src", "art", "manifest.ts");
mkdirSync(outDir, { recursive: true });
mkdirSync(path.dirname(manifestFile), { recursive: true });
mkdirSync(path.dirname(manifestFile), { recursive: true });

const list = JSON.parse(readFileSync(path.join(artDir, "list.json"), "utf8"));

// Serve art/ over http so the SVG and the canvas share an origin (file:// would taint the canvas).
const server = createServer((req, res) => {
  const file = path.join(artDir, decodeURIComponent((req.url ?? "/").split("?")[0]));
  if (req.url === "/") {
    res.setHeader("content-type", "text/html");
    res.end("<!doctype html><meta charset=utf-8><body></body>");
    return;
  }
  if (!file.startsWith(artDir) || !existsSync(file)) {
    res.statusCode = 404;
    res.end();
    return;
  }
  res.setHeader("content-type", "image/svg+xml");
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: findChrome(root), headless: true });

const SUBDIR = {};

/** Rasterise one SVG, trim fully transparent margins, encode WebP. */
const bake = async (page, p) => {
  const { b64, rect } = await page.evaluate(
    async ({ url, w, h, quality, trim }) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      let rect = { x: 0, y: 0, w, h };
      if (trim) {
        const d = ctx.getImageData(0, 0, w, h).data;
        let x0 = w;
        let y0 = h;
        let x1 = -1;
        let y1 = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (d[(y * w + x) * 4 + 3] > 3) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
          }
        }
        if (x1 < 0) x0 = y0 = x1 = y1 = 0;
        const pad = 2;
        x0 = Math.max(0, x0 - pad);
        y0 = Math.max(0, y0 - pad);
        x1 = Math.min(w - 1, x1 + pad);
        y1 = Math.min(h - 1, y1 + pad);
        rect = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
      }
      const out = document.createElement("canvas");
      out.width = rect.w;
      out.height = rect.h;
      out.getContext("2d").drawImage(c, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
      const blob = await new Promise((r) => out.toBlob(r, "image/webp", quality));
      const b64 = await new Promise((r) => {
        const fr = new FileReader();
        fr.onload = () => r(String(fr.result).split(",")[1]);
        fr.readAsDataURL(blob);
      });
      return { b64, rect };
    },
    { url: `${origin}/${p.name}.svg`, w: Math.round(p.bounds.w * p.scale), h: Math.round(p.bounds.h * p.scale), quality: p.quality, trim: p.trim },
  );
  const buf = Buffer.from(b64, "base64");
  const sub = SUBDIR[p.group] ?? "";
  mkdirSync(path.join(outDir, sub), { recursive: true });
  const rel = path.posix.join("art", sub, `${p.name}.webp`);
  writeFileSync(path.join(root, "public", rel), buf);
  const r = (n) => Math.round(n * 100) / 100;
  console.log(`${rel.padEnd(42)} ${(buf.length / 1024).toFixed(0).padStart(5)} KB  ${rect.w}×${rect.h}`);
  return [p.name, { src: rel, x: r(p.bounds.x + rect.x / p.scale), y: r(p.bounds.y + rect.y / p.scale), w: r(rect.w / p.scale), h: r(rect.h / p.scale), bytes: buf.length }];
};

// Keep entries of pieces not re-generated this run (partial re-bakes), replace the rest.
const previous = {};
if (existsSync(manifestFile)) {
  const m = /export const ART = (\{[\s\S]*?\n\}) as const;/.exec(readFileSync(manifestFile, "utf8"));
  if (m) Object.assign(previous, JSON.parse(m[1]));
}
const queue = [...list];
const results = [];
const worker = async () => {
  const page = await browser.newPage();
  await page.goto(`${origin}/`);
  for (let p = queue.shift(); p; p = queue.shift()) results.push(await bake(page, p));
  await page.close();
};
await Promise.all(Array.from({ length: 4 }, worker));
await browser.close();
server.close();

const art = { ...previous, ...Object.fromEntries(results) };
for (const [k, v] of Object.entries(art)) if (!existsSync(path.join(root, "public", v.src))) delete art[k];
const sorted = Object.fromEntries(Object.entries(art).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(
  manifestFile,
  `// Generated by scripts/bake-art.mjs — do not edit. Rectangles are in each piece's design coordinates.\n` +
    `export const ART = ${JSON.stringify(sorted, null, 2)} as const;\n\n` +
    `export type ArtName = keyof typeof ART;\n` +
    `export type ArtRect = { readonly src: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly bytes: number };\n`,
);
const total = Object.values(sorted).reduce((n, v) => n + v.bytes, 0);
console.log(`\n${Object.keys(sorted).length} images, ${(total / 1024).toFixed(0)} KB total → ${path.relative(root, manifestFile)}`);
