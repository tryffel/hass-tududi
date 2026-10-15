import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8123",
    viewport: { width: 1400, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
