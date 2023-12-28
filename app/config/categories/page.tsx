import { CategoriesConfigPage } from "app/config/categories/client";
import { DB } from "lib/db";
import { getUserId } from "lib/user";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categories Config - Prosper",
};

export default async function Page() {
  const userId = await getUserId();
  const db = new DB({ userId });
  const dbCategories = await db.categoryFindMany();
  return <CategoriesConfigPage dbCategories={dbCategories} />;
}
