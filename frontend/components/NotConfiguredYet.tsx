import {AppData} from '@/lib/model/AppDataModel';

export function isFullyConfigured(dbData: AppData) {
  return dbData.categories?.length && dbData.bankAccounts?.length;
}

export const NotConfiguredYet = () => (
  <>Please configure some bank accounts and categories.</>
);
