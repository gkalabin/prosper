'use client';
import {
  TransactionDataModel,
  transactionModelFromDB,
} from '@/lib/ClientSideModel';
import {TransactionData as DBTransactionData} from '@/lib/db/fetch';
import {createContext, useContext} from 'react';

const TransactionDataContext = createContext<TransactionDataModel>(
  null as unknown as TransactionDataModel
);

export function TransactionDataContextProvider(props: {
  dbData: DBTransactionData;
  children: JSX.Element | JSX.Element[];
}) {
  const model = transactionModelFromDB(props.dbData);
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
