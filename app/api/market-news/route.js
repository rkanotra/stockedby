import { fetchNews } from '@/lib/terminal/news';
export const maxDuration=60;
// Public headline metadata only. Never include account context here.
export async function GET(){try{const wire=await fetchNews();return Response.json(wire,{headers:{'Cache-Control':'public, s-maxage=3600, stale-while-revalidate=86400'}});}catch{return Response.json({error:'News collection unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
