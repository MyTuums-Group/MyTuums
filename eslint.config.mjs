import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/.turbo/**", "**/coverage/**", "**/*.config.mjs", "**/*.config.ts", "**/drizzle.config.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettierConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    // Fastify route handlers regularly trigger no-misused-promises false positives
    files: ["apps/api/**/*.ts"],
    rules: {
      "@typescript-eslint/no-misused-promises": "off",
    },
  },
  {
    // Forbid JavaScript source files — TypeScript only
    files: ["**/*.js", "**/*.jsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Program",
          message: "JavaScript files are forbidden. Use TypeScript (.ts/.tsx).",
        },
      ],
    },
  },
);
