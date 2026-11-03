import {SITE_URL} from '@/lib/site';
export default function sitemap(){return [{path:'/',priority:1},{path:'/brief',priority:.9},{path:'/guide',priority:.6},{path:'/privacy',priority:.2}].map(p=>({url:SITE_URL+p.path,lastModified:new Date('2026-11-03'),changeFrequency:p.path==='/brief'?'hourly':'monthly',priority:p.priority}));}
