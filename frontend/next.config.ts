import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Development — SeaweedFS lokal
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8333',
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