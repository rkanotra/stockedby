'use client';
import { useEffect, useRef, useState } from 'react';
import d from './marketDashboard.module.css';
import { useAppearance } from './ThemeToggle';
const WIDGETS = { chart: 'symbol-overview', heatmap: 'stock-heatmap', screener: 'screener' };
function WidgetFrame({src,name,type,height,symbol}) {
  const loaded = useRef(false);
  const [failed,setFailed] = useState(false);
  const [ready,setReady] = useState(false);
  const [attempt,setAttempt] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loaded.current) return;
      if (attempt === 0) setAttempt(1);
      else setFailed(true);
    }, attempt === 0 ? 8000 : 20000);
    return () => clearTimeout(timer);
  }, [attempt]);
  const retry = () => {
    loaded.current = false;
    setFailed(false);
    setReady(false);
    setAttempt(value => value + 1);
  };
  return <div className={d.widget} style={{'--widget-height':`${height}px`}}>
    <iframe key={attempt} className={d.widgetHost} src={src} title={`${name} market ${type}`} loading="eager" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads" referrerPolicy="strict-origin-when-cross-origin" onLoad={()=>{loaded.current=true;setReady(true);setFailed(false);}} onError={()=>setFailed(true)}/>
    {!ready&&!failed&&<div className={d.widgetLoading} role="status"><span/>{attempt?'Reconnecting to market data…':'Connecting to market data…'}</div>}
    {failed&&<div className={d.widgetError}><strong>Market data is taking longer than usual</strong><p>The provider hasn’t connected. Retry here or open the market view at the source.</p><button onClick={retry}>Retry connection</button><a href="https://www.tradingview.com/markets/" target="_blank" rel="noopener noreferrer">Open TradingView ↗</a></div>}
    <div className={d.attribution}><a href={type==='chart'?`https://www.tradingview.com/symbols/${symbol.replace(':','-')}/`:type==='heatmap'?'https://www.tradingview.com/heatmap/stock/':'https://www.tradingview.com/screener/'} target="_blank" rel="noopener nofollow">{type==='chart'?`${name} chart`:type==='heatmap'?'Stock Heatmap':'Stock Screener'} by TradingView</a></div>
  </div>;
}
export default function MarketWidget({ type = 'chart', symbol = 'NASDAQ:AAPL', name = 'Apple', height = 400 }) {
  const theme = useAppearance();
  const config = type === 'chart' ? {
      symbols: [[name, `${symbol}|1D`]], chartOnly: false, width: '100%', height: '100%', locale: 'en', colorTheme: theme, autosize: true,
      showVolume: false, showMA: false, hideDateRanges: false, hideMarketStatus: false, hideSymbolLogo: false, scalePosition: 'right', scaleMode: 'Normal',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', fontSize: '12', noTimeScale: false, valuesTracking: '1', changeMode: 'price-and-percent', chartType: 'area',
      lineWidth: 2, lineType: 0, lineColor: '#d78049', topColor: 'rgba(227,153,99,0.18)', bottomColor: 'rgba(227,153,99,0)', backgroundColor: theme === 'dark' ? '#191a1d' : '#ffffff',
      dateRanges: ['1d|1','1m|30','3m|60','12m|1D','60m|1W','all|1M'], dateFormat: 'MMM dd, yyyy',
    } : type === 'heatmap' ? {
      exchanges: [], dataSource: 'SPX500', grouping: 'sector', blockSize: 'market_cap_basic', blockColor: 'change', locale: 'en', colorTheme: theme,
      hasTopBar: true, isDataSetEnabled: true, isZoomEnabled: true, hasSymbolTooltip: true, isMonoSize: false, width: '100%', height: '100%',
    } : type === 'screener' ? {
      width: '100%', height: '100%', defaultColumn: 'overview', defaultScreen: 'most_capitalized', market: 'america', showToolbar: true, colorTheme: theme, locale: 'en',
    } : {};

  // Use the provider's generated iframe URL directly. Keeping vendor scripts
  // inside their own origin avoids parent-page access and React mount races.
  const src=`https://www.tradingview-widget.com/embed-widget/${WIDGETS[type]}/?locale=en#${encodeURIComponent(JSON.stringify({...config,utm_source:'stockedby.com',utm_medium:'widget',utm_campaign:WIDGETS[type]}))}`;
  return <WidgetFrame key={`${type}:${symbol}:${theme}`} src={src} name={name} type={type} height={height} symbol={symbol}/>;
}
