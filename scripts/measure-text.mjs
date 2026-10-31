// Measures in-picture text with the shipped fonts in headless Chrome, for the constants that must follow the text
// (heading rule widths in src/scene/text.ts, how many lines the card's message wraps to in src/scene/invitation.ts).
// Usage: node scripts/measure-text.mjs   (prints a table; re-run after changing a string or a text style)
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome } from "./chrome.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const font = (rel) => `url(data:font/woff2;base64,${readFileSync(path.join(root, "node_modules", rel)).toString("base64")}) format("woff2")`;
const faces = `
@font-face { font-family: "Anek Bangla Variable"; font-weight: 100 800; src: ${font("@fontsource-variable/anek-bangla/files/anek-bangla-bengali-wght-normal.woff2")}; unicode-range: U+0951-0952,U+0964-0965,U+0980-09FE,U+1CD0,U+1CD2,U+1CD5-1CD6,U+1CD8,U+1CE1,U+1CEA,U+1CED,U+1CF2,U+1CF5-1CF7,U+200C-200D,U+20B9,U+25CC,U+A8F1; }
@font-face { font-family: "Anek Bangla Variable"; font-weight: 100 800; src: ${font("@fontsource-variable/anek-bangla/files/anek-bangla-latin-wght-normal.woff2")}; unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family: "Galada"; font-weight: 400; src: ${font("@fontsource/galada/files/galada-bengali-400-normal.woff2")}; }
@font-face { font-family: "Cormorant Garamond"; font-weight: 400; src: ${font("@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2")}; }
@font-face { font-family: "Cormorant Garamond"; font-weight: 400; font-style: italic; src: ${font("@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff2")}; }
@font-face { font-family: "Cormorant Garamond"; font-weight: 500; src: ${font("@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2")}; }
@font-face { font-family: "Cormorant Garamond"; font-weight: 600; src: ${font("@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2")}; }`;

const BN = '"Anek Bangla Variable", sans-serif';
const EN = '"Cormorant Garamond", serif';
const { translations: T } = await import(`file://${path.join(root, "src/content/translations.ts").replace(/\\/g, "/")}`).catch(() => ({ translations: null }));
const strings = T ?? JSON.parse(process.argv[2] ?? "{}");

const heading = (lang) =>
  lang === "bn"
    ? `font-family:${BN};font-weight:500;font-size:64px;line-height:1.45;padding:0 0.2em;letter-spacing:0.01em`
    : `font-family:${EN};font-weight:600;font-size:44px;line-height:1.45;padding:0 0.2em;letter-spacing:0.12em;text-transform:uppercase`;
const message = (lang) =>
  lang === "bn"
    ? `font-family:${BN};font-weight:500;font-size:44px;line-height:1.55;max-width:740px;white-space:normal;text-align:center`
    : `font-family:${EN};font-style:italic;font-weight:400;font-size:54px;line-height:1.3;max-width:740px;white-space:normal;text-align:center`;

const items = [];
for (const lang of ["bn", "en"]) {
  for (const k of ["headingHolud", "headingWedding"]) items.push({ id: `${lang}.${k}`, text: strings[lang][k], css: heading(lang) });
  for (const k of ["invitationMessage"]) items.push({ id: `${lang}.${k}`, text: strings[lang][k], css: message(lang), lines: lang === "bn" ? 44 * 1.55 : 54 * 1.3 });
}

const browser = await chromium.launch({ executablePath: findChrome(root), headless: true });
const page = await browser.newPage();
await page.setContent(`<!doctype html><style>${faces} body{margin:0} div{display:inline-block;width:max-content;white-space:nowrap}</style><body></body>`);
const out = await page.evaluate(async (list) => {
  const res = [];
  for (const it of list) {
    const d = document.createElement("div");
    d.style.cssText += it.css;
    d.textContent = it.text;
    document.body.appendChild(d);
  }
  await document.fonts.ready;
  const els = [...document.body.children];
  for (const [i, it] of list.entries()) {
    const r = els[i].getBoundingClientRect();
    res.push({ id: it.id, width: Math.round(r.width * 100) / 100, lines: it.lines ? Math.round(r.height / it.lines) : undefined });
  }
  return res;
}, items);
for (const r of out) console.log(r.id.padEnd(28), String(r.width).padStart(8), r.lines ? `${r.lines} lines` : "");
await browser.close();
