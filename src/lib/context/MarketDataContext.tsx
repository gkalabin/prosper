'use client';
import {MarketDataModel, marketModelFromDB} from '@/lib/ClientSideModel';
import {MarketData as DBMarketData} from '@/lib/db/fetch';
import {createContext, useContext} from 'react';

const MarketDataContext = createContext<MarketDataModel>(
  null as unknown as MarketDataModel
);

export function MarketDataContextProvider(props: {
  dbData: DBMarketData;
  children: JSX.Element | JSX.Element[];
}) {
  const model = marketModelFromDB(props.dbData);
  return (
    <MarketDataContext.Provider value={model}>
      {props.children}
    </MarketDataContext.Provider>
  );
}

export function useMarketDataContext() {
  const ctx = useContext(MarketDataContext);
  if (!ctx) {
    throw new Error('MarketDataContext is not configured');
  }
  return ctx;
}
