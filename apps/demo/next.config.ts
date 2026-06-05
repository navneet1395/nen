import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    config.ignoreWarnings = [
      (warning: any) => warning.message.includes('async/await') && warning.message.includes('asyncWebAssembly'),
    ];
    return config;
  },
  serverExternalPackages: ["core-crypto", "@isogeny/server"]
};

export default nextConfig;
