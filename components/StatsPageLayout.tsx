import Layout from "components/Layout";
import { ReactNode } from "react";

export const StatsPageLayout = (props: {
  children: ReactNode | ReactNode[];
}) => (
  <Layout
    subheader={[
      {
        title: "Gross Cashflow",
        path: "/stats/cashflow",
      },
      {
        title: "Income",
        path: "/stats/income",
      },
    ]}
  >
    {props.children}
  </Layout>
);
