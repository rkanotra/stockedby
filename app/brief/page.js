import MarketSite from '@/components/terminal/MarketSite';
import {buildOpenGraph,buildTwitter} from '@/lib/site';
const title='The StockedBy Brief — India, UAE & US market news';
const description='A free regional wire covering companies, IPOs, mutual funds, ETFs, metals and crypto. Source-linked news for a clearer investment perspective.';
export const metadata={title,description,alternates:{canonical:'/brief'},openGraph:buildOpenGraph({title,description,path:'/brief'}),twitter:buildTwitter({title,description})};
export default function Page(){return <MarketSite view="brief"/>;}
