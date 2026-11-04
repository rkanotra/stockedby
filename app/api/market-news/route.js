import { fetchNews } from '@/lib/terminal/news';
import { fetchDashboardNews } from '@/lib/dashboard/news';
export const maxDuration=60;
// Public headline metadata only. Never include account context here.
export async function GET(request){try{const dashboard=new URL(request.url).searchParams.get('view')==='dashboard';const wire=await (dashboard?fetchDashboardNews():fetchNews());return Response.json(wire,{headers:{'Cache-Control':dashboard?'public, s-maxage=600, stale-while-revalidate=600':'public, s-maxage=3600, stale-while-revalidate=86400'}});}catch{return Response.json({error:'News collection unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
