import MarketSite from '@/components/terminal/MarketSite';
import JsonLd from '@/components/JsonLd';
import {SITE_URL,buildOpenGraph,buildTwitter} from '@/lib/site';
const title='StockedBy — Your investments. In context.';
const description='Follow India and US markets. Connect source-linked news, your portfolio and AI research in one considered investment desk.';
export const metadata={title,description,alternates:{canonical:'/'},openGraph:buildOpenGraph({title,description,path:'/'}),twitter:buildTwitter({title,description})};
export default function Page(){return <><JsonLd data={{'@context':'https://schema.org','@type':'WebSite',name:'StockedBy',url:SITE_URL,description}}/><MarketSite/></>;}
