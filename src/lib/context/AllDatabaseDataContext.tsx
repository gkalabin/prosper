import {
  CoreDataContextProvider,
  useCoreDataContext,
} from '@/lib/context/CoreDataContext';
import {DisplaySettingsContextProvider} from '@/lib/context/DisplaySettingsContext';
import {
  MarketDataContextProvider,
  useMarketDataContext,
} from '@/lib/context/MarketDataContext';
import {
  TransactionDataContextProvider,
  useTransactionDataContext,
} from '@/lib/context/TransactionDataContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';

export const AllDatabaseDataContextProvider = (props: {
  dbData: AllDatabaseData;
  children: JSX.Element | JSX.Element[];
}) => {
  return (
    <DisplaySettingsContextProvider dbSettings={props.dbData.dbDisplaySettings}>
      <CoreDataContextProvider dbData={props.dbData}>
        <TransactionDataContextProvider dbData={props.dbData}>
          <MarketDataContextProvider dbData={props.dbData}>
            {props.children}
          </MarketDataContextProvider>
        </TransactionDataContextProvider>
      </CoreDataContextProvider>
    </DisplaySettingsContextProvider>
  );
};

export const useAllDatabaseDataContext = () => {
  const core = useCoreDataContext();
  const transaction = useTransactionDataContext();
  const market = useMarketDataContext();
  return {...core, ...transaction, ...market};
};
