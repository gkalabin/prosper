import { IncomeStatsPage } from "app/stats/income/IncomeStatsPage";
import { DB, fetchAllDatabaseData } from "lib/db";
import { getUserId } from "lib/user";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Income Stats - Prosper",
};

export default async function Page() {
  const userId = await getUserId();
  const db = new DB({ userId });
  const data = await fetchAllDatabaseData(db);
  return <IncomeStatsPage dbData={data} />;
}
