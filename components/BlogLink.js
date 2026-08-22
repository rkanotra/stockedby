import Link from "next/link";
import { SITE_URL } from "@/lib/site";

// react-markdown's <a> renderer for post bodies. The posts themselves
// write real absolute URLs (https://stockedby.com, https://stockedby.com
// /audit) — correct and functional as plain links, but this upgrades any
// same-site one to a fast client-side next/link instead of a full page
// load. Anything not on our own domain stays a normal external link.
export default function BlogLink({ href, children }) {
  if (href?.startsWith(SITE_URL)) {
    const path = href.slice(SITE_URL.length) || "/";
    return <Link href={path}>{children}</Link>;
  }
  if (href?.startsWith("/")) {
    return <Link href={href}>{children}</Link>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
