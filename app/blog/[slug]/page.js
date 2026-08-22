import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import BlogLink from "@/components/BlogLink";
import BlogCta from "@/components/BlogCta";
import JsonLd from "@/components/JsonLd";
import { getAllPosts, getPostBySlug, formatPostDate } from "@/lib/blog";
import { SITE_URL, buildOpenGraph, buildTwitter } from "@/lib/site";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post not found — StockedBy" };

  const title = post.metaTitle || `${post.title} — StockedBy`;
  return {
    title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: buildOpenGraph({ title, description: post.description, path: `/blog/${post.slug}` }),
    twitter: buildTwitter({ title, description: post.description }),
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: "StockedBy", url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "StockedBy",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/apple-icon.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <Nav />
      <article className="article">
        <div className="article-meta">
          {formatPostDate(post.date)} · {post.readingMinutes} min read
        </div>
        <h1>{post.title}</h1>
        <div className="article-body">
          <ReactMarkdown components={{ a: BlogLink }}>{post.content}</ReactMarkdown>
        </div>
      </article>
      <BlogCta />
      <Footer />
    </>
  );
}
