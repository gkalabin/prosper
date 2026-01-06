import {SubHeader} from '@/components/SubHeader';

export default function StatsPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SubHeader
        items={[
          {
            title: 'Cashflow',
            path: '/stats/cashflow',
          },
          {
            title: 'Income',
            path: '/stats/income',
          },
          {
            title: 'Expense',
            path: '/stats/expense',
          },
          {
            title: 'Monthly',
            path: '/stats/monthly',
          },
          {
            title: 'Quarterly',
            path: '/stats/quarterly',
          },
          {
            title: 'Yearly',
            path: '/stats/yearly',
          },
        ]}
      />
      {children}
    </>
  );
}
