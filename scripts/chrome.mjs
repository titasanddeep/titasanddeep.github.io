// Finds a headless Chrome for the art baker, stills and profiler: CHROME_PATH, else Remotion's cached headless shell.
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export const findChrome = (root) => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const base = path.join(root, "node_modules", ".remotion", "chrome-headless-shell");
  const walk = (dir, depth) => {
    if (depth < 0 || !existsSync(dir)) return null;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isFile() && /^chrome-headless-shell(\.exe)?$/.test(entry.name)) return p;
      if (entry.isDirectory()) {
        const found = walk(p, depth - 1);
        if (found) return found;
      }
    }
    return null;
  };
  const found = walk(base, 4);
  if (found) return found;
  const system = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find((p) => existsSync(p));
  if (system) return system;
  throw new Error("No Chrome found. Run `npx remotion compositions src/remotion/index.ts` once or set CHROME_PATH.");
};
