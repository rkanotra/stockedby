import { SITE_URL } from "@/lib/site";
import { getAllPosts } from "@/lib/blog";

// Static, real pages only. /report/[slug] is deliberately excluded — those
// are individual merchant test results (dynamic, keyed by a live Supabase
// query we'd have to run at build/request time, and not canonical landing
// content the way the product pages below are), not something to enumerate
// here. /api/* are endpoints, not pages. Blog posts ARE included — real,
// canonical, static content, exactly what a sitemap is for.
export default function sitemap() {
  const now = new Date();
  const pages = [
    { path: "/", changeFrequency: "weekly", priority: 1.0 },
    { path: "/test", changeFrequency: "weekly", priority: 0.9 },
    { path: "/audit", changeFrequency: "monthly", priority: 0.7 },
    { path: "/why", changeFrequency: "monthly", priority: 0.8 },
    { path: "/how", changeFrequency: "monthly", priority: 0.8 },
    { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  ];
  const staticEntries = pages.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
  const postEntries = getAllPosts().map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(`${post.date}T00:00:00Z`),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  return [...staticEntries, ...postEntries];
}
