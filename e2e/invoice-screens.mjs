// Screenshots of the invoice flow for visual review (does not modify data).
import { chromium } from "@playwright/test";

const HA = "http://localhost:8123";
const width = +(process.argv[2] ?? 1400);
const height = +(process.argv[3] ?? 900);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
page.on("pageerror", (err) => console.log("page error:", err.message));

await page.goto(`${HA}/tududi/invoices`);
await page.locator("input[name=username]").fill("giorgio");
await page.locator("input[name=password]").fill("devpassword123");
await page.keyboard.press("Enter");
await page.locator("tududi-panel .task").first().waitFor();
await page.waitForTimeout(500);
await page.screenshot({ path: `screenshots/invoices-list-${width}.png` });

await page.locator("tududi-panel .new-invoice").click();
const form = page.locator("tududi-invoice-form");
await form.locator("input[name=name]").fill("Water invoice");
await form.locator("input[name=due_date]").fill("2026-11-15");
await form.locator("input[name=amount]").fill("33,40");
await form.locator("input[name=reference]").fill("RF18 5555 1234");
await page.waitForTimeout(300);
await page.screenshot({ path: `screenshots/invoices-form-${width}.png` });
await form.getByRole("button", { name: "Cancel" }).click();

await page.locator("tududi-panel .task", { hasText: "Water invoice" }).first().click();
await page.locator("tududi-task-detail").waitFor();
await page.waitForTimeout(300);
await page.screenshot({ path: `screenshots/invoices-detail-${width}.png` });
await browser.close();
console.log("done");
