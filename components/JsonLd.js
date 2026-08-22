// Renders one JSON-LD structured-data block. Follows Next.js's own
// documented pattern (a native <script> tag, not next/script — JSON-LD is
// data, not executable code) — escaping "<" so a stray value can't break
// out of the script tag.
export default function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
