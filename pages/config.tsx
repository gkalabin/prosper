import { ConfigPageLayout } from "components/ConfigPageLayout";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/config/banks",
      permanent: false,
    },
  };
};

export default function Index() {
  return (
    <ConfigPageLayout>
      Select what you want to configure in the submenu.
    </ConfigPageLayout>
  );
}
