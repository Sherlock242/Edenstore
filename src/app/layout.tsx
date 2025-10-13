
import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { AppProviders } from '@/components/providers';
import { getSiteName } from './admin/settings/actions';

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
  const siteName = await getSiteName();
  return {
    title: siteName,
    description: `The ultimate destination for anime t-shirts, powered by ${siteName}.`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteName = await getSiteName();
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-body antialiased`}
      >
        <AppProviders>
          <div className="flex min-h-screen flex-col">
            <Header siteName={siteName} />
            <main className="flex-grow">{children}</main>
            <Footer siteName={siteName} />
          </div>
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
