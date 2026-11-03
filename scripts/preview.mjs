// Screenshots and a recording of the load sequence, for design review before deploying.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const root = new URL("../dist/", import.meta.url).pathname;
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  const path = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
  try {
    res.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream" });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
}).listen(4173);

const out = new URL("../preview/", import.meta.url).pathname;
const browser = await chromium.launch();
const shots = [
  { name: "desktop-light", viewport: { width: 1360, height: 900 }, colorScheme: "light" },
  { name: "desktop-dark", viewport: { width: 1360, height: 900 }, colorScheme: "dark" },
  { name: "mobile-light", viewport: { width: 390, height: 844 }, colorScheme: "light", deviceScaleFactor: 2 },
];
for (const shot of shots) {
  const context = await browser.newContext({ ...shot, recordVideo: shot.name === "desktop-light" ? { dir: out, size: shot.viewport } : undefined });
  const page = await context.newPage();
  await page.goto("http://localhost:4173/");
  await page.waitForTimeout(9000); // let the lineage sequence finish
  await page.screenshot({ path: `${out}${shot.name}-hero.png` });
  await page.evaluate(() => document.querySelector("#projects").scrollIntoView());
  await page.mouse.move(500, 380);
  await page.waitForTimeout(400);
  await page.mouse.move(700, 420, { steps: 10 });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${out}${shot.name}-projects.png` });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}${shot.name}-full.png`, fullPage: true });
  await context.close();
}
const reduced = await browser.newContext({ viewport: { width: 1360, height: 900 }, reducedMotion: "reduce" });
const page = await reduced.newPage();
await page.goto("http://localhost:4173/");
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}reduced-motion-hero.png` });
await browser.close();
server.close();
console.log("Preview written to", out);
