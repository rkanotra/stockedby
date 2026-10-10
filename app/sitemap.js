import { SITE_URL } from "@/lib/site";
import { getAllPosts } from "@/lib/blog";

// Public, canonical pages only. Accounts, dashboards and saved report routes
// are offline in side-project mode and deliberately excluded.
export default function sitemap() {
  const now = new Date();
  const pages = [
    { path: "/", changeFrequency: "weekly", priority: 1.0 },
    { path: "/test", changeFrequency: "weekly", priority: 0.9 },
    { path: "/purchase-check", changeFrequency: "yearly", priority: 0.5 },
    { path: "/audit", changeFrequency: "monthly", priority: 0.7 },
    { path: "/fix", changeFrequency: "monthly", priority: 0.7 },
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
