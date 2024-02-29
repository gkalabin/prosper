import Header from '@/components/Header';
import '@/styles/global.css';

export default async function AuthenticatedPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
