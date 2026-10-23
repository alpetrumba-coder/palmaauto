import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

const source = readFileSync(new URL("../components/CarCatalogGrid.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX,
  },
});
const CarCard = () => null;
const HomeCarCard = () => null;
const dependencies = {
  "react/jsx-runtime": jsxRuntime,
  "@/components/CarCard": { CarCard },
  "@/components/HomeCarCard": { HomeCarCard, toHomeCarCardProps: (props) => props },
  "@/lib/cars": { sortCarsForHomepage: (cars) => [...cars] },
};
const exports = {};
runInNewContext(outputText, {
  exports,
  require(name) {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  },
});
const { CarCatalogGrid } = exports;
const localPhoto = "/cars/toyota-prius-2004-generated.webp";
const externalPhoto = "https://example.com/old-vk-cover.jpg";

function findCards(element, cardType) {
  if (Array.isArray(element)) return element.flatMap((child) => findCards(child, cardType));
  if (!element || typeof element !== "object") return [];
  if (element.type === cardType) return [element];
  return findCards(element.props?.children, cardType);
}

for (const variant of ["default", "home"]) {
  for (const [label, slug, images, expected] of [
    ["Prius with stale external cover", "toyota-prius", [{ url: externalPhoto }], localPhoto],
    ["Prius without images", "toyota-prius", [], localPhoto],
    ["Prius with placeholder", "toyota-prius", [{ url: "/cars/placeholder.svg" }], localPhoto],
    ["another car with external cover", "toyota-corolla", [{ url: externalPhoto }], externalPhoto],
    ["another car without images", "toyota-corolla", [], null],
  ]) {
    test(`${variant}: ${label}`, () => {
      const car = {
        id: "test-car", slug, images, make: "Toyota", model: "Test",
        pricePerDayRub: 3000, modelYear: 2004, color: "silver",
      };
      const tree = CarCatalogGrid({ cars: [car], variant });
      const cards = findCards(tree, variant === "home" ? HomeCarCard : CarCard);
      assert.equal(cards.length, 1);
      assert.equal(cards[0].props.coverUrl, expected);
      assert.equal(cards[0].props.fallbackSrc, slug === "toyota-prius" ? localPhoto : undefined);
    });
  }
}
