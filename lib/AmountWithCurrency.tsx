import { Amount } from "lib/Amount";
import { Currency } from "lib/model/Currency";

export class AmountWithCurrency {
  private readonly amount: Amount;
  private readonly currency: Currency;

  public constructor(init: { amountCents: number; currency: Currency }) {
    this.amount = new Amount({ amountCents: init.amountCents });
    this.currency = init.currency;
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

  isZero() {
    return this.amount.cents() == 0;
  }

  public add(other: AmountWithCurrency): AmountWithCurrency {
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
    return this.currency.format(this.amount.dollar());
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
