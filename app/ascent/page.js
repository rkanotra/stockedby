import Ascent, { AscentGate } from "@/components/ascent/Ascent";
import { requireAscentUser } from "@/lib/ascent/server";
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
export default async function AscentPage() {
  let account;
  try {
    account = await requireAscentUser();
  } catch (e) {
    return (
      <AscentGate
        denied={e.status === 403}
        unavailable={e.status !== 401 && e.status !== 403}
      />
    );
  }
  return <Ascent email={account.user.email} />;
}
