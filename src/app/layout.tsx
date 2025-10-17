
import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ClientProviders } from '@/components/client-providers';
import { getSiteName, getSiteLogoUrl, getHeaderDisplayMode, getAnnouncementBarSettings } from './admin/settings/actions';
import { cookies } from 'next/headers';
import { AnnouncementBar } from '@/components/layout/announcement-bar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['400', '700'],
});

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = cookies();
  const siteName = await getSiteName(cookieStore);
  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: `The ultimate destination for anime t-shirts, powered by ${siteName}.`,
    icons: {
      icon: '/icon.png',
      shortcut: '/icon.png',
      apple: '/icon.png',
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const [siteName, logoResult, displayMode, announcementSettings] = await Promise.all([
    getSiteName(cookieStore),
    getSiteLogoUrl(cookieStore),
    getHeaderDisplayMode(cookieStore),
    getAnnouncementBarSettings(cookieStore),
  ]);

  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-body antialiased`}
      >
        <ClientProviders>
          <div className="flex min-h-screen flex-col">
            {announcementSettings.enabled && <AnnouncementBar message={announcementSettings.message} />}
            <Header siteName={siteName} logoUrl={logoResult.url} displayMode={displayMode} />
            <main className="flex-grow">
              {children}
            </main>
            <Footer siteName={siteName} />
          </div>
          <Toaster />
        </ClientProviders>
      </body>
    </html>
  );
}
