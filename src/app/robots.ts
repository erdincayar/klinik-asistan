import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/api/", "/admin/", "/settings/", "/patients/", "/appointments/", "/finance/", "/inventory/", "/employees/", "/marketing/", "/messaging/", "/hr/", "/billing/", "/reports/", "/reminders/"],
      },
    ],
    sitemap: "https://poby.ai/sitemap.xml",
    host: "https://poby.ai",
  };
}
