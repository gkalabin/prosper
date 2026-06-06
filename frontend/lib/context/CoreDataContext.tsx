'use client';
import {CoreDataModel, coreModelFromDB} from '@/lib/ClientSideModel';
import {DisplaySettingsContextProvider} from '@/lib/context/DisplaySettingsContext';
import {CoreData} from '@/lib/db/fetch';
import {createContext, useContext} from 'react';

const CoreDataContext = createContext<CoreDataModel>(
  null as unknown as CoreDataModel
);

export function CoreDataContextProvider(props: {
  dbData: CoreData;
  children: JSX.Element | JSX.Element[];
}) {
  const model = coreModelFromDB(props.dbData);
  return (
    <DisplaySettingsContextProvider dbSettings={props.dbData.displaySettings}>
      <CoreDataContext.Provider value={model}>
        {props.children}
      </CoreDataContext.Provider>
    </DisplaySettingsContextProvider>
  );
}

export function useCoreDataContext() {
  const ctx = useContext(CoreDataContext);
  if (!ctx) {
    throw new Error('CoreDataContext is not configured');
  }
  return ctx;
}
