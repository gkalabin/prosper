import { Amount } from "lib/Amount";
import { Currency } from "lib/model/Currency";

export class AmountWithCurrency {
  private readonly amount: Amount;
  private readonly currency: Currency;

  public constructor(init: { amountCents: number; currency: Currency }) {
    this.amount = new Amount({ amountCents: init.amountCents });
    this.currency = init.currency;
  }

  public static add(
    x: AmountWithCurrency,
    y: AmountWithCurrency
  ): AmountWithCurrency {
    return x.add(y);
  }

  public static sum(
    amounts: AmountWithCurrency[],
    currency: Currency
  ): AmountWithCurrency {
    if (!amounts?.length) {
      return AmountWithCurrency.zero(currency);
    }
    return amounts.reduce((p, c) => p.add(c));
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

  public getAmountWithoutCurrency() {
    return this.amount;
  }

  public cents() {
    return this.amount.cents();
  }

  public dollar() {
    return this.amount.dollar();
  }

  public abs() {
    if (this.amount.isNegative()) {
      return new AmountWithCurrency({
        amountCents: this.amount.abs().cents(),
        currency: this.currency,
      });
    }
    return this;
  }

  public round() {
    if (!this.isRound()) {
      return new AmountWithCurrency({
        amountCents: Math.round(this.amount.dollar()) * 100,
        currency: this.currency,
      });
    }
    return this;
  }

  public isZero() {
    return this.amount.isZero();
  }

  public isPositive() {
    return this.amount.isPositive();
  }

  public isNegative() {
    return this.amount.isNegative();
  }

  public isRound() {
    return this.amount.cents() % 100 == 0;
  }

  public add(other: AmountWithCurrency): AmountWithCurrency {
    if (!other) {
      return this;
    }
    this.assertSameCurrency(other);
    return new AmountWithCurrency({
      amountCents: this.amount.add(other.amount).cents(),
      currency: this.currency,
    });
  }

  public subtract(other: AmountWithCurrency): AmountWithCurrency {
    this.assertSameCurrency(other);
    return new AmountWithCurrency({
      amountCents: this.amount.subtract(other.amount).cents(),
      currency: this.currency,
    });
  }

  public equals(other: AmountWithCurrency) {
    this.assertSameCurrency(other);
    return this.amount.equals(other.amount);
  }

  public lessThan(other: AmountWithCurrency) {
    this.assertSameCurrency(other);
    return this.amount.lessThan(other.amount);
  }

  public format(): string {
    return this.currency.format(this.amount.dollar(), {
      maximumFractionDigits: this.isRound() ? 0 : 2,
    });
  }

  public toString() {
    return this.format();
  }

  private assertSameCurrency(a: AmountWithCurrency) {
    if (a.currency.id != this.currency.id) {
      throw new Error(
        `Impossible to add ${a.currency.name} and ${this.currency.name}`
      );
    }
  }
}
