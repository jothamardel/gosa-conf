import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GOSA Convention 2025 | For Light and Truth',
  description: 'GOSA Gindiri Old Students Association | Annual Convention Registration',
  keywords: ['convention', 'registration', 'events', 'GOSA', 'Gindiri Old Students Association'],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#16A34A',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GOSA Convention 2025'
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/images/gosa.png',
    apple: '/images/gosa.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#16A34A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="GOSA Convention 2025" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Favicon links */}
        <link rel="icon" href="/images/gosa.png" sizes="any" />
        <link rel="icon" href="/images/gosa.png" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/images/gosa.png" />
        <link rel="manifest" href="/images/gosa.png" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'white',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}