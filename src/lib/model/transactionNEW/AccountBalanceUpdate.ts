import {Account} from '@/lib/model/Account';

export type AccountBalanceUpdate = {
  account: Account;
  delta: number;
};
