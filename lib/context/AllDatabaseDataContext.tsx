import { AllClientDataModel, modelFromDatabaseData } from "lib/ClientSideModel";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { Setter } from "lib/stateHelpers";
import { createContext, useContext, useState } from "react";

const AllDatabaseDataContext = createContext<
  AllClientDataModel & {
    setDbData: Setter<AllDatabaseData>;
  }
>(
  null as unknown as AllClientDataModel & {
    setDbData: Setter<AllDatabaseData>;
  },
);

export const AllDatabaseDataContextProvider = (props: {
  dbData: AllDatabaseData;
  children: JSX.Element | JSX.Element[];
}) => {
  const [dbDataState, setDbData] = useState(props.dbData);
  const model = modelFromDatabaseData(dbDataState);
  return (
    <AllDatabaseDataContext.Provider value={{ ...model, setDbData }}>
      {props.children}
    </AllDatabaseDataContext.Provider>
  );
};

export const useAllDatabaseDataContext = () => {
  return useContext(AllDatabaseDataContext);
};
