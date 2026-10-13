// Usage: node scripts/shot.mjs <hash> <out.png> [action ...]
// actions: click:<selector>  key:<Key>  wait:<ms>  eval:<js>  shot:<file.png>  storage:<json>
import { chromium } from "playwright-core";

const [hash = "#/", out = "shots/page.png", ...actions] = process.argv.slice(2);
const base = process.env.BASE ?? "http://localhost:5173/";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

const storage = actions.find((a) => a.startsWith("storage:"));
if (storage) {
  await page.goto(base);
  await page.evaluate((v) => localStorage.setItem("cohsonus.progress.v1", v), storage.slice(8));
}
await page.goto(base + hash);
if (storage) await page.reload();
await page.waitForTimeout(600);
for (const a of actions) {
  const [kind, ...rest] = a.split(":");
  const arg = rest.join(":");
  if (kind === "click") await page.locator(arg).first().click();
  else if (kind === "key") await page.keyboard.press(arg);
  else if (kind === "wait") await page.waitForTimeout(Number(arg));
  else if (kind === "eval") console.log(JSON.stringify(await page.evaluate(arg)));
  else if (kind === "shot") await page.screenshot({ path: arg });
}
await page.screenshot({ path: out });
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
else console.log("no console errors");
await browser.close();
