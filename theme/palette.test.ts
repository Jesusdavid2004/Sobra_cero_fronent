import { describe, expect, it } from "vitest";

import { BRAND_HEXES } from "./brand-colors";
import {
  colorTokens,
  contrastRatio,
  cssVariables,
  hexToRgb,
  tailwindColors,
  toDarkRgb,
  type Rgb,
} from "./palette";

const MIN_TEXT_CONTRAST = 4.5;

function token(name: string) {
  const found = colorTokens().find((candidate) => candidate.name === name);
  if (!found) throw new Error(`Missing token ${name}`);
  return found;
}

describe("palette", () => {
  it("parses hex colors into channels", () => {
    expect(hexToRgb("#30442a")).toEqual([48, 68, 42]);
    expect(() => hexToRgb("#fff")).toThrow();
  });

  it("makes light colors dark and dark colors light", () => {
    const paper = toDarkRgb(hexToRgb("#f5f3ee"));
    const ink = toDarkRgb(hexToRgb("#1f2a1f"));

    expect(contrastRatio(paper, [0, 0, 0])).toBeLessThan(2);
    expect(contrastRatio(ink, [255, 255, 255])).toBeLessThan(2);
  });

  it("keeps the hue of brand colors", () => {
    const [red, green, blue]: Rgb = toDarkRgb(hexToRgb("#5a803f"));

    expect(green).toBeGreaterThan(red);
    expect(green).toBeGreaterThan(blue);
  });

  it.each(["light", "dark"] as const)("keeps body text readable in the %s theme", (mode) => {
    const text = token("c1f2a1f")[mode];
    const page = token("cf5f3ee")[mode];
    const card = token("white")[mode];

    expect(contrastRatio(text, page)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(contrastRatio(text, card)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(contrastRatio(token("stone-600")[mode], card)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it.each(["light", "dark"] as const)("keeps primary buttons readable in the %s theme", (mode) => {
    const button = token("c30442a")[mode];
    const label = token("white")[mode];

    expect(contrastRatio(button, label)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it("raises dark cards above the page so surfaces keep their elevation", () => {
    const page = token("cf5f3ee").dark;
    const card = token("white").dark;

    expect(contrastRatio(card, [255, 255, 255])).toBeLessThan(contrastRatio(page, [255, 255, 255]));
  });

  it("defines every token for both themes", () => {
    const { light, dark } = cssVariables();

    expect(Object.keys(light)).toEqual(Object.keys(dark));
    expect(Object.keys(light)).toContain("--color-c30442a");
    expect(Object.keys(light)).toContain("--color-stone-600");
  });

  it("exposes every brand hex and the adaptive scales to Tailwind", () => {
    const colors = tailwindColors();

    for (const hex of BRAND_HEXES) expect(colors[`c${hex}`]).toContain(`--color-c${hex}`);
    expect(colors.white).toContain("<alpha-value>");
    expect(Object.keys(colors.stone as Record<string, string>)).toContain("600");
  });
});
