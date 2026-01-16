import type { NextConfig } from "next";
import packageJson from './package.json';

const nextConfig: NextConfig = {

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    instrumentationHook: true,
  },

  generateBuildId: () => packageJson.version,
};

export default nextConfig;
