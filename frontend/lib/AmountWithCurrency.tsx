import {Amount} from '@/lib/Amount';
import {Currency, formatCurrency} from '@/lib/model/Currency';

export class AmountWithCurrency extends Amount {
  private readonly currency: Currency;

  public constructor(init: {amountCents: number; currency: Currency}) {
    super({amountCents: init.amountCents});
    this.currency = init.currency;
  }

  public static add(
    x: AmountWithCurrency,
    y: AmountWithCurrency
  ): AmountWithCurrency {
    return x.add(y);
  }

  public static zero(currency: Currency): AmountWithCurrency {
    return new AmountWithCurrency({
      amountCents: 0,
      currency,
    });
  }

  public getCurrency() {
    return this.currency;
  }

  public abs(): AmountWithCurrency {
    if (this.isNegative()) {
      return new AmountWithCurrency({
        amountCents: super.abs().cents(),
        currency: this.currency,
      });
    }
    return this;
  }

  public negate() {
    return new AmountWithCurrency({
      amountCents: super.negate().cents(),
      currency: this.currency,
    });
  }

  public round() {
    if (!this.isRound()) {
      return new AmountWithCurrency({
        amountCents: super.round().cents(),
        currency: this.currency,
      });
    }
    return this;
  }

  public add(other: AmountWithCurrency): AmountWithCurrency {
    if (!other) {
      return this;
    }
    this.assertSameCurrency(other);
    return new AmountWithCurrency({
      amountCents: super.add(other).cents(),
      currency: this.currency,
    });
  }

  public subtract(other: AmountWithCurrency): AmountWithCurrency {
    if (!other) {
      return this;
    }
    this.assertSameCurrency(other);
    return new AmountWithCurrency({
      amountCents: super.subtract(other).cents(),
      currency: this.currency,
    });
  }

  public equals(other: AmountWithCurrency) {
    this.assertSameCurrency(other);
    return super.equals(other);
  }

  public lessThan(other: AmountWithCurrency) {
    this.assertSameCurrency(other);
    return super.lessThan(other);
  }

  public format(): string {
    return formatCurrency(this.currency, this.dollar(), {
      maximumFractionDigits: this.isRound() ? 0 : 2,
    });
  }

  public toString() {
    return this.format();
  }

  private assertSameCurrency(a: AmountWithCurrency) {
    if (a.currency.code != this.currency.code) {
      throw new Error(
        `Impossible to add ${a.currency.code} and ${this.currency.code}`
      );
    }
  }
}
