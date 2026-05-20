/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Standalone output produces a self-contained server file that the Docker image
  // launches as the frontend entrypoint.
  output: 'standalone',
  // Explicitly set turbopack root to frontend directory: the repo root has its own
  // package-lock.json (for repo-wide prettier), so Next would otherwise infer
  // the workspace root one level up and warn.
  turbopack: {
    root: __dirname,
  },
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
