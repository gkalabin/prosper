import {Amount} from 'lib/Amount';
import {formatCurrency} from 'lib/model/Currency';
import {formatStock} from 'lib/model/Stock';
import {Unit, isCurrency, isStock} from 'lib/model/Unit';

export class AmountWithUnit {
  private readonly amount: Amount;
  private readonly unit: Unit;

  public constructor(init: {amountCents: number; unit: Unit}) {
    this.amount = new Amount({amountCents: init.amountCents});
    this.unit = init.unit;
  }

  public static add(x: AmountWithUnit, y: AmountWithUnit): AmountWithUnit {
    return x.add(y);
  }

  public static sum(amounts: AmountWithUnit[], unit: Unit): AmountWithUnit {
    if (!amounts?.length) {
      return AmountWithUnit.zero(unit);
    }
    return amounts.reduce((p, c) => p.add(c));
  }

  public static zero(unit: Unit): AmountWithUnit {
    return new AmountWithUnit({
      amountCents: 0,
      unit,
    });
  }

  public getUnit() {
    return this.unit;
  }

  public getAmount() {
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
      return new AmountWithUnit({
        amountCents: this.amount.abs().cents(),
        unit: this.unit,
      });
    }
    return this;
  }

  public round() {
    if (!this.isRound()) {
      return new AmountWithUnit({
        amountCents: Math.round(this.amount.dollar()) * 100,
        unit: this.unit,
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
    return this.amount.isRound();
  }

  public add(other: AmountWithUnit): AmountWithUnit {
    if (!other || other.isZero()) {
      return this;
    }
    this.assertSameUnit(other);
    return new AmountWithUnit({
      amountCents: this.amount.add(other.amount).cents(),
      unit: this.unit,
    });
  }

  public subtract(other: AmountWithUnit): AmountWithUnit {
    // TODO: do not short curcuit before asserting the same unit
    if (!other || other.isZero()) {
      return this;
    }
    this.assertSameUnit(other);
    return new AmountWithUnit({
      amountCents: this.amount.subtract(other.amount).cents(),
      unit: this.unit,
    });
  }

  public equals(other: AmountWithUnit): boolean {
    this.assertSameUnit(other);
    return this.amount.equals(other.amount);
  }

  public lessThan(other: AmountWithUnit): boolean {
    this.assertSameUnit(other);
    return this.amount.lessThan(other.amount);
  }

  public format(): string {
    const opts = {
      maximumFractionDigits: this.isRound() ? 0 : 2,
    };
    if (isStock(this.unit)) {
      return formatStock(this.unit, this.amount.dollar(), opts);
    }
    if (isCurrency(this.unit)) {
      return formatCurrency(this.unit, this.amount.dollar(), opts);
    }
    throw new Error(`Unknown unit type of ${this.unit}`);
  }

  public toString() {
    return this.format();
  }

  private assertSameUnit(that: AmountWithUnit) {
    if (
      isCurrency(that.unit) &&
      isCurrency(this.unit) &&
      that.unit.code() == this.unit.code()
    ) {
      return;
    }
    if (
      isStock(that.unit) &&
      isStock(this.unit) &&
      that.unit.exchange == this.unit.exchange &&
      that.unit.ticker == this.unit.ticker
    ) {
      return;
    }

    throw new Error(`Impossible to add ${this.unit} and ${that.unit}`);
  }
}
