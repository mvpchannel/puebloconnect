/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The legacy template's CSS/JS (main.min.css, style.css, etc.) relies on
  // global, load-order-dependent styles rather than CSS Modules. They are
  // served as-is from /public and linked in the root layout <head>.
  async redirects() {
    // Short address for the 3D city.
    return [{ source: "/city", destination: "/explore-3d", permanent: false }];
  },
};

module.exports = nextConfig;
