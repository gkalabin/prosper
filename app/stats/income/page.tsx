import { IncomePage } from "app/stats/income/IncomePage";
import { DB, fetchAllDatabaseData } from "lib/db";
import { getUserId } from "lib/user";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Income - Prosper",
};

export default async function Page() {
  const userId = await getUserId();
  const db = new DB({ userId });
  const data = await fetchAllDatabaseData(db);
  return <IncomePage dbData={data} />;
}
