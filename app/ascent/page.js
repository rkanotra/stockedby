import { AscentEntry } from "@/components/ascent/Ascent";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "ASCENT — Executive Studio",
  description: "Private executive practice.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "ASCENT — Executive Studio",
    description: "Private executive practice.",
  },
};
export default function AscentPage() {
  // The authenticated API can renew cookies; a Server Component cannot.
  // No account information or saved content is included in this public shell.
  return <AscentEntry />;
}
