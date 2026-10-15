import { defineConfig } from "vite";

// Builds a single ES module served by the integration at
// /tududi_static/tududi-panel.js (custom_components/tududi/frontend/).
export default defineConfig({
  build: {
    lib: {
      entry: "src/tududi-panel.ts",
      formats: ["es"],
      fileName: () => "tududi-panel.js",
    },
    outDir: "../custom_components/tududi/frontend",
    emptyOutDir: false,
    target: "es2022",
    minify: true,
    sourcemap: false,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
