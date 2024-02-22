import Header from '@/components/Header';
import '@/styles/global.css';

export default async function AuthorisedPagesLayout({
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
