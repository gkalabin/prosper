import {ThemeProvider} from '@/components/theme-provider';
import {cn} from '@/lib/utils';
import '@/styles/global.css';
import {Metadata} from 'next';
import {cookies} from 'next/headers';
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={theme === 'dark' ? 'dark' : ''}
    >
      <head />
      <body
        className={cn(
          'min-h-screen bg-background antialiased',
          openSans.className
        )}
      >
        <ThemeProvider
          defaultTheme="system"
          storageKey="theme"
          initialTheme={theme as 'dark' | 'light' | 'system'}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
