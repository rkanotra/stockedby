export const DASHBOARD_MARKETS = [
  { symbol: 'BSE:SENSEX', name: 'Sensex', category: 'INDIA', note: 'BSE · end of day', tone: 'blue' },
  { symbol: 'FOREXCOM:SPXUSD', name: 'US 500', category: 'UNITED STATES', note: 'S&P 500 index CFD · USD', tone: 'violet' },
  { symbol: 'FOREXCOM:NSXUSD', name: 'Nasdaq 100', category: 'UNITED STATES', note: 'Nasdaq 100 index CFD · USD', tone: 'violet' },
  { symbol: 'OANDA:XAUUSD', name: 'Gold', category: 'PRECIOUS METALS', note: 'Spot · USD / troy oz', tone: 'gold' },
  { symbol: 'COINBASE:BTCUSD', name: 'Bitcoin', category: 'CRYPTO', note: 'Coinbase · BTC / USD', tone: 'peach' },
  { symbol: 'COINBASE:ETHUSD', name: 'Ethereum', category: 'CRYPTO', note: 'Coinbase · ETH / USD', tone: 'blue' },
];
export const WEATHER_CITIES = [
  { id: 'dubai', name: 'Dubai', latitude: 25.20, longitude: 55.27, timezone: 'Asia/Dubai' },
  { id: 'abu-dhabi', name: 'Abu Dhabi', latitude: 24.45, longitude: 54.38, timezone: 'Asia/Dubai' },
  { id: 'mumbai', name: 'Mumbai', latitude: 19.08, longitude: 72.88, timezone: 'Asia/Kolkata' },
  { id: 'delhi', name: 'New Delhi', latitude: 28.61, longitude: 77.21, timezone: 'Asia/Kolkata' },
  { id: 'bengaluru', name: 'Bengaluru', latitude: 12.97, longitude: 77.59, timezone: 'Asia/Kolkata' },
  { id: 'new-york', name: 'New York', latitude: 40.71, longitude: -74.01, timezone: 'America/New_York' },
  { id: 'london', name: 'London', latitude: 51.51, longitude: -0.13, timezone: 'Europe/London' },
];
export function safeLocation(value) {
  const known = WEATHER_CITIES.find(c => c.id === value?.id);
  if (known) return known;
  if (value?.id !== 'location' || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || Math.abs(value.latitude) > 90 || Math.abs(value.longitude) > 180) return WEATHER_CITIES[0];
  return { id: 'location', name: 'Your location', latitude: Math.round(value.latitude * 100) / 100, longitude: Math.round(value.longitude * 100) / 100, timezone: null };
}
export function clockParts(now, timeZone, hour12 = false) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12 }).formatToParts(now);
  const get = type => parts.find(p => p.type === type)?.value || '';
  return { time: `${get('hour')}:${get('minute')}`, seconds: get('second'), period: get('dayPeriod'), date: new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(now), zone: new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'short' }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value };
}
export function weatherDescription(code) {
  if (code === 0) return ['Clear skies', 'sun'];
  if ([1,2].includes(code)) return ['Partly cloudy', 'cloud'];
  if (code === 3) return ['Overcast', 'cloud'];
  if ([45,48].includes(code)) return ['Foggy', 'cloud'];
  if ([71,73,75,77,85,86].includes(code)) return ['Snow', 'snow'];
  if ([95,96,99].includes(code)) return ['Thunderstorms', 'rain'];
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return ['Rain', 'rain'];
  return ['Conditions unavailable', 'cloud'];
}
export function parseWeather(data, now = Date.now()) {
  const c = data?.current, asOf = c?.time * 1000;
  if (!c || !Number.isFinite(c.temperature_2m) || !Number.isFinite(c.weather_code) || !Number.isFinite(asOf) || asOf > now + 300000 || now - asOf > 3 * 3600000) throw Error('Weather update is unavailable.');
  const [description, icon] = weatherDescription(c.weather_code);
  let timezone; try { new Intl.DateTimeFormat('en', { timeZone: data.timezone }).format(); timezone = data.timezone; } catch { timezone = null; }
  return { temperature: c.temperature_2m, description, icon: c.is_day === 0 && icon === 'sun' ? 'moon' : icon, asOf, timezone };
}
export function recentHeadlines(wire, now = Date.now()) {
  return (wire?.items || []).filter(item => {
    let url; try { url = new URL(item.url); } catch { return false; }
    const time = Date.parse(item.publishedAt);
    return url.protocol === 'https:' && !url.username && !url.password && item.title && Number.isFinite(time) && time <= now + 300000 && now - time <= 72 * 3600000;
  });
}
export function ageLabel(stamp, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - new Date(stamp).getTime()) / 60000));
  return !Number.isFinite(minutes) ? 'Time unavailable' : minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
}
