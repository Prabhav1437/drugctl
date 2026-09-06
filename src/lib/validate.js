import { z } from 'zod';

const uuid = z.string().uuid();
const optionalUuid = z.preprocess(emptyToUndefined, uuid.optional());
const optionalText = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional());
const integer = z.preprocess(
  toNumber,
  z.number({ invalid_type_error: 'Must be a number' }).int('Must be an integer')
);
const positiveInteger = integer.pipe(z.number().int().positive());
const nonZeroInteger = integer.pipe(z.number().int().refine((value) => value !== 0, 'Must not be zero'));
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Use a valid date');

export const institutionAddSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(['STATE_WH', 'DIST_WH', 'HOSPITAL', 'CHC', 'PHC']),
  parent: optionalUuid,
  location: optionalText
});

export const institutionListSchema = z.object({
  type: z.enum(['STATE_WH', 'DIST_WH', 'HOSPITAL', 'CHC', 'PHC']).optional()
});

export const drugAddSchema = z.object({
  name: z.string().trim().min(1),
  genericName: optionalText,
  form: optionalText,
  unit: z.string().trim().min(1),
  storage: z.enum(['NORMAL', 'COLD_CHAIN']).default('NORMAL')
});

export const drugListSchema = z.object({});

export const batchAddSchema = z.object({
  drug: uuid,
  batchNo: z.string().trim().min(1),
  mfg: z.preprocess(emptyToUndefined, isoDate.optional()),
  expiry: isoDate,
  vendor: optionalText
});

export const batchListSchema = z.object({
  drug: optionalUuid
});

export const batchFlagSchema = z.object({
  batchId: uuid,
  reason: z.string().trim().min(1)
});

export const stockReceiveSchema = z.object({
  institution: uuid,
  batch: uuid,
  qty: positiveInteger,
  note: optionalText
});

export const stockIssueSchema = stockReceiveSchema;

export const stockAdjustSchema = z.object({
  institution: uuid,
  batch: uuid,
  qty: nonZeroInteger,
  reason: z.string().trim().min(1)
});

export const stockBalanceSchema = z.object({
  institution: uuid,
  drug: optionalUuid
});

export const expiryCheckSchema = z.object({
  within: positiveInteger,
  institution: optionalUuid
});

export const lowStockSchema = z.object({
  institution: uuid,
  threshold: z.preprocess(toNumber, z.number().int().min(0))
});

function emptyToUndefined(value) {
  return value === '' ? undefined : value;
}

function toNumber(value) {
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value);
    return Number.isNaN(number) ? value : number;
  }
  return value;
}
