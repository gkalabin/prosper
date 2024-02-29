import Header from '@/components/Header';

export default async function Layout({children}: {children: React.ReactNode}) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
