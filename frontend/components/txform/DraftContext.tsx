'use client';
import {TransactionDraft} from '@/lib/grpc/gen/prosper/v1/ledger';
import {createContext, useContext} from 'react';

// The draft is the open banking suggestion the form was seeded from, kept
// around so actions can prefill fields the form hid initially. Null when the user
// creates a transaction without picking a suggestion.
const DraftContext = createContext<TransactionDraft | null>(null);

export function DraftContextProvider(props: {
  draft: TransactionDraft | null;
  children: React.ReactNode;
}) {
  return (
    <DraftContext.Provider value={props.draft}>
      {props.children}
    </DraftContext.Provider>
  );
}

export function useDraft(): TransactionDraft | null {
  return useContext(DraftContext);
}
