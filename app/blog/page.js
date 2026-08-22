import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { getAllPosts, formatPostDate } from "@/lib/blog";
import { buildOpenGraph, buildTwitter } from "@/lib/site";

const TITLE = "Blog — StockedBy";
const DESCRIPTION =
  "How AI recommends brands, and how to make sure it recommends yours — for brands in India, UAE and Saudi Arabia.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: buildOpenGraph({ title: TITLE, description: DESCRIPTION, path: "/blog" }),
  twitter: buildTwitter({ title: TITLE, description: DESCRIPTION }),
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <>
      <Nav />
      <div className="wrap blog-hero">
        <h1>Blog</h1>
        <p>How AI recommends brands — and how to make sure it recommends yours.</p>
      </div>
      <div className="blog-list">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card rv">
            <span className="blog-card-date">
              {formatPostDate(post.date)} · {post.readingMinutes} min read
            </span>
            <h2>{post.title}</h2>
            <p>{post.description}</p>
          </Link>
        ))}
      </div>
      <Footer />
      <ScrollReveal />
    </>
  );
}
