import Layout from "components/Layout";
import { ReactNode } from "react";

export const ConfigPageLayout = (props: {
  children: ReactNode | ReactNode[];
}) => (
  <Layout
    subheader={[
      {
        title: "Banks and Accounts",
        path: "/config/banks",
      },
      {
        title: "Categories",
        path: "/config/categories",
      },
      {
        title: "Currencies",
        path: "/config/currencies",
      },
    ]}
  >
    {props.children}
  </Layout>
);
