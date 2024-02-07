import {AmountWithCurrency} from 'lib/AmountWithCurrency';
import {Currency} from 'lib/model/Currency';

export function currencyAppendMap<T>(c: Currency) {
  return new AppendMap<T, AmountWithCurrency>(
    AmountWithCurrency.add,
    AmountWithCurrency.zero(c)
  );
}

export class AppendMap<K, V> extends Map<K, V> {
  private readonly _combineFn: (x: V, y: V) => V;
  private readonly _zero: V;

  constructor(
    combineFn: (x: V, y: V) => V,
    zero: V,
    iterable?: Iterable<readonly [K, V]>
  ) {
    super(iterable);
    this._combineFn = combineFn;
    this._zero = zero;
  }

  increment(k: K, v: V) {
    const existing = this.getOrZero(k);
    const updated = this._combineFn(existing, v);
    this.set(k, updated);
  }

  getOrZero(k: K) {
    return this.get(k) ?? this._zero;
  }
}
