import {SubHeader} from '@/components/SubHeader';

export default function ConfigPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="-mx-6 -mt-6 mb-6">
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
      </div>
      <div className="flex justify-center">
        <div className="w-full sm:w-3/4">{children}</div>
      </div>
    </>
  );
}
