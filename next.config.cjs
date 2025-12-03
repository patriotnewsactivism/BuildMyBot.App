/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // TypeScript and ESLint enabled for production quality
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Handle external packages
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },

  // Image optimization
  images: {
    domains: ['supabase.co', 'firebasestorage.googleapis.com'],
  },
};

module.exports = nextConfig;
