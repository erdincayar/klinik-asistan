import { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { blogPosts } from "@/lib/blog-data";

export const metadata: Metadata = {
  title: "Blog — İşletme Yönetimi ve AI Rehberleri",
  description:
    "Klinik, restoran ve kuaför yönetimi, WhatsApp Business, AI teknolojileri ve dijital pazarlama hakkında güncel yazılar.",
  alternates: { canonical: "https://poby.ai/blog" },
  openGraph: {
    title: "Blog | Poby.ai",
    description:
      "İşletme yönetimi ve AI teknolojileri hakkında güncel yazılar.",
    url: "https://poby.ai/blog",
  },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: "Ana Sayfa", url: "https://poby.ai" },
          { name: "Blog", url: "https://poby.ai/blog" },
        ]}
      />

      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Poby<span className="text-[#c75b12]">.ai</span>
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-[#c75b12] px-5 py-2 text-sm font-semibold text-white hover:bg-[#9e4a0f]"
          >
            Giriş Yap
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Blog
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            İşletme yönetimi, AI teknolojileri ve dijital pazarlama hakkında
            güncel yazılar.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <article
              key={post.slug}
              className="rounded-2xl border border-gray-200 overflow-hidden hover:border-indigo-200 hover:shadow-md transition-all"
            >
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded-full bg-[#fef4ec] px-3 py-1 text-xs font-medium text-[#c75b12]">
                    {post.category}
                  </span>
                  <span className="text-xs text-gray-400">
                    {post.readingTime}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 line-clamp-2">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-[#c75b12] transition-colors"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                  {post.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {new Date(post.publishedAt).toLocaleDateString("tr-TR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-sm font-medium text-[#c75b12] hover:text-[#9e4a0f]"
                  >
                    Devamını Oku
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
