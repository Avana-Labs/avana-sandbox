import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["app/**/__tests__/**/*.{test,spec}.{ts,tsx}", "tests/unit/**/*.test.ts", "convex/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/__tests__/flow.harness.ts",
      "**/__tests__/**/stress-fixtures.ts",
      "**/__tests__/**/fixtures.ts",
      "**/__tests__/**/oracle.ts",
      "**/__tests__/**/sandbox-adapter-contract.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Next.js `server-only` guard isn't resolvable under vitest; stub it.
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
})
