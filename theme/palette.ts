/**
 * Single source of truth for the color system.
 *
 * Every color is exposed to Tailwind as a CSS variable holding an `r g b` triplet, so the same
 * utility class (for example `bg-stone-100` or `bg-c30442a`) resolves to a different value
 * under `html[data-theme="dark"]`. Light values are the original design colors; dark values
 * are derived by flipping lightness while keeping hue, so the theme cannot drift from the
 * light design.
 */
import colors from "tailwindcss/colors";

import { BRAND_HEXES } from "./brand-colors";

export type Rgb = readonly [number, number, number];

const CHANNEL_MAX = 255;
const HEX_RADIX = 16;
const HEX_LENGTH = 6;
const HUE_SECTORS = 6;
const DEGREES_PER_SECTOR = 60;

/** Lightness of the darkest dark-theme surface and the span it can use. */
export const DARK_LIGHTNESS_FLOOR = 0.07;
export const DARK_LIGHTNESS_SPAN = 0.9;
/** Dark-theme colors are desaturated, and light results more so, so accents do not glow. */
export const DARK_SATURATION_SCALE = 0.85;
export const DARK_BRIGHT_SATURATION_SCALE = 0.6;
export const DARK_BRIGHT_LIGHTNESS = 0.6;

/** Neutrals have no hue to preserve, so they are pinned to tinted values. */
export const DARK_WHITE: Rgb = [38, 43, 33];
export const DARK_BLACK: Rgb = [243, 241, 234];

export const ADAPTIVE_FAMILIES = ["stone", "emerald", "orange", "red"] as const;

export function hexToRgb(hex: string): Rgb {
  const digits = hex.replace("#", "");
  if (digits.length !== HEX_LENGTH) throw new Error(`Expected a 6-digit hex color, got ${hex}`);
  const value = Number.parseInt(digits, HEX_RADIX);
  return [(value >> 16) & CHANNEL_MAX, (value >> 8) & CHANNEL_MAX, value & CHANNEL_MAX];
}

type Hsl = readonly [number, number, number];

function rgbToHsl([red, green, blue]: Rgb): Hsl {
  const r = red / CHANNEL_MAX;
  const g = green / CHANNEL_MAX;
  const b = blue / CHANNEL_MAX;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue: number;
  if (max === r) hue = (g - b) / delta + (g < b ? HUE_SECTORS : 0);
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return [hue * DEGREES_PER_SECTOR, saturation, lightness];
}

function hslToRgb([hue, saturation, lightness]: Hsl): Rgb {
  if (saturation === 0) {
    const gray = Math.round(lightness * CHANNEL_MAX);
    return [gray, gray, gray];
  }
  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const channel = (offset: number) => {
    let t = hue / (HUE_SECTORS * DEGREES_PER_SECTOR) + offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * HUE_SECTORS * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * HUE_SECTORS;
    return p;
  };
  return [
    Math.round(channel(1 / 3) * CHANNEL_MAX),
    Math.round(channel(0) * CHANNEL_MAX),
    Math.round(channel(-1 / 3) * CHANNEL_MAX),
  ];
}

/** Flip lightness around the middle, keep hue, soften saturation. */
export function toDarkRgb(rgb: Rgb): Rgb {
  const [hue, saturation, lightness] = rgbToHsl(rgb);
  const flipped = DARK_LIGHTNESS_FLOOR + DARK_LIGHTNESS_SPAN * (1 - lightness);
  const scale =
    flipped > DARK_BRIGHT_LIGHTNESS ? DARK_BRIGHT_SATURATION_SCALE : DARK_SATURATION_SCALE;
  return hslToRgb([hue, saturation * scale, flipped]);
}

function relativeLuminance([red, green, blue]: Rgb): number {
  const linear = (channel: number) => {
    const value = channel / CHANNEL_MAX;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

/** WCAG 2.x contrast ratio between two colors. */
export function contrastRatio(first: Rgb, second: Rgb): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

export type ColorToken = { name: string; light: Rgb; dark: Rgb };

function familyShades(family: (typeof ADAPTIVE_FAMILIES)[number]): ColorToken[] {
  return Object.entries(colors[family]).map(([shade, hex]) => {
    const light = hexToRgb(hex);
    return { name: `${family}-${shade}`, light, dark: toDarkRgb(light) };
  });
}

/** Every adaptive color, in a stable order. */
export function colorTokens(): ColorToken[] {
  const brand = BRAND_HEXES.map((hex) => {
    const light = hexToRgb(hex);
    return { name: `c${hex}`, light, dark: toDarkRgb(light) };
  });
  return [
    { name: "white", light: [255, 255, 255], dark: DARK_WHITE },
    { name: "black", light: [0, 0, 0], dark: DARK_BLACK },
    ...ADAPTIVE_FAMILIES.flatMap(familyShades),
    ...brand,
  ];
}

const variableName = (token: string) => `--color-${token}`;
const triplet = ([red, green, blue]: Rgb) => `${red} ${green} ${blue}`;

export function cssVariables(): { light: Record<string, string>; dark: Record<string, string> } {
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};
  for (const token of colorTokens()) {
    light[variableName(token.name)] = triplet(token.light);
    dark[variableName(token.name)] = triplet(token.dark);
  }
  return { light, dark };
}

const asColor = (token: string) => `rgb(var(${variableName(token)}) / <alpha-value>)`;

/** Tailwind `theme.extend.colors` backed by the CSS variables. */
export function tailwindColors(): Record<string, string | Record<string, string>> {
  const result: Record<string, string | Record<string, string>> = {
    white: asColor("white"),
    black: asColor("black"),
  };
  for (const family of ADAPTIVE_FAMILIES) {
    result[family] = Object.fromEntries(
      Object.keys(colors[family]).map((shade) => [shade, asColor(`${family}-${shade}`)]),
    );
  }
  for (const hex of BRAND_HEXES) result[`c${hex}`] = asColor(`c${hex}`);
  return result;
}
