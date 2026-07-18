import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// §3.5 / §17: no component may write a hex color literal, and no Tailwind
// arbitrary color value (e.g. bg-[#1F5F5B] or text-[rgb(...)]) may appear
// in app/ or components/. Every color must go through the @theme token
// layer in app/globals.css. Enforced here so `grep -rE "#[0-9a-fA-F]{6}"
// app/ components/` returns nothing, per the acceptance criterion.
const noHardcodedColor = {
  files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "Literal[value=/#[0-9a-fA-F]{3}\\b|#[0-9a-fA-F]{6}\\b|#[0-9a-fA-F]{8}\\b/]",
        message:
          "No hardcoded hex colors — use a design token from app/globals.css (@theme) instead. See BUILD_SPEC.md §3.5.",
      },
      {
        selector:
          "Literal[value=/-\\[#[0-9a-fA-F]{3,8}\\]|-\\[rgb\\(|-\\[rgba\\(|-\\[hsl\\(/]",
        message:
          "No Tailwind arbitrary color values — use a design token utility instead. See BUILD_SPEC.md §3.5.",
      },
      {
        selector:
          "TemplateElement[value.raw=/#[0-9a-fA-F]{3}\\b|#[0-9a-fA-F]{6}\\b|#[0-9a-fA-F]{8}\\b/]",
        message:
          "No hardcoded hex colors — use a design token from app/globals.css (@theme) instead. See BUILD_SPEC.md §3.5.",
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  noHardcodedColor,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
