import { expect, test } from "@playwright/test";
import { Tududi, login, secrets } from "./helpers";

const keys = secrets();
const giorgio = new Tududi(keys.TUDUDI_GIORGIO_KEY!);

test.describe("panel", () => {
  const name = `E2E invoice ${Date.now()}`;

  test.afterAll(async () => {
    const task = await giorgio.findTask(name);
    if (task) await giorgio.deleteTask(task.uid);
  });

  test("quick add, edit, complete and delete an invoice", async ({ page }) => {
    await login(page, "giorgio", "/tududi/invoices");
    const panel = page.locator("tududi-panel");
    await expect(panel.locator("h1")).toHaveText("Invoices");

    // Quick add in the Invoices view tags the task with the reminder tag.
    await panel.locator(".quick-add input").fill(name);
    await panel.locator(".quick-add input").press("Enter");
    const row = panel.locator(".task", { hasText: name });
    await expect(row).toBeVisible();
    await expect.poll(async () => (await giorgio.findTask(name))?.tags.map((t) => t.name))
      .toEqual(["invoice"]);

    // Edit due date and note in the detail pane.
    await row.click();
    const detail = page.locator("tududi-task-detail");
    await detail.getByRole("button", { name: "Tomorrow" }).click();
    await detail.locator("textarea").first().fill("Amount 12.34 EUR");
    await detail.locator("textarea").first().blur();
    await expect.poll(async () => (await giorgio.findTask(name))?.note).toBe("Amount 12.34 EUR");
    const due = (await giorgio.findTask(name))!.due_date!;
    expect(due.slice(0, 10)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await expect(row.locator(".due")).toHaveText("Tomorrow");

    // Complete from the list: moves to the Paid group and is done in tududi.
    await row.locator(".check").click();
    await expect(
      panel.locator("section", { has: page.locator("h2", { hasText: "Paid" }) }).getByText(name),
    ).toBeVisible();
    await expect.poll(async () => (await giorgio.findTask(name))?.status).toBe(2);

    // Delete from the detail pane.
    page.once("dialog", (d) => d.accept());
    await detail.getByTitle("Delete task").click();
    await expect(row).toHaveCount(0);
    await expect.poll(async () => await giorgio.findTask(name)).toBeUndefined();
  });

  test("project view shows project notes", async ({ page }) => {
    await login(page, "giorgio", "/tududi/all");
    const panel = page.locator("tududi-panel");
    await panel.locator("nav .nav-item", { hasText: "Household bills" }).click();
    await expect(panel.locator("h1")).toHaveText("Household bills");
    await expect(panel.locator(".project-notes").getByText("Bills info")).toBeVisible();
  });

  test("giulia only sees her own account and shared tasks", async ({ page }) => {
    await login(page, "giulia", "/tududi/all");
    const panel = page.locator("tududi-panel");
    await expect(panel.locator("select.entry")).toHaveCount(0);
    await expect(panel.locator(".task", { hasText: "Book dentist" })).toBeVisible();
    await expect(panel.locator(".task", { hasText: "Internet invoice" })).toBeVisible();
    await expect(panel.locator(".task", { hasText: "Fix bike tyre" })).toHaveCount(0);
  });
});
