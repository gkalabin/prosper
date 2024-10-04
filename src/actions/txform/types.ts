import {TransactionFormSchema} from '@/components/txform/types';
import {TransactionWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {
  Tag as DBTag,
  TransactionLink as DBTransactionLink,
  TransactionPrototype as DBTransactionPrototype,
  Trip as DBTrip,
} from '@prisma/client';
import {FieldPath} from 'react-hook-form';

export type UpsertTransactionClientError = {
  status: 'CLIENT_ERROR';
  errors: Partial<Record<'root' | FieldPath<TransactionFormSchema>, string[]>>;
};

export type UpsertTransactionSuccess = {
  status: 'SUCCESS';
  dbUpdates: DatabaseUpdates;
};

export type DatabaseUpdates = {
  // map transaction id to the new transaction or null if it was deleted
  transactions: Record<number, TransactionWithTagIds | null>;
  transactionLinks: Record<number, DBTransactionLink | null>;
  trip: DBTrip | null;
  tags: DBTag[];
  prototypes: DBTransactionPrototype[];
};

export type UpsertTransactionAPIResponse =
  | UpsertTransactionClientError
  | UpsertTransactionSuccess;
