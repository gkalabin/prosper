'use client';
import {CoreDataModel, coreModelFromDB} from '@/lib/ClientSideModel';
import {DisplaySettingsContextProvider} from '@/lib/context/DisplaySettingsContext';
import {CoreData as DBCoreData} from '@/lib/db/fetch';
import {createContext, useContext} from 'react';

const CoreDataContext = createContext<CoreDataModel>(
  null as unknown as CoreDataModel
);

export function CoreDataContextProvider(props: {
  dbData: DBCoreData;
  children: React.ReactNode;
}) {
  const model = coreModelFromDB(props.dbData);
  return (
    <DisplaySettingsContextProvider dbSettings={props.dbData.dbDisplaySettings}>
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
