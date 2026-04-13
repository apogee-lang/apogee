/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["monaco-editor"],
  },
};

export default nextConfig;
