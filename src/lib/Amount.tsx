export class Amount {
  static readonly ZERO = new Amount({amountCents: 0});

  private readonly amountCents: number;

  public constructor(init: {amountCents: number}) {
    if (!Number.isInteger(init.amountCents)) {
      throw new Error(`Want integer, got ${init.amountCents}`);
    }
    this.amountCents = init.amountCents;
  }

  public cents(): number {
    return this.amountCents;
  }

  public dollar(): number {
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

  public round(): Amount {
    if (!this.isRound()) {
      return new Amount({
        amountCents: Math.round(this.dollar()) * 100,
      });
    }
    return this;
  }

  public negate(): Amount {
    return new Amount({amountCents: -this.amountCents});
  }

  public equals(a: Amount): boolean {
    return this.amountCents == a.amountCents;
  }

  public lessThan(a: Amount): boolean {
    return this.amountCents < a.amountCents;
  }

  public isZero(): boolean {
    return this.amountCents === 0;
  }

  public isPositive(): boolean {
    return this.amountCents > 0;
  }

  public isNegative(): boolean {
    return this.amountCents < 0;
  }

  public isRound(): boolean {
    return this.amountCents % 100 == 0;
  }

  public format(): string {
    return this.dollar().toFixed(2);
  }
}
