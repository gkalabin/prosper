import Layout from "components/Layout";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/overview",
      permanent: false,
    },
  };
};

const Index = () => {
  // TODO: get rid of this component by switching to next 13 and using next/navigation (https://stackoverflow.com/a/58182678)
  return (
    <Layout>
      This should never happen. If you see this, something is wrong.
    </Layout>
  );
};

export default Index;
