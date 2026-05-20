'use client';
import {StaleExchangeRatesWarning} from '@/components/StaleExchangeRatesWarning';
import {MarketDataModel, marketModelFromDB} from '@/lib/ClientSideModel';
import {GetMarketDataForUserResponse} from '@/lib/grpc/gen/prosper/v1/rates';
import {createContext, useContext} from 'react';

const MarketDataContext = createContext<MarketDataModel>(
  null as unknown as MarketDataModel
);

export function MarketDataContextProvider(props: {
  dbData: GetMarketDataForUserResponse;
  children: JSX.Element | JSX.Element[];
}) {
  const model = marketModelFromDB(props.dbData);
  return (
    <MarketDataContext.Provider value={model}>
      <StaleExchangeRatesWarning
        dbExchangeRates={props.dbData.rates}
        dbStockQuotes={props.dbData.quotes}
      />
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
