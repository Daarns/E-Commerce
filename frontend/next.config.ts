import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',
    remotePatterns: [
      // Development — SeaweedFS lokal
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8333',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8888',
        pathname: '/**',
      },
      // Production nanti — ganti dengan domain/IP server kamu
      // {
      //   protocol: 'https',
      //   hostname: 'cdn.tokoku.com',
      //   pathname: '/**',
      // },
    ],
  },
  async headers() {
    const privateRouteHeaders = {
      key: 'X-Robots-Tag',
      value: 'noindex, nofollow, noarchive',
    };

    return [
      '/admin/:path*',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/verify-email/:path*',
      '/cart',
      '/checkout',
      '/wishlist',
      '/profile',
      '/orders/:path*',
      '/chat',
      '/payment/:path*',
    ].map((source) => ({ source, headers: [privateRouteHeaders] }));
  },
};

export default nextConfig;
