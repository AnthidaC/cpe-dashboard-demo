/** @type {import('next').NextConfig} */
// If deployed to https://<username>.github.io/<repo-name>, set NEXT_PUBLIC_BASE_PATH=<repo-name>
const repoName = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: repoName ? `/${repoName}` : undefined,
  assetPrefix: repoName ? `/${repoName}/` : undefined,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
