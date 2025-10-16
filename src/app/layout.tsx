
import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { AppProviders } from '@/components/providers';
import { getSiteName, getSiteLogoUrl, getHeaderDisplayMode } from './admin/settings/actions';
import { cookies } from 'next/headers';

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
  const siteName = await getSiteName(cookieStore);
  const logoResult = await getSiteLogoUrl(cookieStore);
  const displayMode = await getHeaderDisplayMode(cookieStore);

  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-body antialiased`}
      >
        <AppProviders>
          <div className="flex min-h-screen flex-col">
            <Header siteName={siteName} logoUrl={logoResult.url} displayMode={displayMode} />
            <main className="flex-grow">{children}</main>
            <Footer siteName={siteName} />
          </div>
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
