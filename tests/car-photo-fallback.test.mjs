import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../lib/carImageSrc.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const { nextCarPhotoSrc } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const primary = "https://example.com/prius.jpg";
const generated = "/cars/toyota-prius-2004-generated.webp";
const placeholder = "/cars/placeholder.svg";

test("primary → generated → placeholder → null", () => {
  assert.equal(nextCarPhotoSrc(primary, generated), generated);
  assert.equal(nextCarPhotoSrc(generated, generated), placeholder);
  assert.equal(nextCarPhotoSrc(placeholder, generated), null);
});

test("primary without extra fallback → placeholder → null", () => {
  assert.equal(nextCarPhotoSrc(primary), placeholder);
  assert.equal(nextCarPhotoSrc(placeholder), null);
});

test("primary equal to generated is not retried", () => {
  assert.equal(nextCarPhotoSrc(generated, generated), placeholder);
});

test("placeholder never loops, even with an extra fallback", () => {
  assert.equal(nextCarPhotoSrc(placeholder), null);
  assert.equal(nextCarPhotoSrc(placeholder, generated), null);
  assert.equal(nextCarPhotoSrc(placeholder, placeholder), null);
});

test("working primary stays selected until onError", () => {
  const component = readFileSync(new URL("../components/CarPhotoImage.tsx", import.meta.url), "utf8");
  assert.match(component, /useState\(src\)/);
  assert.match(component, /onError=\{\(\) => \{\s*const nextSrc = nextCarPhotoSrc\(currentSrc, fallbackSrc\)/);
  assert.equal((component.match(/nextCarPhotoSrc\(currentSrc, fallbackSrc\)/g) ?? []).length, 1);
});
