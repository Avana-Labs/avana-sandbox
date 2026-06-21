import { defineConfig, mergeConfig } from "vitest/config"
import baseConfig from "./vitest.config"

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ["app/lib/borrow-system/__tests__/browser-*.test.tsx"],
      browser: {
        enabled: false,
        name: "chromium",
        provider: "playwright",
        headless: true,
      },
    },
  }),
)
