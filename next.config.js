/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output is used to produce server.js file which then used as an entrypoint in the docker image.
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: [
        // This should be configurable, but it's complicated. Using 'standalone' above means that the config is computed during build time.
        // The build is done in GitHub Actions and the app is run in a Docker container with --env file passed to it, so the env vars are not available during build time.
        // The alternative is to rewrite the server.js file after the build, but that's hacky.
        'prspr.xyz',
        '*.prspr.xyz',
      ],
    },
    taint: true,
  },
  cacheHandler: require.resolve(
    'next/dist/server/lib/incremental-cache/file-system-cache.js'
  ),
};

module.exports = nextConfig;
