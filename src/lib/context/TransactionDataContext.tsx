'use client';
import {
  coreModelFromDB,
  TransactionDataModel,
  transactionModelFromDB,
} from '@/lib/ClientSideModel';
import {
  CoreData as DBCoreData,
  TransactionData as DBTransactionData,
} from '@/lib/db/fetch';
import {createContext, useContext} from 'react';

const TransactionDataContext = createContext<TransactionDataModel>(
  null as unknown as TransactionDataModel
);

export function TransactionDataContextProvider(props: {
  // TODO: transaction data requires core data and it is not a clean separation of concerns.
  dbData: DBTransactionData & DBCoreData;
  children: JSX.Element | JSX.Element[];
}) {
  const core = coreModelFromDB(props.dbData);
  const model = transactionModelFromDB(props.dbData, core);
  return (
    <TransactionDataContext.Provider value={model}>
      {props.children}
    </TransactionDataContext.Provider>
  );
}

export function useTransactionDataContext() {
  const ctx = useContext(TransactionDataContext);
  if (!ctx) {
    throw new Error('TransactionDataContext is not configured');
  }
  return ctx;
}
