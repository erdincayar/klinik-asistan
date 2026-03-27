import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { getBlogPost, getAllSlugs, blogPosts } from "@/lib/blog-data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `https://poby.ai/blog/${post.slug}` },
    openGraph: {
      title: `${post.title} | Poby.ai Blog`,
      description: post.description,
      url: `https://poby.ai/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const currentIndex = blogPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;
  const nextPost =
    currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: "Ana Sayfa", url: "https://poby.ai" },
          { name: "Blog", url: "https://poby.ai/blog" },
          { name: post.title, url: `https://poby.ai/blog/${post.slug}` },
        ]}
      />
      <ArticleJsonLd
        title={post.title}
        description={post.description}
        url={`https://poby.ai/blog/${post.slug}`}
        publishedAt={post.publishedAt}
        updatedAt={post.updatedAt}
        author={post.author}
      />

      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Poby<span className="text-[#BE3A21]">.ai</span>
          </Link>
          <Link
            href="/login"
            className="rounded-[4px] bg-[#BE3A21] px-5 py-2 text-sm font-semibold text-white hover:bg-[#9B2D18]"
          >
            Giriş Yap
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-20">
        <article>
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Link
                href="/blog"
                className="text-sm text-[#BE3A21] hover:text-[#9B2D18]"
              >
                Blog
              </Link>
              <span className="text-gray-300">/</span>
              <span className="rounded-full bg-[#FFF5F3] px-3 py-1 text-xs font-medium text-[#BE3A21]">
                {post.category}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl leading-tight">
              {post.title}
            </h1>
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
              <span>{post.author}</span>
              <span>·</span>
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString("tr-TR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span>·</span>
              <span>{post.readingTime}</span>
            </div>
          </header>

          <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-a:text-[#BE3A21]">
            {post.content.split("\n\n").map((paragraph, i) => {
              if (paragraph.startsWith("## ")) {
                return (
                  <h2 key={i} className="text-xl font-bold mt-8 mb-4">
                    {paragraph.replace("## ", "")}
                  </h2>
                );
              }
              if (paragraph.startsWith("### ")) {
                return (
                  <h3 key={i} className="text-lg font-semibold mt-6 mb-3">
                    {paragraph.replace("### ", "")}
                  </h3>
                );
              }
              if (paragraph.startsWith("- ")) {
                const items = paragraph.split("\n");
                return (
                  <ul key={i} className="list-disc pl-6 space-y-1 my-4">
                    {items.map((item, j) => (
                      <li
                        key={j}
                        className="text-gray-700 text-sm leading-relaxed"
                      >
                        {item.replace(/^- \*\*(.*?)\*\*/, "$1").replace(/^- /, "")}
                      </li>
                    ))}
                  </ul>
                );
              }
              if (/^\d+\. /.test(paragraph)) {
                const items = paragraph.split("\n");
                return (
                  <ol key={i} className="list-decimal pl-6 space-y-1 my-4">
                    {items.map((item, j) => (
                      <li
                        key={j}
                        className="text-gray-700 text-sm leading-relaxed"
                      >
                        {item.replace(/^\d+\. /, "")}
                      </li>
                    ))}
                  </ol>
                );
              }
              return (
                <p
                  key={i}
                  className="text-gray-700 text-sm leading-relaxed my-4"
                >
                  {paragraph}
                </p>
              );
            })}
          </div>
        </article>

        {/* Prev / Next Navigation */}
        <nav className="mt-16 flex items-stretch gap-4 border-t border-gray-200 pt-8">
          {prevPost ? (
            <Link
              href={`/blog/${prevPost.slug}`}
              className="flex-1 rounded-[4px] border border-gray-200 p-4 hover:border-indigo-200 transition-colors"
            >
              <span className="text-xs text-gray-400">Önceki Yazı</span>
              <p className="mt-1 text-sm font-semibold text-gray-900 line-clamp-2">
                {prevPost.title}
              </p>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {nextPost ? (
            <Link
              href={`/blog/${nextPost.slug}`}
              className="flex-1 rounded-[4px] border border-gray-200 p-4 hover:border-indigo-200 transition-colors text-right"
            >
              <span className="text-xs text-gray-400">Sonraki Yazı</span>
              <p className="mt-1 text-sm font-semibold text-gray-900 line-clamp-2">
                {nextPost.title}
              </p>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </nav>
      </main>
    </div>
  );
}
