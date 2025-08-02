import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'http://192.168.1.182:3000', 
    'http://10.147.18.15:3000',
  ],
  reactStrictMode: true,
};

export default nextConfig;
