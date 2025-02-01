import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';

export function isFullyConfigured(dbData: AllDatabaseData) {
  return dbData.dbCategories?.length && dbData.dbAccounts?.length;
}

export const NotConfiguredYet = () => (
  <>Please configure some bank accounts and categories.</>
);
