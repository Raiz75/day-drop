import { defineConfig } from "vitest/config";

export default defineConfig({
  environment: "happy-dom",
  globals: true,
  setupFiles: ["./vitest.setup.ts"],
  exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
  resolve: { tsconfigPaths: true },
});
