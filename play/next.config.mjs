/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/play",
  experimental: {
    optimizePackageImports: ["monaco-editor"],
  },
};

export default nextConfig;
