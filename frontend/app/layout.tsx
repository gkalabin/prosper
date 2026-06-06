import {cn} from '@/lib/utils';
import '@/styles/global.css';
import {Metadata} from 'next';
import localFont from 'next/font/local';

// Downloaded from https://fonts.google.com/specimen/Open+Sans.
const openSans = localFont({
  src: [
    {path: './_fonts/OpenSans.ttf'},
    {path: './_fonts/OpenSans-Italic.ttf', style: 'italic'},
  ],
});

export const metadata: Metadata = {
  title: 'Prosper',
  description: 'Personal expense tracking app.',
  applicationName: 'Prosper',
  authors: {name: 'Gregory Kalabin'},
  robots: 'noindex, nofollow',
};

// Render every route dynamically and never store fetch responses so each
// request reads the current state from the backend.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          'bg-background min-h-screen antialiased',
          openSans.className
        )}
      >
        {children}
      </body>
    </html>
  );
}
