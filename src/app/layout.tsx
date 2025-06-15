import type {Metadata, Viewport} from 'next';
import {Inter} from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/contexts/AppContext';
import { Toaster } from "@/components/ui/toaster";
import BackgroundServiceProvider from '@/components/core/BackgroundServiceProvider';
import { NotificationService } from '@/app/services/notification.service';

const inter = Inter({ subsets: ['latin'] });

const notificationService = new NotificationService();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: 'GeoAttend',
  description: 'Attendance tracking system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Trakzy',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body 
        className={inter.className}
        suppressHydrationWarning={true}
      >
        <AppProvider>
          <BackgroundServiceProvider>
          {children}
          <Toaster />
          </BackgroundServiceProvider>
        </AppProvider>
      </body>
    </html>
  );
}
