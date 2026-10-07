/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The legacy template's CSS/JS (main.min.css, style.css, etc.) relies on
  // global, load-order-dependent styles rather than CSS Modules. They are
  // served as-is from /public and linked in the root layout <head>.
  // Safe defaults that don't change how pages work: other sites can't put
  // ours in a frame, and browsers don't guess file types.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async redirects() {
    // Short address for the 3D city.
    return [{ source: "/city", destination: "/explore-3d", permanent: false }];
  },
};

module.exports = nextConfig;
