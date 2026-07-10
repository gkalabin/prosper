'use client';
import {CoreDataModel, coreModelFromDB} from '@/lib/ClientSideModel';
import {DisplaySettingsContextProvider} from '@/lib/context/DisplaySettingsContext';
import {CoreData} from '@/lib/db/fetch';
import {CategoryTree, makeCategoryTree} from '@/lib/model/Category';
import {createContext, useContext} from 'react';

const CoreDataContext = createContext<CoreDataModel>(
  null as unknown as CoreDataModel
);

const CategoryTreeContext = createContext<CategoryTree>(
  null as unknown as CategoryTree
);

export function CoreDataContextProvider(props: {
  dbData: CoreData;
  children: JSX.Element | JSX.Element[];
}) {
  const model = coreModelFromDB(props.dbData);
  const categoryTree = makeCategoryTree(model.categories);
  return (
    <DisplaySettingsContextProvider dbSettings={props.dbData.displaySettings}>
      <CoreDataContext.Provider value={model}>
        <CategoryTreeContext.Provider value={categoryTree}>
          {props.children}
        </CategoryTreeContext.Provider>
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

export function useCategoryTree(): CategoryTree {
  const tree = useContext(CategoryTreeContext);
  if (!tree) {
    throw new Error('CategoryTreeContext is not configured');
  }
  return tree;
}
