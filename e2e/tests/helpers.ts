import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

export const TUDUDI = "http://localhost:3002/api/v1";
export const PASSWORD = "devpassword123";

export function secrets(): Record<string, string> {
  const text = readFileSync(new URL("../../dev/.secrets.env", import.meta.url), "utf8");
  return Object.fromEntries(
    text
      .split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
}

export async function login(page: Page, user: string, path = "/tududi/today") {
  await page.goto(path);
  await page.locator("input[name=username]").fill(user);
  await page.locator("input[name=password]").fill(PASSWORD);
  await page.keyboard.press("Enter");
  await expect(page.locator("tududi-panel .list-header h1")).toBeVisible();
}

export interface ApiTask {
  uid: string;
  name: string;
  status: number;
  note: string | null;
  due_date: string | null;
  tags: { name: string }[];
}

/** Direct tududi API access to verify what the panel wrote. */
export class Tududi {
  constructor(private readonly key: string) {}

  private async req(method: string, path: string, body?: unknown) {
    const res = await fetch(`${TUDUDI}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status}`);
    return res.status === 204 ? null : res.json();
  }

  async tasks(): Promise<ApiTask[]> {
    return (await this.req("GET", "/tasks?type=all&status=all")).tasks;
  }

  async findTask(name: string): Promise<ApiTask | undefined> {
    return (await this.tasks()).find((t) => t.name === name);
  }

  async deleteTask(uid: string) {
    await this.req("DELETE", `/task/${uid}`);
  }
}
