// Generates every painted layer, sprite and character part as SVG source in out/art-src/ (git-ignored), plus art/list.json.
// scripts/bake-art.mjs then rasterises them to trimmed WebP and writes src/art/manifest.ts.
// Deterministic (seeded): re-run `npm run art` after tweaking anything in scripts/art/.
// Pass group or piece names to regenerate only those: `node scripts/generate-art.mjs characters`.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { characterArt } from "./art/characters.mjs";
import { propArt } from "./art/props.mjs";
import { settingArt } from "./art/settings.mjs";
import { spriteArt } from "./art/sprites.mjs";

const OUT = new URL("../out/art-src/", import.meta.url);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const only = process.argv.slice(2);
const groups = { settings: settingArt, props: propArt, sprites: spriteArt, characters: characterArt };
const list = [];
for (const [group, make] of Object.entries(groups)) {
  for (const p of make()) {
    if (only.length && !only.includes(group) && !only.includes(p.name)) continue;
    writeFileSync(new URL(`${p.name}.svg`, OUT), p.svg);
    const meta = { ...p, group };
    delete meta.svg;
    list.push(meta);
  }
}
writeFileSync(new URL("list.json", OUT), JSON.stringify(list, null, 1));
console.log(`generated ${list.length} pieces`);
