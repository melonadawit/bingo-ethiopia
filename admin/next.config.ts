import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // redirects are not supported in static export
  // async redirects() {
  //   return [
  //     {
  //       source: '/dashboard',
  //       destination: '/overview',
  //       permanent: true,
  //     },
  //   ];
  // },
};

export default nextConfig;
