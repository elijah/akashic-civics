// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['akashic-civics'],
  output: 'export',
  distDir: '../docs/playground',
  images: {
    unoptimized: true
  }
};

export default nextConfig;