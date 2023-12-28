import Layout from "components/Layout";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";

export function isFullyConfigured(dbData: AllDatabaseData) {
  return dbData.dbCategories?.length && dbData.dbBankAccounts?.length;
}

export const NotConfiguredYet = () => (
  <Layout>Please configure some bank accounts and categories.</Layout>
);
