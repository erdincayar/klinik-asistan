import { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://poby.ai";
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/fiyatlandirma`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/ozellikler`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/klinik`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/restoran`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/kuafor`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/iletisim`, lastModified, changeFrequency: "yearly", priority: 0.5 },
  ];

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...blogPages];
}
