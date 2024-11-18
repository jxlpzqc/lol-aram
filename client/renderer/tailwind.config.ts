import type { Config } from "tailwindcss";

export default {
  content: [
    "./renderer/src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./renderer/src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./renderer/src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
} satisfies Config;
