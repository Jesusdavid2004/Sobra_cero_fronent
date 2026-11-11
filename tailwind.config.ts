import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

import { cssVariables, tailwindColors } from "./theme/palette";

const variables = cssVariables();

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: { extend: { colors: tailwindColors() } },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ":root": variables.light,
        'html[data-theme="dark"]': variables.dark,
      });
    }),
  ],
} satisfies Config;
