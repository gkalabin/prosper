import {cn} from '@/lib/utils';
import '@/styles/global.css';
import {Metadata} from 'next';
import localFont from 'next/font/local';

// Downloaded from https://fonts.google.com/specimen/Hanken+Grotesk.
const hankenGrotesk = localFont({
  src: './_fonts/HankenGrotesk.ttf',
  variable: '--font-sans',
});

// Downloaded from https://fonts.google.com/specimen/Spline+Sans+Mono.
const splineSansMono = localFont({
  src: './_fonts/SplineSansMono.ttf',
  variable: '--font-mono',
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
          'bg-background min-h-screen font-sans antialiased',
          hankenGrotesk.variable,
          splineSansMono.variable
        )}
      >
        {children}
      </body>
    </html>
  );
}
