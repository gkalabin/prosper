import { SubHeader } from "components/SubHeader";

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
            title: "Display settings",
            path: "/config/display-settings",
          },
          {
            title: "Banks and Accounts",
            path: "/config/banks",
          },
          {
            title: "Categories",
            path: "/config/categories",
          },
        ]}
      />
      <div className="flex justify-center">
        <div className="w-full p-4 sm:w-3/4">{children}</div>
      </div>
    </>
  );
}
