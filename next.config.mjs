/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: {
    // Disable ESLint during builds (warnings don't block production)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Already passing TypeScript checks locally
    ignoreBuildErrors: false,
  },
  webpack: (config) => {
    config.resolve.alias['@supabase/supabase-js'] = '@supabase/supabase-js/dist/module/index.js';
    return config;
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
      ],
    },
  ],
};

export default nextConfig;
