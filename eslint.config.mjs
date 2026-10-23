import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/** Базовые правила Next.js + React; расширяйте по мере необходимости */
const eslintConfig = [
  { ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts", "scripts/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["telegram-relay/server.js"],
    languageOptions: { sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];

export default eslintConfig;
