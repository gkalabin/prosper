import Layout from "components/Layout";
import { ReactNode } from "react";

export const StatsPageLayout = (props: {
  children: ReactNode | ReactNode[];
}) => (
  <Layout
    subheader={[
      {
        title: "Cashflow",
        path: "/stats/cashflow",
      },
      {
        title: "Income",
        path: "/stats/income",
      },
      {
        title: "Expense",
        path: "/stats/expense",
      },
      {
        title: "Monthly",
        path: "/stats/monthly",
      },
    ]}
  >
    {props.children}
  </Layout>
);
