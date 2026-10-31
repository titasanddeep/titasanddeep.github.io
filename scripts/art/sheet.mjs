// Contact sheet for review: node scripts/art/sheet.mjs <out.png> <art name | path/to.png …> [--cols=4] [--cell=360]
// Draws each named public/art/*.webp (fitted in a cell, on a checkerboard so transparency shows) in headless Chrome.
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome } from "../chrome.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const opt = (k, d) => Number(args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const [out, ...names] = args.filter((a) => !a.startsWith("--"));
const cols = opt("cols", 4);
const cell = opt("cell", 360);
const src = (n) =>
  n.endsWith(".png")
    ? `data:image/png;base64,${readFileSync(path.resolve(root, n)).toString("base64")}`
    : `data:image/webp;base64,${readFileSync(path.join(root, "public", "art", `${n}.webp`)).toString("base64")}`;
const browser = await chromium.launch({ executablePath: findChrome(root), headless: true });
const page = await browser.newPage();
const b64 = await page.evaluate(
  async ({ items, cols, cell }) => {
    const rows = Math.ceil(items.length / cols);
    const c = document.createElement("canvas");
    c.width = cols * cell;
    c.height = rows * (cell + 24);
    const g = c.getContext("2d");
    g.fillStyle = "#777";
    g.fillRect(0, 0, c.width, c.height);
    for (const [i, it] of items.entries()) {
      const img = new Image();
      img.src = it.src;
      await img.decode();
      const x = (i % cols) * cell;
      const y = Math.floor(i / cols) * (cell + 24);
      for (let yy = 0; yy < cell; yy += 16) for (let xx = 0; xx < cell; xx += 16) {
        g.fillStyle = (xx + yy) % 32 ? "#bbb" : "#ddd";
        g.fillRect(x + xx, y + yy, 16, 16);
      }
      const k = Math.min(cell / img.width, cell / img.height);
      g.drawImage(img, x + (cell - img.width * k) / 2, y + (cell - img.height * k) / 2, img.width * k, img.height * k);
      g.fillStyle = "#fff";
      g.font = "14px sans-serif";
      g.fillText(it.name, x + 4, y + cell + 17);
    }
    return c.toDataURL("image/png").split(",")[1];
  },
  { items: names.map((n) => ({ name: path.basename(n), src: src(n) })), cols, cell },
);
writeFileSync(out, Buffer.from(b64, "base64"));
await browser.close();
console.log("wrote", out);
