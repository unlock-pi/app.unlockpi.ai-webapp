import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next. These are relative to
  // THIS config file's own location (repo root) — since the Next.js app now
  // lives at apps/web/, not the repo root, the root-only patterns need an
  // apps/*/ variant too, or ESLint just... lints the built output directory
  // as source. (It does. All 3,591 files of it. Ask how we found out.)
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "apps/*/.next/**",
    "out/**",
    "apps/*/out/**",
    "build/**",
    "apps/*/build/**",
    "next-env.d.ts",
    "apps/*/next-env.d.ts",
    // Turborepo's local task cache — never source, never worth linting.
    ".turbo/**",
    "apps/*/.turbo/**",
    "packages/*/.turbo/**",
  ]),
  // ── Workspace boundaries ──────────────────────────────────────────────
  // These exist so the packages split actually holds over time, not just on
  // the day it's introduced — see packages/blocks/README.md. Without a rule
  // catching it, a package quietly reaching back into the app's `@/*` alias
  // (or one block concept importing another's internals) is an easy,
  // findable-too-late mistake for four people working across these
  // boundaries at once.
  //
  // Each block below repeats the shared `@/*` restriction rather than
  // relying on it cascading down from one shared rule — ESLint flat config
  // doesn't merge a rule's options across two matching configs, the more
  // specific (later) one simply replaces it. Splitting `@/*` into its own
  // config and hoping a later block only ADDS to it silently drops the `@/*`
  // check wherever a more specific block also matches.
  {
    files: ["packages/**/*.ts", "packages/**/*.tsx"],
    ignores: ["packages/blocks/src/*/**", "packages/ui/src/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/*"],
              message:
                "A package can't import the app's @/* alias — it has to be self-contained (relative imports within its own src/, or a real dependency). Reaching into the app inverts the intended dependency direction.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/blocks/src/*/**/*.ts", "packages/blocks/src/*/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/*"],
              message:
                "A package can't import the app's @/* alias — it has to be self-contained (relative imports within its own src/, or a real dependency). Reaching into the app inverts the intended dependency direction.",
            },
            {
              group: ["../*"],
              message:
                "One block concept (array, circuit, waveform, pn-junction) can't import another's internals directly — that's exactly the coupling this split exists to prevent. If two concepts genuinely need to share something, it belongs in packages/ui, not a cross-import between them.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/ui/src/**/*.ts", "packages/ui/src/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/*"],
              message:
                "A package can't import the app's @/* alias — it has to be self-contained (relative imports within its own src/, or a real dependency). Reaching into the app inverts the intended dependency direction.",
            },
            {
              group: ["@unlockpi/blocks", "@unlockpi/blocks/*"],
              message:
                "packages/ui is the dependency of packages/blocks, never the other way round — importing blocks from ui would create a cycle.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
