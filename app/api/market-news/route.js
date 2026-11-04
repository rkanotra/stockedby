import { fetchNews } from '@/lib/terminal/news';
import { fetchDashboardNews } from '@/lib/dashboard/news';
import { fetchDashboardQuotes } from '@/lib/dashboard/quote-feed';
export const maxDuration=60;
// Public display data only. Never include account context here.
export async function GET(request){try{
  const view=new URL(request.url).searchParams.get('view');
  if(view==='quotes'){
    const data=await fetchDashboardQuotes();
    const available=data.quotes.some(quote=>quote.price!==null);
    return Response.json(data,{status:available?200:503,headers:{'Cache-Control':available?'public, s-maxage=60, stale-while-revalidate=30':'no-store'}});
  }
  const dashboard=view==='dashboard';const wire=await (dashboard?fetchDashboardNews():fetchNews());return Response.json(wire,{headers:{'Cache-Control':dashboard?'public, s-maxage=600, stale-while-revalidate=600':'public, s-maxage=3600, stale-while-revalidate=86400'}});
}catch{return Response.json({error:'Data collection unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
