/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
// Allow workflow to set BASE_PATH dynamically. If empty string, treat as undefined
const envBasePath = process.env.BASE_PATH;
const basePath = envBasePath && envBasePath.length > 0 ? envBasePath : undefined;

const nextConfig = {
  // Static export for GitHub Pages
  output: 'export',
  // Prevent Next/Image optimization on static export
  images: { unoptimized: true },
  // Set dynamic basePath/assetPrefix only when provided
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  // Optional: trailingSlash helps with GitHub Pages directory-style hosting
  trailingSlash: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
