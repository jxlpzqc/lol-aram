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
  },
  images: {
    unoptimized: true
  },
  reactStrictMode: false,
};

module.exports = nextConfig;
