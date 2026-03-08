/** @type {import('next').NextConfig} */
const nextConfig = {
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
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' https://graph.facebook.com; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
