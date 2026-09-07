import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Protótipo do Figma importado como referência visual (ver docs/REDESIGN_PLAN.md).
    // Não é código de produção, não é compilado no app e não deve ser lintado
    // com as regras do app — o lint dele só produz ruído que esconde erro real.
    "figma/**",
  ]),
]);

export default eslintConfig;
