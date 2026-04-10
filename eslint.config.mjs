import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/** Базовые правила Next.js + React; расширяйте по мере необходимости */
export default [...compat.extends("next/core-web-vitals", "next/typescript")];
