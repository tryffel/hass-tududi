// Ad-hoc screenshots of the Tududi panel for visual review.
// Usage: node screenshot.mjs [view] [width] [height] [user] [click-task-name]
import { chromium } from "@playwright/test";

const [view = "today", width = "1400", height = "900", user = "giorgio", click] =
  process.argv.slice(2);
const HA = "http://localhost:8123";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: +width, height: +height },
  colorScheme: process.env.DARK ? "dark" : "light",
});
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("console error:", msg.text());
});
page.on("pageerror", (err) => console.log("page error:", err.message));

await page.goto(`${HA}/tududi/${view}`);
await page.locator("input[name=username]").fill(user);
await page.locator("input[name=password]").fill("devpassword123");
await page.keyboard.press("Enter");
await page.waitForURL(/\/tududi/);
await page.locator("tududi-panel .task").first().waitFor();
await page.waitForTimeout(500);
if (click) {
  await page.locator("tududi-panel .task", { hasText: click }).first().click();
  await page.locator("tududi-task-detail").waitFor();
  await page.waitForTimeout(300);
}
const suffix = click ? `-${click.replace(/\W+/g, "_")}` : "";
const file = `screenshots/${process.env.DARK ? "dark-" : ""}${user}-${view.replace(/[:/]/g, "_")}-${width}${suffix}.png`;
await page.screenshot({ path: file });
console.log(file);
await browser.close();
