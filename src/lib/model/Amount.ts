export type AmountPlain = {
  cents: number;
};

type A = AmountPlain;

export const add = (a: A, b: A): A => ({cents: a.cents + b.cents});
export const subtract = (a: A, b: A): A => ({cents: a.cents - b.cents});
export const round = (a: A): A => ({cents: Math.round(a.cents / 100) * 100});
export const isZero = (a: A): boolean => a.cents === 0;
export const isPositive = (a: A): boolean => a.cents > 0;
export const isNegative = (a: A): boolean => a.cents < 0;
export const abs = (a: A): A => ({cents: Math.abs(a.cents)});
export const format = (a: A): string => (a.cents / 100).toFixed(2);
