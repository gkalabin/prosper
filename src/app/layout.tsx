import {cn} from '@/lib/utils';
import '@/styles/global.css';
import {Metadata} from 'next';
import {Open_Sans as FontSans} from 'next/font/google';

const fontSans = FontSans({
  subsets: ['cyrillic', 'latin', 'math', 'symbols'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Prosper',
  description: 'Personal expense tracking app.',
  applicationName: 'Prosper',
  authors: {name: 'Gregory Kalabin'},
  robots: 'noindex, nofollow',
};

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
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
        {children}
      </body>
    </html>
  );
}
