/** @type {import('next').NextConfig} */
const nextConfig = {
    // Serve static files directly from the parent directory's assets folder
    // This ensures we share assets with the main POS application without duplication.
    async rewrites() {
      return [
        {
          source: '/assets/:path*',
          destination: '/_assets/:path*',
        },
      ];
    },
};

export default nextConfig;
