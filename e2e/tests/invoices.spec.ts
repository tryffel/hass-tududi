import { expect, test } from "@playwright/test";
import { Tududi, login, secrets } from "./helpers";

const keys = secrets();
const giorgio = new Tududi(keys.TUDUDI_GIORGIO_KEY!);
const TUDUDI = "http://localhost:3002/api/v1";

async function dataComments(uid: string): Promise<string[]> {
  const res = await fetch(`${TUDUDI}/task/${uid}/comments`, {
    headers: { Authorization: `Bearer ${keys.TUDUDI_GIORGIO_KEY}` },
  });
  const { comments } = (await res.json()) as {
    comments: { body: string; deleted_at: string | null }[];
  };
  return comments.filter((c) => !c.deleted_at && c.body.includes("hass_tududi")).map((c) => c.body);
}

test.describe("invoices", () => {
  const name = `E2E Gas ${Date.now()}`;

  test.afterAll(async () => {
    for (const task of await giorgio.tasks()) {
      if (task.name === name) await giorgio.deleteTask(task.uid);
    }
  });

  test("create, edit and continue an invoice series", async ({ page }) => {
    await login(page, "giorgio", "/tududi/invoices");
    const panel = page.locator("tududi-panel");

    // New invoice with amount and reference.
    await panel.locator(".new-invoice").click();
    const form = page.locator("tududi-invoice-form");
    await form.locator("input[name=name]").fill(name);
    await form.locator("input[name=due_date]").fill("2026-10-20");
    await form.locator("input[name=amount]").fill("41,50");
    await form.locator("input[name=reference]").fill("RF18 0001");
    await form.locator("select").first().selectOption({ label: "Household bills" });
    await form.getByRole("button", { name: "Add invoice" }).click();
    await expect(form).toHaveCount(0);

    const row = panel.locator(".task", { hasText: name });
    await expect(row).toHaveCount(1);
    await expect(row.locator(".money")).toHaveText("€41.50");

    // Stored in tududi: tag and a data comment.
    const first = await giorgio.findTask(name);
    expect(first?.tags.map((t) => t.name)).toEqual(["invoice"]);
    const comments = await dataComments(first!.uid);
    expect(comments).toHaveLength(1);
    expect(comments[0]).toContain("amount: 41.50");
    expect(comments[0]).toContain('reference: "RF18 0001"');

    // Edit the amount in the detail pane: old data comment is replaced.
    const detail = page.locator("tududi-task-detail");
    await expect(detail).toBeVisible();
    await detail.locator("input[name=amount]").fill("42");
    await detail.locator("input[name=amount]").press("Enter");
    await detail.locator("input[name=reference]").focus();
    await expect(row.locator(".money")).toHaveText("€42.00");
    await expect.poll(() => dataComments(first!.uid)).toEqual([
      expect.stringContaining("amount: 42.00"),
    ]);

    // Next invoice: prefilled one month later and linked to the first one.
    await detail.getByRole("button", { name: "Create next invoice" }).click();
    await expect(form.locator("input[name=name]")).toHaveValue(name);
    await expect(form.locator("input[name=due_date]")).toHaveValue("2026-11-20");
    await expect(form.getByText("Link to previous invoice")).toBeVisible();
    await form.locator("input[name=amount]").fill("39.90");
    await form.getByRole("button", { name: "Add invoice" }).click();

    await expect(panel.locator(".task", { hasText: name })).toHaveCount(2);
    await expect(detail.getByRole("button", { name: /Previous/ })).toContainText("€42.00");
    await detail.getByRole("button", { name: /Previous/ }).click();
    await expect(detail.locator("input[name=amount]")).toHaveValue("42.00");
    await expect(detail.getByRole("button", { name: /Next/ })).toContainText("€39.90");
  });
});
