import { publicStore } from "@/lib/agentStore/server";
import { buildAgentText } from "@/lib/agentStore/catalog";
import { SITE_URL } from "@/lib/site";
export const dynamic = "force-dynamic";
export async function GET(request, { params }) {
  const { id } = await params;
  const store = await publicStore(id);
  if (!store) return new Response("Catalog unavailable", { status: 404 });
  return new Response(
    buildAgentText(
      store.published,
      `${SITE_URL}/stores/${id}/catalog.json`,
      store.published_at,
    ),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
