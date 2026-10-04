"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

export default function TrackedLink({ event, href, children, ...props }) {
  return (
    <Link
      href={href}
      onClick={() => trackEvent(event)}
      {...props}
    >
      {children}
    </Link>
  );
}
