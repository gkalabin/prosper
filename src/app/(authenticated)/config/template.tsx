import {SubHeader} from '@/components/SubHeader';

export default function ConfigPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SubHeader
        items={[
          {
            title: 'Display settings',
            path: '/config/display-settings',
          },
          {
            title: 'Banks and Accounts',
            path: '/config/banks',
          },
          {
            title: 'Categories',
            path: '/config/categories',
          },
        ]}
      />
      {children}
    </>
  );
}
