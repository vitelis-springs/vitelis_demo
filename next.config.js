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
    // Opportunities XLSX export SQL (bundled in TS as well; keep for local/dev fallbacks)
    "/api/deep-dive/[id]/export-opportunities-xlsx": [
      "./src/app/server/modules/deep-dive/export-opportunities/OPPS_QUERY.sql",
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      // Sales Miner report route moved under /sales-miner/reports to avoid
      // clashing with /sales-miner/customers and /sales-miner/signal-catalog.
      {
        source: "/sales-miner/:id(\\d+)",
        destination: "/sales-miner/reports/:id",
        permanent: true,
      },
      {
        source: "/sales-miner/:id(\\d+)/:path*",
        destination: "/sales-miner/reports/:id/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vitelis-temp.s3.us-east-1.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "b1.eu-central-1.storage.railway.app",
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
