/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: "export",
  distDir: process.env.NODE_ENV === 'production' ? '../app' : '.next',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  reactStrictMode: false,
};

module.exports = nextConfig;
