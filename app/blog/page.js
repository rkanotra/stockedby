import Link from "next/link";
import PageShell from "@/components/site/PageShell";
import { getAllPosts, formatPostDate } from "@/lib/blog";
import { buildOpenGraph, buildTwitter } from "@/lib/site";

const TITLE = "Blog — StockedBy";
const DESCRIPTION =
  "How AI recommends brands, and how to make sure it recommends yours — for brands across India and the Gulf.";

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
    <PageShell>
      <div className="wrap blog-hero">
        <span className="page-kicker">THE STOCKEDBY JOURNAL</span>
        <h1>The next era<br />of <em>shopping.</em></h1>
        <p>Ideas, explainers and practical guides for brands navigating AI commerce.</p>
      </div>
      <div className="blog-list">
        {posts.map((post, index) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className={`blog-card ${index === 0 ? "blog-featured" : ""}`}>
            <span className="blog-issue" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span className="blog-card-date">
              {formatPostDate(post.date)} · {post.readingMinutes} min read
            </span>
            <h2>{post.title}</h2>
            <p>{post.description}</p>
            <span className="blog-read">Read the story <span aria-hidden="true">↗</span></span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
