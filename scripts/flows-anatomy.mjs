import { chromium } from "playwright-core";
const base = "http://localhost:5173/";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--autoplay-policy=no-user-gesture-required"] });
const errors = [];
const out = [];
async function open(part, step) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(base);
  const parts = Array.from({ length: part }, (_, k) => `p${k + 1}`);
  await page.evaluate((v) => localStorage.setItem("cohsonus.progress.v1", v), JSON.stringify({ anatomy: { part, step, steps: { "x/y": true }, parts } }));
  await page.goto(base + "#/l/anatomy");
  await page.reload();
  await page.getByRole("button", { name: /Continue with part|Start/ }).click();
  if (step === 0) await page.getByRole("button", { name: "Begin" }).click();
  await page.waitForTimeout(300);
  return page;
}
const cont = (page) => page.locator(".lecture-bottom .btn.primary").isEnabled();

// mute & describe: A bass, B kick, C lead, D hats, E chords, F clap
{
  const page = await open(0, 1);
  await page.locator(".play").click();
  const tags = ["low", "low", "high", "high", "mid", "mid"];
  for (let i = 0; i < 6; i++) {
    const strip = page.locator(".strip").nth(i);
    await strip.getByRole("button", { name: "Mute" }).click();
    await strip.getByRole("button", { name: tags[i], exact: true }).click();
  }
  out.push(["mute & tag → continue", await cont(page)]);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(300);
  out.push(["reveal tags", (await page.locator(".tag").allInnerTexts()).join(" / ")]);
  await page.close();
}
// role test on boom bap: order [4,2,0,5,1,3] → chords, hats, kick, melody, snare, bass
{
  const page = await open(0, 4);
  const roles = ["Harmony", "Drums", "Drums", "Melody", "Bass", "Bass"];
  for (let i = 0; i < 6; i++) await page.locator(".strip").nth(i).getByRole("button", { name: roles[i], exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  out.push(["role test, one wrong", await page.locator(".verdict").innerText()]);
  await page.locator(".strip").nth(4).getByRole("button", { name: "Drums", exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  out.push(["role test, fixed", await page.locator(".verdict").innerText(), await cont(page)]);
  await page.close();
}
// same job: boombap order [1,3,5,0,4,2] → bass is B; indie order [5,0,3,4,2,1] → bass is C
{
  const page = await open(1, 0);
  const rows = page.locator(".match-row");
  await rows.nth(0).getByRole("button", { name: "B", exact: true }).click();
  await rows.nth(1).getByRole("button", { name: "C", exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  out.push(["same job round 1", await page.locator(".verdict").innerText()]);
  await page.screenshot({ path: "shots/flow-samejob.png" });
  await page.close();
}
// where it lives
{
  const page = await open(1, 2);
  await page.locator(".play").click();
  await page.waitForTimeout(1500);
  await page.locator(".choices .choice", { hasText: "Kick" }).click();
  await page.locator(".choices .choice", { hasText: "Chords" }).click();
  await page.getByRole("button", { name: "Check" }).click();
  const miss = await page.locator(".verdict").innerText();
  await page.locator(".choices .choice", { hasText: "Bass" }).click();
  await page.getByRole("button", { name: "Check" }).click();
  out.push(["spectrum", miss, "→", await page.locator(".verdict").innerText(), await cont(page)]);
  await page.screenshot({ path: "shots/flow-space.png" });
  await page.close();
}
for (const r of out) console.log(r.join(" | "));
console.log(errors.length ? "ERRORS\n" + errors.join("\n") : "no errors");
await browser.close();
