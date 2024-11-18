/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {
      config: './renderer/tailwind.config.ts',
    },
  },
};

export default config;
