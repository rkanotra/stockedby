'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { BrandMark } from '@/components/terminal/DeskIcon';
import { DASHBOARD_MARKETS, WEATHER_CITIES, safeLocation, clockParts, parseWeather, recentHeadlines, ageLabel } from '@/lib/dashboard/display';
import s from './pulse.module.css';
const PREFS = 'stockedby-display-v1';
function subscribeConnection(callback) { window.addEventListener('online',callback); window.addEventListener('offline',callback); return()=>{window.removeEventListener('online',callback);window.removeEventListener('offline',callback);}; }
const offlineSnapshot=()=>!navigator.onLine;
const onlineServerSnapshot=()=>false;
const subscribeHydration=()=>()=>{};
const hydratedSnapshot=()=>true;
function Icon({type,...props}) { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{type==='expand'?<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>:type==='sun'?<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>:type==='moon'?<path d="M20 14A8.2 8.2 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z"/>:type==='cloud'||type==='rain'||type==='snow'?<><path d="M7 17a5 5 0 1 1 1.4-9.8A6 6 0 0 1 20 10a3.5 3.5 0 0 1-1 7Z"/>{type==='rain'&&<path d="m8 20-1 2m6-2-1 2m6-2-1 2"/>}{type==='snow'&&<path d="M8 21h.01M13 21h.01M18 21h.01"/>}</>:type==='refresh'?<><path d="M20 6v5h-5M4 18v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 5M4 13l2 5a7 7 0 0 0 12-1"/></>:type==='settings'?<><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="currentColor"/><circle cx="15" cy="17" r="2" fill="currentColor"/></>:type==='awake'?<><rect x="6" y="3" width="12" height="18" rx="3"/><path d="M10 17h4M12 7v5m-2-3 2-2 2 2"/></>:type==='close'?<path d="m6 6 12 12M6 18 18 6"/>:type==='pause'?<path d="M9 5v14M15 5v14"/>:type==='play'?<path d="m9 5 10 7-10 7Z"/>:type==='next'?<path d="m9 5 7 7-7 7"/>:type==='location'?<><circle cx="12" cy="12" r="6"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/><circle cx="12" cy="12" r="1"/></>:<path d="M12 3v12m-4-4 4 4 4-4M5 15v6h14v-6"/>}</svg>; }
function Clock({timezone,hour12}) {
  const [now,setNow]=useState(null);
  useEffect(()=>{const tick=()=>setNow(new Date());tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[]);
  const value=now?clockParts(now,timezone,hour12):null;
  return <div className={s.clock}><p>{value?.date||'Your day, at a glance'}</p><div className={s.clockLine}><time aria-label="Current time" dateTime={now?.toISOString()}>{value?.time||'--:--'}</time><div><span>{value?.seconds||'00'}</span><small>{value?.period||value?.zone||'LOCAL'}</small></div></div></div>;
}
function QuoteTile({item,theme,refresh,offline}) {
  const mounted=useSyncExternalStore(subscribeHydration,hydratedSnapshot,onlineServerSnapshot);
  const [loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0),[size,setSize]=useState({width:220,height:80});
  const box=useRef(null),frame=useRef(null);
  useEffect(()=>{const observer=new ResizeObserver(([entry])=>setSize({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(box.current);return()=>observer.disconnect();},[]);
  const scale=Math.min(1,size.width/220);
  // Fit the complete provider tile, including its attribution, into narrow cards.
  const frameStyle={width:Math.max(220,size.width),height:size.height/scale,transform:`scale(${scale})`,transformOrigin:'top left'};
  useEffect(()=>{
    if(!mounted||offline||loaded)return;
    // An iframe load also fires for the browser's blocked/error page. Wait for
    // the provider's own ready message, scoped to this exact frame and origin.
    let completed=false;
    const receive=event=>{
      if(event.origin!=='https://www.tradingview-widget.com'||event.source!==frame.current?.contentWindow)return;
      if(event.data?.name==='tv-widget-ready'){completed=true;setLoaded(true);setFailed(false);}
      if(event.data?.name==='tv-widget-no-data'){completed=true;setLoaded(false);setFailed(true);}
    };
    window.addEventListener('message',receive);
    const timer=setTimeout(()=>{
      if(completed)return;
      if(attempt===0&&!offline)setAttempt(1);
      else setFailed(true);
    },12000);
    return()=>{clearTimeout(timer);window.removeEventListener('message',receive);};
  },[mounted,attempt,offline,loaded]);
  const retry=()=>{setLoaded(false);setFailed(false);setAttempt(n=>n+1);};
  const config={symbol:item.symbol,width:'100%',colorTheme:theme,isTransparent:true,locale:'en',utm_source:'stockedby.com',utm_medium:'widget',utm_campaign:'single-quote'};
  const source=`https://www.tradingview.com/symbols/${item.symbol.replace(':','-')}/`;
  return <article className={`${s.tile} ${s[item.tone]}`} aria-label={`${item.name} quote`}>
    <header><span className={s.category}>{item.category}</span><a href={source} target="_blank" rel="noreferrer" aria-label={`Open ${item.name} at source`}>↗</a></header><h2>{item.name}</h2>
    <div className={s.quote} ref={box} data-feed-state={failed?'unavailable':loaded?'ready':'loading'}>{mounted&&<iframe ref={frame} style={{...frameStyle,visibility:loaded?'visible':'hidden'}} key={`${refresh}:${attempt}`} title={`${item.name} value and change`} src={`https://www.tradingview-widget.com/embed-widget/single-quote/?locale=en#${encodeURIComponent(JSON.stringify(config))}`} sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerPolicy="strict-origin-when-cross-origin" onError={()=>setFailed(true)}/>}{!loaded&&<div className={s.quotePlaceholder}>{failed?<div className={s.feedError}><span>Price connection unavailable</span><div><button onClick={retry} aria-label={`Retry ${item.name} price`}>Retry</button><a href={source} target="_blank" rel="noreferrer">Open source ↗</a></div></div>:<span>{attempt?'Reconnecting…':'Connecting…'}</span>}</div>}</div>
    <p className={s.quoteNote}>{offline?'Offline · quote may be old':item.note}</p>
  </article>;
}
function Headlines({wire,error,paused,setPaused}) {
  const [index,setIndex]=useState(0),[now,setNow]=useState(Date.now);
  const items=recentHeadlines(wire,now),item=items[index%Math.max(items.length,1)];
  useEffect(()=>{const timer=setInterval(()=>{setNow(Date.now());if(!paused&&!document.hidden)setIndex(i=>i+1);},15000);return()=>clearInterval(timer);},[paused]);
  return <section className={s.headlines} aria-label="Latest market headlines"><div className={s.newsTop}><span><i/> THE LATEST <small>{item?.topic==='Markets'?item.market:item?.topic}</small></span><div><button aria-label={paused?'Resume headlines':'Pause headlines'} onClick={()=>setPaused(!paused)}><Icon type={paused?'play':'pause'}/></button><button aria-label="Next headline" onClick={()=>setIndex(i=>i+1)}><Icon type="next"/></button></div></div>
    {item?<><a className={s.headline} title={item.title} href={item.url} target="_blank" rel="noreferrer">{item.title} <span>↗</span></a><div className={s.newsMeta}><span>{item.publisher} · {ageLabel(item.publishedAt,now)}</span><span>{error||wire?.stale?'Update unavailable · earlier news':`${index%items.length+1} / ${items.length}`}</span></div></>:<div className={s.emptyNews}>{error||wire?.stale?'Headlines are temporarily unavailable. Try refresh.':'Finding the latest market headlines…'}</div>}
  </section>;
}
export default function PulseDashboard() {
  const [theme,setTheme]=useState('dark'),[city,setCity]=useState(WEATHER_CITIES[0]),[hour12,setHour12]=useState(false),[unit,setUnit]=useState('C'),[weather,setWeather]=useState(null),[weatherError,setWeatherError]=useState(''),[wire,setWire]=useState(null),[newsError,setNewsError]=useState(false),[refresh,setRefresh]=useState(0),[settings,setSettings]=useState(false),[full,setFull]=useState(false),[awake,setAwake]=useState(false),[held,setHeld]=useState(false),[message,setMessage]=useState(''),[locating,setLocating]=useState(false),[paused,setPaused]=useState(false),[ready,setReady]=useState(false);
  const dialog=useRef(null),lastRefresh=useRef(0);
  const offline=useSyncExternalStore(subscribeConnection,offlineSnapshot,onlineServerSnapshot);
  const locationKey=`${city.latitude}:${city.longitude}`;
  const currentWeather=weather?.key===locationKey?weather:null;
  const timezone=currentWeather?.timezone||city.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Browser-only preferences hydrate once after the server-rendered default.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{try{const p=JSON.parse(localStorage.getItem(PREFS)||'{}');setCity(safeLocation(p.city));setHour12(p.hour12===true);setUnit(p.unit==='F'?'F':'C');setTheme(p.theme==='light'?'light':'dark');}catch{}setReady(true);},[]);
  useEffect(()=>{if(ready)try{localStorage.setItem(PREFS,JSON.stringify({city,hour12,unit,theme}));}catch{}},[city,hour12,unit,theme,ready]);
  useEffect(()=>{
    const connection=()=>{if(navigator.onLine)setRefresh(n=>n+1);};const fullscreen=()=>setFull(!!document.fullscreenElement);
    window.addEventListener('online',connection);window.addEventListener('offline',connection);document.addEventListener('fullscreenchange',fullscreen);
    let hiddenAt=0;const visible=()=>{if(document.hidden)hiddenAt=Date.now();else if(hiddenAt&&Date.now()-hiddenAt>5*60000){setRefresh(n=>n+1);hiddenAt=0;}};document.addEventListener('visibilitychange',visible);
    return()=>{window.removeEventListener('online',connection);window.removeEventListener('offline',connection);document.removeEventListener('fullscreenchange',fullscreen);document.removeEventListener('visibilitychange',visible);};
  },[]);
  useEffect(()=>{
    if(!ready)return;let active=true,controller;
    const load=async()=>{if(document.hidden||!navigator.onLine)return;controller?.abort();controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
      try{const query=new URLSearchParams({latitude:String(city.latitude),longitude:String(city.longitude),current:'temperature_2m,weather_code,is_day',timezone:'auto',timeformat:'unixtime'});const r=await fetch(`https://api.open-meteo.com/v1/forecast?${query}`,{signal:controller.signal});if(!r.ok)throw Error();const data=parseWeather(await r.json());if(active){setWeather({...data,key:locationKey});setWeatherError('');}}catch{if(active)setWeatherError('Weather update unavailable');}finally{clearTimeout(timeout);}};
    load();const timer=setInterval(load,15*60000);return()=>{active=false;controller?.abort();clearInterval(timer);};
  },[city.latitude,city.longitude,locationKey,refresh,ready]);
  useEffect(()=>{
    let active=true,controller;const load=async()=>{if(document.hidden||!navigator.onLine)return;controller?.abort();controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);try{const r=await fetch('/api/market-news?view=dashboard',{signal:controller.signal,cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();if(active){setWire(data);setNewsError(false);}}catch{if(active)setNewsError(true);}finally{clearTimeout(timeout);}};
    load();const timer=setInterval(load,10*60000);return()=>{active=false;controller?.abort();clearInterval(timer);};
  },[refresh]);
  useEffect(()=>{
    if(!awake)return;let lock,active=true;
    const acquire=async()=>{if(document.hidden)return;try{if(!navigator.wakeLock)throw Error();const next=await navigator.wakeLock.request('screen');if(!active){await next.release();return;}lock=next;setHeld(true);lock.addEventListener('release',()=>{if(active)setHeld(false);});}catch{if(active){setHeld(false);setAwake(false);setMessage('This browser could not keep the screen awake. Check your device’s auto-lock settings.');}}};
    acquire();document.addEventListener('visibilitychange',acquire);return()=>{active=false;document.removeEventListener('visibilitychange',acquire);lock?.release().catch(()=>{});setHeld(false);};
  },[awake]);
  useEffect(()=>{if(settings&&!dialog.current.open)dialog.current.showModal();else if(!settings&&dialog.current.open)dialog.current.close();},[settings]);
  const toggleFull=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else{setMessage('On iPhone, use Share → Add to Home Screen, then open the saved icon for a full-screen dashboard.');setSettings(true);}}catch{setMessage('Full screen is unavailable here. Add this page to your Home Screen instead.');setSettings(true);}};
  const useLocation=()=>{if(!navigator.geolocation){setMessage('Location is unavailable. Choose a city instead.');return;}setLocating(true);navigator.geolocation.getCurrentPosition(position=>{setCity(safeLocation({id:'location',latitude:position.coords.latitude,longitude:position.coords.longitude}));setLocating(false);setMessage('Weather and time now follow your selected location.');},()=>{setLocating(false);setMessage('Location was not available. Choose a city; your current selection is unchanged.');},{enableHighAccuracy:false,timeout:10000,maximumAge:3600000});};
  const reload=()=>{if(Date.now()-lastRefresh.current<5000)return;lastRefresh.current=Date.now();setRefresh(n=>n+1);};
  const temperature=currentWeather?Math.round(unit==='F'?currentWeather.temperature*9/5+32:currentWeather.temperature):null;
  return <div className={s.root} data-theme={theme}><div className={s.shell}>
    <header className={s.toolbar}><Link className={s.brand} href="/" aria-label="StockedBy home"><BrandMark/><span>stockedby<span className={s.brandDot}>.</span></span></Link><span className={s.displayName}>DAILY DASHBOARD</span><div className={s.tools}><button onClick={reload} aria-label="Refresh dashboard" title="Refresh dashboard"><Icon type="refresh"/></button><button onClick={()=>setSettings(true)} aria-label="Display settings" title="Display settings"><Icon type="settings"/></button><button className={s.fullscreen} onClick={toggleFull} aria-label={full?'Exit full screen':'Enter full screen'} title={full?'Exit full screen':'Full screen'}><Icon type="expand"/><span>{full?'Exit':'Full screen'}</span></button></div></header>
    <main><h1 className={s.srOnly}>Your daily market dashboard</h1><section className={s.day} aria-label="Date, time and weather"><Clock timezone={timezone} hour12={hour12}/><button className={s.weather} onClick={()=>setSettings(true)} aria-label={`Weather location: ${city.name}. Change city`}><div className={s.weatherReading}><Icon type={currentWeather?.icon||'cloud'}/><strong>{temperature===null?'—':temperature}°<small>{unit}</small></strong></div><span>{city.name} <span aria-hidden="true">⌄</span></span><small>{currentWeather?.description||weatherError||'Checking weather…'}</small><small className={s.weatherTime}>{currentWeather?`${weatherError||offline?'Earlier reading · ':''}${ageLabel(currentWeather.asOf)}`:'Choose a city or use location'}</small></button></section>
    {offline&&<p className={s.warning} role="status">You’re offline. The clock continues; market values and weather may be old.</p>}
    <section className={s.markets} aria-label="Market values">{DASHBOARD_MARKETS.map(item=><QuoteTile key={`${item.symbol}:${theme}:${refresh}`} item={item} theme={theme} refresh={refresh} offline={offline}/>)}</section>
    <Headlines wire={wire} error={newsError} paused={paused} setPaused={setPaused}/>
    </main><footer className={s.footer}><div className={s.providers}><a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">Quotes by TradingView</a><span>·</span><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather by Open-Meteo</a></div><div className={s.displayControls}><button onClick={()=>setAwake(v=>!v)} aria-pressed={awake}><Icon type="awake"/>{held?'Screen stays on':awake?'Requesting…':'Keep awake'}</button><button onClick={()=>setSettings(true)}><Icon type="install"/>Home screen</button></div></footer>
    {message&&!settings&&<p className={s.toast} role="status">{message}<button aria-label="Dismiss message" onClick={()=>setMessage('')}>×</button></p>}
    <dialog ref={dialog} className={s.dialog} onCancel={()=>setSettings(false)} onClose={()=>setSettings(false)} onClick={e=>{if(e.target===dialog.current)setSettings(false);}}><div className={s.settings}><header><div><span>MAKE IT YOURS</span><h2>Display settings</h2></div><button onClick={()=>setSettings(false)} aria-label="Close display settings"><Icon type="close"/></button></header>
      <label>Weather & clock location<select aria-label="Weather & clock location" value={city.id} onChange={e=>setCity(WEATHER_CITIES.find(c=>c.id===e.target.value)||city)}>{city.id==='location'&&<option value="location">Your location</option>}{WEATHER_CITIES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className={s.locationButton} onClick={useLocation} disabled={locating}><Icon type="location"/>{locating?'Finding your location…':'Use my location'}</button><p className={s.hint}>Only requested when you tap. Approximate coordinates are sent to Open-Meteo for weather; your choice stays on this device.</p>
      <div className={s.preferenceRow}><label>Temperature<select aria-label="Temperature" value={unit} onChange={e=>setUnit(e.target.value)}><option value="C">Celsius °C</option><option value="F">Fahrenheit °F</option></select></label><label>Clock<select aria-label="Clock" value={hour12?'12':'24'} onChange={e=>setHour12(e.target.value==='12')}><option value="24">24 hour</option><option value="12">12 hour</option></select></label><div><span>Appearance</span><button className={s.appearanceToggle} onClick={()=>setTheme(value=>value==='dark'?'light':'dark')} aria-label={`Switch to ${theme==='dark'?'light':'dark'} mode`}><Icon type={theme==='dark'?'moon':'sun'}/>{theme==='dark'?'Sunset':'Light'}</button></div></div>
      <section className={s.install}><h3>A dashboard, without the browser.</h3><p><strong>iPhone:</strong> open in Safari → Share → Add to Home Screen. Open the saved StockedBy icon.</p><p><strong>Android:</strong> open Chrome’s menu → Add to Home screen or Install app.</p><p>Use <strong>Keep awake</strong> to leave the display running where your browser supports it. An internet connection is needed for updates.</p></section>
      <details><summary>Sources & update timing</summary><p>Sensex: BSE end-of-day. US 500 and Nasdaq 100: FOREX.com index CFDs, not the cash indices. Gold: OANDA spot USD per troy ounce. Bitcoin and Ethereum: Coinbase USD quotes. Quotes update inside TradingView’s widgets; provider delays and market hours apply. A loaded tile does not guarantee a fresh quote. If price panels fail, use Retry or Open source. Weather and headlines can still work when the separate price connection is unavailable.</p><p>Weather uses Open-Meteo model data and checks every 15 minutes. News checks every 10 minutes and rotates every 15 seconds. Each headline shows its publisher and age. Pause rotation whenever you want.</p><p>No account or paid AI run is needed for this display. <a href="/terminal">Open your private portfolio ↗</a></p></details>{message&&<p className={s.warning} role="status">{message}</p>}
    </div></dialog>
  </div></div>;
}
