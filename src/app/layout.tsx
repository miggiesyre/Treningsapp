import type { Metadata, Viewport } from 'next';
import { Alfa_Slab_One, Courier_Prime, Oswald, Rye } from 'next/font/google';
import { cookies } from 'next/headers';
import { isTheme } from '@/lib/roles';
import './globals.css';

const slab = Alfa_Slab_One({ weight: '400', subsets: ['latin'], variable: '--font-slab', display: 'swap' });
const courier = Courier_Prime({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-courier', display: 'swap' });
const rye = Rye({ weight: '400', subsets: ['latin'], variable: '--font-rye', display: 'swap' });
const oswald = Oswald({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--font-oswald', display: 'swap' });

export const metadata: Metadata = {
  title: 'Tri 70.3',
  applicationName: 'Tri 70.3',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'Tri 70.3', statusBarStyle: 'black-translucent' },
  icons: { icon: '/logo.svg', apple: '/icon-180.png' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1A1A1C',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const saved = (await cookies()).get('theme')?.value;
  const theme = isTheme(saved) ? saved : 'dark';
  return (
    <html lang="nb" data-theme={theme} className={`${slab.variable} ${courier.variable} ${oswald.variable} ${rye.variable}`}>
      <body>{children}</body>
    </html>
  );
}
