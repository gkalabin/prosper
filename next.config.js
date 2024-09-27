/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: [process.env.PUBLIC_APP_HOST].filter(x => x != undefined),
    },
  },
};

module.exports = nextConfig;
