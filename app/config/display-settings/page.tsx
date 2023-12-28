import { DB } from "lib/db";
import { getUserId } from "lib/user";
import { Metadata } from "next";
import { DispalySettings } from "./client";

export const metadata: Metadata = {
  title: "Display Settings - Prosper",
};

async function getData(userId: number) {
  const db = new DB({ userId });
  const dbDisplaySettings = await db.getOrCreateDbDisplaySettings();
  const dbCategories = await db.categoryFindMany();
  return { dbDisplaySettings, dbCategories };
}

export default async function Page() {
  const userId = await getUserId();
  const data = await getData(userId);
  return (
    <>
      <h1 className="mb-6 text-2xl leading-7">Display settings</h1>
      <DispalySettings
        dbDisplaySettings={data.dbDisplaySettings}
        dbCategories={data.dbCategories}
      />
    </>
  );
}
