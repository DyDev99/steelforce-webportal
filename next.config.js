/**
 * Where this Next.js server reaches the API.
 * In local development, it proxies requests through Next.js rewrites to bypass browser CORS checks.
 */
const backendTargetUrl =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.API_PROXY_URL ||
  'https://www.pnc-spts-stg-api.me';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'standalone',
  skipTrailingSlashRedirect: true,

  async redirects() {
    return [
      {
        source: '/products',
        destination: '/materials',
        permanent: false,
      },
      {
        source: '/products/:path*',
        destination: '/materials/:path*',
        permanent: false,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendTargetUrl}/api/:path*`,
      },
      {
        source: '/docs/:path*',
        destination: `${backendTargetUrl}/docs/:path*`,
      },
      {
        source: '/files/:path*',
        destination: `${backendTargetUrl}/files/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
