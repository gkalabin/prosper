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

  append(k: K, v: V) {
    const existing = this.get(k) ?? this._zero;
    const updated = this._combineFn(existing, v);
    this.set(k, updated);
  }
}
