import { useAllDatabaseDataContext } from "lib/ClientSideModel";

export const useDisplayCurrency = () => {
  const { currencies } = useAllDatabaseDataContext();
  return currencies.findByName("GBP");
};
