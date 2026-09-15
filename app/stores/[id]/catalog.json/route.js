import { publicStore } from "@/lib/agentStore/server";
import { buildAgentCatalog } from "@/lib/agentStore/catalog";
export const dynamic = "force-dynamic";
export async function GET(request, { params }) {
  const { id } = await params;
  const store = await publicStore(id);
  if (!store)
    return Response.json({ error: "Catalog unavailable" }, { status: 404 });
  return Response.json(buildAgentCatalog(store.published, store.published_at), {
    headers: {
      "Content-Type": "application/ld+json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
