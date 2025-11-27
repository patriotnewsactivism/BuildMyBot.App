/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enable standalone output for Docker
  output: 'standalone',
  // Allow images from external domains (for avatars, etc.)
  images: {
    domains: ['localhost'],
  },
};

module.exports = nextConfig;
