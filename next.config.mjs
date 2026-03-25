/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
    remotePatterns: [
      { protocol: "https", hostname: "poby.ai" },
    ],
  },
  async redirects() {
    return [
      { source: "/dashboard/patients", destination: "/patients", permanent: true },
      { source: "/dashboard/appointments", destination: "/appointments", permanent: true },
      { source: "/dashboard/finance", destination: "/finance", permanent: true },
      { source: "/dashboard/inventory", destination: "/inventory", permanent: true },
      { source: "/dashboard/employees", destination: "/employees", permanent: true },
      { source: "/dashboard/marketing", destination: "/marketing", permanent: true },
      { source: "/dashboard/messaging", destination: "/messaging", permanent: true },
      { source: "/dashboard/settings", destination: "/settings", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' https://graph.facebook.com; frame-src 'self' https://www.paytr.com; frame-ancestors 'none';",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
