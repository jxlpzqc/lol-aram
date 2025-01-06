const version = require('../package.json').version;

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: "export",
  distDir: process.env.NODE_ENV === 'production' ? '../app' : '.next',
  trailingSlash: true,
  env: {
    version,
    DEFAULT_SERVER: process.env.DEFAULT_SERVER || "",
  },
  images: {
    unoptimized: true
  },
  reactStrictMode: false,
};

module.exports = nextConfig;
