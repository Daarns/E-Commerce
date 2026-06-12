import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
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
};

export default nextConfig;
