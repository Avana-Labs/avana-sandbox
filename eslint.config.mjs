import js from "@eslint/js"
import nextPlugin from "@next/eslint-plugin-next"
import globals from "globals"
import tseslint from "typescript-eslint"
import prettier from "eslint-config-prettier"

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      ".next-dev/**",
      ".next-prod/**",
      "node_modules/**",
      ".reports/**",
      ".claude/**",
      "convex/_generated/**",
      "tailwind.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // `console.error` / `console.warn` are legitimate diagnostics (error boundaries,
      // caught-error handlers); only `console.log`/`debug`/`info` are flagged.
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    // CLI/seed scripts legitimately print progress to stdout and use runtime
    // globals (fetch, URL, process) — `.mjs`/`.cjs` scripts miss the main block's
    // globals otherwise, tripping no-undef.
    files: ["scripts/**/*.{ts,tsx,js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
  // Must stay LAST: disables ESLint stylistic rules that would conflict with
  // Prettier, so formatting is owned solely by `prettier --check`.
  prettier,
)
