import { IOpenBankingData } from "lib/openbanking/interface";
import { createContext, useContext, useState } from "react";

const OpenBankingDataContext = createContext<
  IOpenBankingData & {
    setObData: (x: IOpenBankingData) => void;
  }
>(null);
export const OpenBankingDataContextProvider = (props: {
  data: IOpenBankingData;
  children: JSX.Element | JSX.Element[];
}) => {
  const [obDataState, setObData] = useState(props.data);
  return (
    <OpenBankingDataContext.Provider value={{ ...obDataState, setObData }}>
      {props.children}
    </OpenBankingDataContext.Provider>
  );
};
export const useOpenBankingDataContext = () => {
  return useContext(OpenBankingDataContext);
};
