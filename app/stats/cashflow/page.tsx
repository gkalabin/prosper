import { CashflowPage } from "app/stats/cashflow/CashflowPage";
import { DB, fetchAllDatabaseData } from "lib/db";
import { getUserId } from "lib/user";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cashflow - Prosper",
};

export default async function Page() {
  const userId = await getUserId();
  const db = new DB({ userId });
  const data = await fetchAllDatabaseData(db);
  return <CashflowPage dbData={data} />;
}
