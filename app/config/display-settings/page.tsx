import { DispalySettings } from "app/config/display-settings/client";
import { DB } from "lib/db";
import { getUserId } from "lib/user";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Display Settings - Prosper",
};

export default async function Page() {
  const userId = await getUserId();
  const db = new DB({ userId });
  const dbDisplaySettings = await db.getOrCreateDbDisplaySettings();
  const dbCategories = await db.categoryFindMany();
  return (
    <>
      <h1 className="mb-6 text-2xl leading-7">Display settings</h1>
      <DispalySettings
        dbDisplaySettings={dbDisplaySettings}
        dbCategories={dbCategories}
      />
    </>
  );
}
