import {Account} from '@/lib/model/Account';
import {AmountPlain} from '@/lib/model/Amount';

export type AccountBalanceUpdate = {
  account: Account;
  delta: AmountPlain;
};
