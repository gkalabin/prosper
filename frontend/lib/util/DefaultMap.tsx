export class DefaultMap<K, V> extends Map<K, V> {
  private readonly _defaultValue: () => V;

  constructor(defaultValueProducer: () => V) {
    super();
    this._defaultValue = defaultValueProducer;
  }

  getOrCreate(k: K): V {
    const v = this.get(k);
    if (v === undefined) {
      const def = this._defaultValue();
      this.set(k, def);
      return def;
    }
    return v;
  }
}
