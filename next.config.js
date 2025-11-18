/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    dirs: ["src"],
  },
  reactStrictMode: true,
  compiler: {
    removeConsole: false,
  },
  experimental: {
    reactCompiler: true,
  },
  serverExternalPackages: ['@resvg/resvg-js'],
  outputFileTracingIncludes: {
    "/api/export/docx": ["./src/config/docx/assets/**/*"],
    // Include Aptos fonts for radar chart generation in all API routes that might use it
    "/api/**/*": ["./src/config/docx/assets/Aptos.ttf", "./src/config/docx/assets/Aptos-Bold.ttf"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vitelis-temp.s3.us-east-1.amazonaws.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude native modules from client-side bundles
      config.resolve.alias = {
        ...config.resolve.alias,
        '@resvg/resvg-js': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
