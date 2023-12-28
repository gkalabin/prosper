import { useCurrencyContext } from "./ClientSideModel";

export const useDisplayCurrency = () => {
  const c = useCurrencyContext();
  const GBP = c.all().find((x) => x.name == "GBP");
  return GBP;
};
