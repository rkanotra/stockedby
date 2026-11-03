'use client';
import { useEffect, useRef, useState } from 'react';
import d from './marketDashboard.module.css';
const WIDGETS = { chart: 'symbol-overview', heatmap: 'stock-heatmap', screener: 'screener' };
function WidgetFrame({src,name,type,height,symbol}) {
  const loaded=useRef(false), [failed,setFailed]=useState(false), [ready,setReady]=useState(false), [attempt,setAttempt]=useState(0);
  useEffect(()=>{loaded.current=false;const timer=setTimeout(()=>{if(!loaded.current)setFailed(true);},20000);return()=>clearTimeout(timer);},[attempt]);
  return <div className={d.widget} style={{'--widget-height':`${height}px`}}><iframe key={attempt} className={d.widgetHost} src={src} title={`${name} market ${type}`} sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads" referrerPolicy="strict-origin-when-cross-origin" onLoad={()=>{loaded.current=true;setReady(true);setFailed(false);}} onError={()=>setFailed(true)}/>{!ready&&!failed&&<div className={d.widgetLoading} role="status"><span/>Connecting to market data…</div>}{failed&&<div className={d.widgetError}><strong>Chart connection unavailable</strong><p>Your browser or network may be blocking the market provider.</p><button onClick={()=>{setFailed(false);setReady(false);setAttempt(v=>v+1);}}>Retry connection</button><a href="https://www.tradingview.com/markets/" target="_blank" rel="noopener noreferrer">Open TradingView ↗</a></div>}<div className={d.attribution}><a href={type==='chart'?`https://www.tradingview.com/symbols/${symbol.replace(':','-')}/`:type==='heatmap'?'https://www.tradingview.com/heatmap/stock/':'https://www.tradingview.com/screener/'} target="_blank" rel="noopener nofollow">{type==='chart'?`${name} chart`:type==='heatmap'?'Stock Heatmap':'Stock Screener'} by TradingView</a></div></div>;
}
export default function MarketWidget({ type = 'chart', symbol = 'NASDAQ:AAPL', name = 'Apple', height = 400 }) {
  const config = type === 'chart' ? {
      symbols: [[name, `${symbol}|1D`]], chartOnly: false, width: '100%', height: '100%', locale: 'en', colorTheme: 'light', autosize: true,
      showVolume: false, showMA: false, hideDateRanges: false, hideMarketStatus: false, hideSymbolLogo: false, scalePosition: 'right', scaleMode: 'Normal',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', fontSize: '12', noTimeScale: false, valuesTracking: '1', changeMode: 'price-and-percent', chartType: 'area',
      lineWidth: 2, lineType: 0, lineColor: '#008f56', topColor: 'rgba(0,170,94,0.12)', bottomColor: 'rgba(0,170,94,0)', backgroundColor: '#ffffff',
      dateRanges: ['1d|1','1m|30','3m|60','12m|1D','60m|1W','all|1M'], dateFormat: 'MMM dd, yyyy',
    } : type === 'heatmap' ? {
      exchanges: [], dataSource: 'SPX500', grouping: 'sector', blockSize: 'market_cap_basic', blockColor: 'change', locale: 'en', colorTheme: 'light',
      hasTopBar: true, isDataSetEnabled: true, isZoomEnabled: true, hasSymbolTooltip: true, isMonoSize: false, width: '100%', height: '100%',
    } : type === 'screener' ? {
      width: '100%', height: '100%', defaultColumn: 'overview', defaultScreen: 'most_capitalized', market: 'america', showToolbar: true, colorTheme: 'light', locale: 'en',
    } : {};

  // Use the provider's generated iframe URL directly. Keeping vendor scripts
  // inside their own origin avoids parent-page access and React mount races.
  const src=`https://www.tradingview-widget.com/embed-widget/${WIDGETS[type]}/?locale=en#${encodeURIComponent(JSON.stringify({...config,utm_source:'stockedby.com',utm_medium:'widget',utm_campaign:WIDGETS[type]}))}`;
  return <WidgetFrame key={`${type}:${symbol}`} src={src} name={name} type={type} height={height} symbol={symbol}/>;
}
