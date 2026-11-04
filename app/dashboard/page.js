import PulseDashboard from '@/components/dashboard/PulseDashboard';
export const metadata = {
  title: 'Daily dashboard — StockedBy',
  description: 'Your clock, weather, Sensex, US markets, gold, crypto and the latest market headlines. A compact display for your phone.',
  alternates: { canonical: '/dashboard' },
  manifest: '/dashboard.webmanifest',
  appleWebApp: { capable: true, title: 'StockedBy', statusBarStyle: 'black-translucent' },
  icons: { apple: '/dashboard-icon-192.png' },
};
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#090a0f' };
export default function DashboardPage() { return <PulseDashboard/>; }
