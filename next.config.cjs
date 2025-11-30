/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Ignore build errors for now during migration
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
