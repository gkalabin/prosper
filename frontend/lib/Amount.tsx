import {dollarToNanos} from '@/lib/util/util';

const NANOS_PER_UNIT = 1_000_000_000n;

export class Amount {
  static readonly ZERO = new Amount({amountNanos: 0n});

  private readonly amountNanos: bigint;

  public constructor(init: {amountNanos: bigint}) {
    this.amountNanos = init.amountNanos;
  }

  public static fromDollar(dollar: number): Amount {
    return new Amount({
      amountNanos: dollarToNanos(dollar),
    });
  }

  public nanos(): bigint {
    return this.amountNanos;
  }

  public dollar(): number {
    return Number(this.amountNanos) / Number(NANOS_PER_UNIT);
  }

  public abs(): Amount {
    if (this.amountNanos >= 0n) {
      return this;
    }
    return new Amount({
      amountNanos: -this.amountNanos,
    });
  }

  public add(a: Amount): Amount {
    return new Amount({
      amountNanos: this.amountNanos + a.amountNanos,
    });
  }

  public subtract(a: Amount): Amount {
    return new Amount({
      amountNanos: this.amountNanos - a.amountNanos,
    });
  }

  public round(): Amount {
    if (!this.isRound()) {
      return new Amount({
        amountNanos: BigInt(Math.round(this.dollar())) * NANOS_PER_UNIT,
      });
    }
    return this;
  }

  public negate(): Amount {
    return new Amount({amountNanos: -this.amountNanos});
  }

  public equals(a: Amount): boolean {
    return this.amountNanos == a.amountNanos;
  }

  public lessThan(a: Amount): boolean {
    return this.amountNanos < a.amountNanos;
  }

  public isZero(): boolean {
    return this.amountNanos === 0n;
  }

  public isPositive(): boolean {
    return this.amountNanos > 0n;
  }

  public isNegative(): boolean {
    return this.amountNanos < 0n;
  }

  public isRound(): boolean {
    return this.amountNanos % NANOS_PER_UNIT == 0n;
  }

  public format(options?: Intl.NumberFormatOptions): string {
    return Intl.NumberFormat([], {
      maximumFractionDigits: this.isRound() ? 0 : 2,
      ...options,
    }).format(this.dollar());
  }
}
