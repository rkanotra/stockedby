import fs from "node:fs";
import path from "node:path";

const BLOG_DIR = path.join(process.cwd(), "content", "blogs");

// Explicit filenames, not a directory glob — keeps the intended reading
// order (post 1 → 2 → 3) predictable regardless of filesystem ordering,
// and means a stray planning doc dropped into content/blogs/ later can't
// silently become a "post" just by existing there. Add new posts here.
const POST_FILES = [
  "blog-1-check-chatgpt-recommends.md",
  "blog-2-checkout-battle-flipkart.md",
  "blog-3-ai-shopping-india-uae-saudi.md",
  "blog-4-npci-unified-agent-protocol-upi.md",
  "blog-5-chatgpt-instant-checkout-acp.md",
  "blog-6-google-ucp-ap2-explained.md",
];

// Minimal frontmatter parser — not a YAML library, because every field
// here is a plain quoted string (title/metaTitle/description/slug/date),
// never nested structures or lists. Good enough for content we author
// ourselves; not meant to survive arbitrary YAML.
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw.trim() };
  const [, fmBlock, content] = match;
  const data = {};
  fmBlock.split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  });
  return { data, content: content.trim() };
}

// Word count / 200wpm, floored at 1 minute — same heuristic every blog
// platform uses, computed from the real body so it can't drift from the
// actual post length.
function readingTime(content) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

let _cache = null;
function loadAllPosts() {
  if (_cache) return _cache;
  _cache = POST_FILES.map((filename) => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, filename), "utf8");
    const { data, content } = parseFrontmatter(raw);
    return { ...data, content, readingMinutes: readingTime(content) };
  });
  return _cache;
}

// Newest first; POST_FILES order is the stable tiebreak when dates match
// (Array#sort is stable in every current JS engine).
export function getAllPosts() {
  return loadAllPosts()
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getPostBySlug(slug) {
  return loadAllPosts().find((p) => p.slug === slug) || null;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Same "21 AUG 2026" mono-caps convention as components/Hero.js's report
// card mock — parsed from the "YYYY-MM-DD" string directly (not `new
// Date(dateString)`) to avoid timezone-shift-by-a-day bugs.
export function formatPostDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
