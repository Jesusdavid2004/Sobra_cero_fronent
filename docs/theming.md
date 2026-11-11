# Theming (light, dark, system)

The theme follows the OS by default, can be overridden (system / light / dark) from the header
and is persisted by `next-themes` (`attribute="data-theme"`, key `sc_theme`). `next-themes`
sets the attribute before first paint, so there is no flash of the wrong theme.

## How colors work

Every color is a CSS variable holding an `r g b` triplet, defined twice:

- `:root` holds the light values (the original design colors).
- `html[data-theme="dark"]` holds the dark values.

Tailwind maps its color names to those variables (`rgb(var(--color-…) / <alpha-value>)`), so
one class such as `bg-stone-100`, `text-white` or `bg-c30442a/80` resolves to the right value
in each theme and opacity modifiers keep working. Components therefore contain **no `dark:`
variants**.

| File                    | Role                                                                             |
| ----------------------- | -------------------------------------------------------------------------------- |
| `theme/brand-colors.ts` | The 82 brand hex values found in the original design, one token each (`c<hex>`). |
| `theme/palette.ts`      | Builds the variables and the Tailwind colors, and derives dark values.           |
| `tailwind.config.ts`    | Registers the colors and injects the variables.                                  |
| `app/globals.css`       | Page background, form controls, focus ring.                                      |

## Dark palette

Dark values are derived, not hand-picked: lightness is flipped around the middle (`l' = 0.07 +
0.9 · (1 − l)`), hue is kept and saturation is reduced (more so for bright results). The
`stone`, `emerald`, `orange` and `red` scales are flipped the same way, and `white` / `black`
are pinned (`white` becomes a card surface slightly lighter than the page, so elevation is
kept). Brand colors keep their original names (`c<hex>`) so the migration was lossless;
semantic names can replace them gradually.

`theme/palette.test.ts` checks WCAG contrast (≥ 4.5:1) for body text, secondary text and
primary buttons in both themes.

## Known limits

- Because the flip is automatic, large dark blocks in the light design (for example the shop
  dashboard header) become light blocks in the dark theme.
- Hard-edged button shadows (`shadow-[0_5px_0_#…]`) keep their original dark color.
- Uploaded lot photos are not adapted.

## Adding colors

Use an existing token or Tailwind scale. For a new brand color, add its hex to
`theme/brand-colors.ts`; it gets a dark value automatically.
