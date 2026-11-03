import { NextResponse } from 'next/server';
export function proxy(request) {
  const path=request.nextUrl.pathname;
  if(path==='/api/terminal'||path.startsWith('/api/terminal/')||path==='/api/market-news'||path==='/api/team/auth/callback'||path==='/api/webhooks/resend') return NextResponse.next();
  return NextResponse.json({error:'This StockedBy product has been retired. Visit stockedby.com for the investment research desk.'},{status:410,headers:{'Cache-Control':'no-store'}});
}
export const config={matcher:'/api/:path*'};
