/** @type {import('next').NextConfig} */
const nextConfig = {
  // Account, checkout and saved-report surfaces are offline while StockedBy
  // is maintained as a database-free side project. Redirecting at the edge
  // keeps old bookmarks useful without ever rendering a database-backed page.
  async redirects() {
    return [
      { source: "/login", destination: "/", permanent: false },
      { source: "/dashboard/:path*", destination: "/", permanent: false },
      { source: "/checkout/:path*", destination: "/purchase-check", permanent: false },
      { source: "/report/:path*", destination: "/test", permanent: false },
      { source: "/stores/:path*", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
