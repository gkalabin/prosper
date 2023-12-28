import { DB } from "lib/db";
import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";
import { DispalySettings } from "./client";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Display Settings - Prosper",
};

async function getUserId(): Promise<number> {
  const session = await getServerSession(authOptions);
  const userId = +session?.user?.id;
  if (!userId) {
    return redirect("/api/auth/signin");
  }
  return userId;
}

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
