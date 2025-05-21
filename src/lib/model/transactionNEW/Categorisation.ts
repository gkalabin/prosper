import {AmountPlain} from '@/lib/model/Amount';
import {UnitId} from '../Unit';

export interface Categorisation {
  categoryId: number;
  unitId: UnitId;
  userShare: AmountPlain;
  companion: {
    accountId: number;
    share: AmountPlain;
  } | null;
}
