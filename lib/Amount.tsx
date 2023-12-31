export class Amount {
  static readonly ZERO = new Amount({amountCents: 0});

  private readonly amountCents: number;

  public constructor(init: {amountCents: number}) {
    if (!Number.isInteger(init.amountCents)) {
      throw new Error(`Want integer, got ${init.amountCents}`);
    }
    this.amountCents = init.amountCents;
  }

  public cents() {
    return this.amountCents;
  }

  public dollar() {
    return this.amountCents / 100;
  }

  public abs(): Amount {
    if (this.amountCents >= 0) {
      return this;
    }
    return new Amount({
      amountCents: -this.amountCents,
    });
  }

  public add(a: Amount): Amount {
    return new Amount({
      amountCents: this.amountCents + a.amountCents,
    });
  }

  public subtract(a: Amount): Amount {
    return new Amount({
      amountCents: this.amountCents - a.amountCents,
    });
  }

  public equals(a: Amount) {
    return this.amountCents == a.amountCents;
  }

  public lessThan(a: Amount) {
    return this.amountCents < a.amountCents;
  }

  public isZero() {
    return this.amountCents === 0;
  }

  public isPositive() {
    return this.amountCents > 0;
  }

  public isNegative() {
    return this.amountCents < 0;
  }

  public isRound() {
    return this.amountCents % 100 == 0;
  }

  public format(): string {
    return this.dollar().toFixed(2);
  }
}

export class AbsoluteAmount extends Amount {
  public constructor(init: {amountCents: number}) {
    super(init);
    if (this.cents() < 0) {
      throw new Error(`Want non-negative amount, got ${this.cents()}`);
    }
  }
}
