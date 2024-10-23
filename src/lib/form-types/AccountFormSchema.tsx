import {z} from 'zod';

const currencyUnitSchema = z.object({
  kind: z.literal('currency'),
  currencyCode: z.string().min(1),
});

const stockUnitSchema = z.object({
  kind: z.literal('stock'),
  ticker: z.string().min(1),
  exchange: z.string().min(1),
  name: z.string().min(1),
});

const unitSchema = z.union([currencyUnitSchema, stockUnitSchema]);

export const accountFormValidationSchema = z.object({
  name: z.string().min(1),
  unit: unitSchema,
  isJoint: z.boolean(),
  isArchived: z.boolean(),
  initialBalance: z.number(),
  displayOrder: z.number(),
  bankId: z.number(),
});

export type AccountFormSchema = z.infer<typeof accountFormValidationSchema>;
export type StockUnitSchema = z.infer<typeof stockUnitSchema>;
export type CurrencyUnitSchema = z.infer<typeof currencyUnitSchema>;
export type UnitSchema = z.infer<typeof unitSchema>;
