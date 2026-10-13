// Drives interactive steps in a real browser and reports what happened.
import { chromium } from "playwright-core";

const base = process.env.BASE ?? "http://localhost:5173/";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--autoplay-policy=no-user-gesture-required"] });
const results = [];
const errors = [];

async function open(lecture, part, step) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(base);
  const parts = Array.from({ length: part }, (_, k) => `p${k + 1}`);
  await page.evaluate((v) => localStorage.setItem("cohsonus.progress.v1", v), JSON.stringify({ [lecture]: { part, step, steps: { "x/y": true }, parts } }));
  await page.goto(base + `#/l/${lecture}`);
  await page.reload();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /Continue with part|Start/ }).click();
  if (step === 0) await page.getByRole("button", { name: "Begin" }).click();
  await page.waitForTimeout(300);
  return page;
}

/** seconds until the playing loop reaches `step` (mod `cycle`) as heard */
const until = (page, step, cycle) =>
  page.evaluate(
    ([step, cycle]) => {
      const p = window.__players.find((x) => x.playing);
      const loop = p.getLoop();
      const sd = 60 / loop.bpm / loop.stepsPerBeat;
      const c = p.channel(p.channelIds()[0]).analyser.context;
      const ts = c.getOutputTimestamp();
      const pos = p.positionAt(ts.contextTime + (performance.now() - ts.performanceTime) / 1000) % cycle;
      return (((step - pos + cycle) % cycle) || cycle) * sd;
    },
    [step, cycle],
  );

const verdict = (page) => page.locator(".verdict").first().innerText();

// 1. tap tempo at 124
{
  const page = await open("pulse", 0, 0);
  await page.locator(".play").first().click();
  await page.waitForTimeout(500);
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(60000 / 124 - 8);
  }
  results.push(["tap tempo", await verdict(page)]);
  results.push(["tap continue enabled", await page.getByRole("button", { name: "Continue" }).isEnabled()]);
  await page.close();
}

// 2. find the one: tap three times on bar starts
{
  const page = await open("pulse", 0, 2);
  await page.locator(".play").first().click();
  await page.waitForTimeout(800);
  for (let i = 0; i < 3; i++) {
    const s = await until(page, 0, 16);
    await page.waitForTimeout(s * 1000 - 15);
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(2200);
  results.push(["find the one", await page.locator(".prompt").first().innerText(), await verdict(page)]);
  await page.close();
}

// 3. four on the floor
{
  const page = await open("pulse", 0, 3);
  const cells = page.locator(".grid-row").first().locator(".cell");
  for (let i = 0; i < 4; i++) await cells.nth(i).click();
  results.push(["four on the floor", await verdict(page)]);
  await page.close();
}

// 4. rebuild boom bap: kick 0,3,5 snare 2,6
{
  const page = await open("pulse", 1, 2);
  const rows = page.locator(".studio .grid-row");
  for (const i of [0, 3, 5]) await rows.nth(0).locator(".cell").nth(i).click();
  for (const i of [2, 7]) await rows.nth(1).locator(".cell").nth(i).click();
  await page.getByRole("button", { name: "Check" }).click();
  const first = await verdict(page);
  await rows.nth(1).locator(".cell").nth(7).click();
  await rows.nth(1).locator(".cell").nth(6).click();
  await page.getByRole("button", { name: "Check" }).click();
  results.push(["rebuild", first, await verdict(page)]);
  await page.close();
}

// 5. live record: hit kick on beats 1,3 and snare on 2,4 for two bars, then quantize
{
  const page = await open("pulse", 3, 4);
  await page.getByRole("button", { name: "Record" }).click();
  const s = await until(page, 0, 32);
  await page.waitForTimeout(s * 1000 - 30);
  const beat = 60000 / 90;
  const t0 = Date.now();
  for (let b = 0; b < 8; b++) {
    const wait = t0 + b * beat - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
    await page.keyboard.press(b % 2 === 0 ? "f" : "j");
  }
  await page.waitForTimeout(beat * 1.6);
  const hits = await page.locator(".tl-hit").count();
  const cx = await page.locator(".tl-hit").evaluateAll((els) => els.map((e) => Math.round(Number(e.getAttribute("cx")))));
  await page.locator(".field input[type=range]").fill("100");
  await page.waitForTimeout(400);
  const cx2 = await page.locator(".tl-hit").evaluateAll((els) => els.map((e) => Math.round(Number(e.getAttribute("cx")))));
  results.push(["live record hits", hits, JSON.stringify(cx), "quantized", JSON.stringify(cx2)]);
  results.push(["live record continue", await page.getByRole("button", { name: "Continue" }).isEnabled()]);
  await page.close();
}

// 6. final beat rules
{
  const page = await open("pulse", 5, 0);
  const rows = page.locator(".studio .grid-row");
  for (const i of [0, 6, 10]) await rows.nth(0).locator(".cell").nth(i).click();
  for (const i of [4, 12]) await rows.nth(1).locator(".cell").nth(i).click();
  for (let i = 0; i < 16; i += 2) await rows.nth(2).locator(".cell").nth(i).click();
  await page.getByRole("button", { name: "Copy bar 1 to all" }).click();
  await page.getByRole("tab", { name: "Bar 4" }).click();
  for (const i of [13, 14, 15]) await rows.nth(4).locator(".cell").nth(i).click();
  const before = await page.locator(".rules li.ok").count();
  await page.getByRole("button", { name: "Velocity" }).click();
  const box = await rows.nth(2).locator(".cell").nth(2).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 40, { steps: 5 });
  await page.mouse.up();
  results.push(["final rules", before, await page.locator(".rules li.ok").count(), "continue", await page.getByRole("button", { name: "Continue" }).isEnabled()]);
  await page.screenshot({ path: "shots/flow-final.png" });
  await page.close();
}

for (const r of results) console.log(r.join(" | "));
console.log(errors.length ? "ERRORS\n" + errors.join("\n") : "no errors");
await browser.close();
