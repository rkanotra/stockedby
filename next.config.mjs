/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["ffmpeg-static", "exceljs", "unzipper"],
  outputFileTracingIncludes: {
    "/api/ascent/reviews": ["./node_modules/ffmpeg-static/ffmpeg"],
    "/api/ascent/process": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
  // Retired product entry points route to the investment site; saved records remain intact.
  async redirects() {
    return [
      ...["/studio/:path*","/workspace/:path*","/ascent/:path*"].map(source=>({source,destination:"/terminal",permanent:false})),
      ...["/test/:path*","/audit/:path*","/fix/:path*","/purchase-check/:path*","/agent-store/:path*","/archive/:path*","/blog/:path*","/why","/how"].map(source=>({source,destination:"/",permanent:false})),
      { source: "/login", destination: "/terminal", permanent: false },
      { source: "/dashboard/:path*", destination: "/", permanent: false },
      { source: "/checkout/:path*", destination: "/purchase-check", permanent: false },
      { source: "/report/:path*", destination: "/test", permanent: false },
      { source: "/stores/:path*", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
