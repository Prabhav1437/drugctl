import { cancel, isCancel, select, text } from '@clack/prompts';
import { listBatchesWithStock } from '../models/stockTransaction.js';
import { listDrugs } from '../models/drug.js';
import { listInstitutions } from '../models/institution.js';
import { listBatches } from '../models/batch.js';
import { formatDate } from './format.js';

export const INSTITUTION_TYPES = [
  { value: 'STATE_WH', label: 'State Warehouse' },
  { value: 'DIST_WH', label: 'District Warehouse' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'CHC', label: 'Community Health Centre (CHC)' },
  { value: 'PHC', label: 'Primary Health Centre (PHC)' }
];

const INSTITUTION_TYPE_LABELS = Object.fromEntries(
  INSTITUTION_TYPES.map(({ value, label }) => [value, label])
);

export const DRUG_FORMS = [
  'tablet',
  'capsule',
  'syrup',
  'sachet',
  'injection',
  'ointment',
  'drops',
  'powder'
];

export const DRUG_UNITS = ['strip', 'bottle', 'box', 'vial', 'sachet', 'tube', 'ampoule'];

export function handleCancel() {
  cancel('Operation cancelled.');
  process.exit(0);
}

export function isInteractive() {
  return Boolean(process.stdin.isTTY);
}

export async function askText(message, { placeholder, initialValue, validate, required = true } = {}) {
  if (!isInteractive()) {
    return undefined;
  }
  const value = await text({
    message,
    placeholder,
    initialValue,
    validate: composeValidator({ message, required, validate })
  });
  if (isCancel(value)) {
    handleCancel();
  }
  const trimmed = value == null ? '' : value.trim();
  return required || trimmed !== '' ? trimmed : undefined;
}

export async function askOptionalText(message, { placeholder } = {}) {
  return askText(message, { placeholder, required: false });
}

export async function askNumber(message, { initial = undefined, min } = {}) {
  if (!isInteractive()) {
    return undefined;
  }
  const value = await askText(message, {
    placeholder: initial === undefined ? undefined : String(initial),
    initialValue: initial === undefined ? undefined : String(initial),
    validate: (input) => {
      if (initial !== undefined && input.trim() === '') {
        return undefined;
      }
      if (!/^\d+$/.test(input.trim())) {
        return `${labelOf(message)} must be a whole number.`;
      }
      if (min !== undefined && Number(input) < min) {
        return `${labelOf(message)} must be at least ${min}.`;
      }
      return undefined;
    }
  });
  return value == null ? undefined : value.trim() === '' && initial !== undefined ? initial : Number(value);
}

export async function askDate(message) {
  if (!isInteractive()) {
    return undefined;
  }
  const value = await askText(message, {
    placeholder: 'e.g. 2027-03-01',
    validate: (input) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.trim()) ||
          Number.isNaN(Date.parse(`${input.trim()}T00:00:00Z`))) {
        return 'Please enter a valid date in YYYY-MM-DD format.';
      }
      return undefined;
    }
  });
  return value;
}

export async function askSelect(message, options) {
  if (!isInteractive()) {
    return undefined;
  }
  const value = await select({ message, options });
  if (isCancel(value)) {
    handleCancel();
  }
  return value;
}

export async function askSelectOrOther(message, options) {
  const value = await askSelect(message, [
    ...options.map((option) => ({ value: option, label: option })),
    { value: '__other__', label: 'Other / custom' }
  ]);
  if (value === '__other__') {
    return askOptionalText(`${labelOf(message)} (custom):`);
  }
  return value;
}

export async function pickInstitution(message, { type } = {}) {
  const rows = await listInstitutions({ type });
  requireAny(rows, 'institutions', 'institution');
  return askSelect(
    message,
    rows.map((row) => ({
      value: row.id,
      label: formatInstitution(row)
    }))
  );
}

export async function pickOptionalInstitution(message, { noneLabel = 'None / all' } = {}) {
  return pickOptionalOption(message, await institutionOptions(), noneLabel);
}

export async function pickDrug(message) {
  const rows = await listDrugs();
  requireAny(rows, 'drugs', 'drug');
  return askSelect(
    message,
    rows.map((row) => ({
      value: row.id,
      label: `${row.name}${row.form ? ` (${row.form})` : ''}`
    }))
  );
}

export async function pickOptionalDrug(message, { noneLabel = 'None / all drugs' } = {}) {
  return pickOptionalOption(message, await drugOptions(), noneLabel);
}

export async function pickBatch(message, { institution } = {}) {
  const rows = institution
    ? await listBatchesWithStock({ institution })
    : await listBatches();
  requireAny(rows, 'batches', 'batch');
  return askSelect(message, rows.map((row) => ({ value: row.id, label: formatBatch(row) })));
}

export async function pickType(message) {
  return askSelect(message, INSTITUTION_TYPES);
}

export async function pickStorage(message) {
  return askSelect(message, [
    { value: 'NORMAL', label: 'Normal storage' },
    { value: 'COLD_CHAIN', label: 'Cold chain / refrigerator' }
  ]);
}

export async function pickListType(message) {
  return askSelect(message, [
    { value: 'all', label: 'All types' },
    ...INSTITUTION_TYPES
  ]);
}

function composeValidator({ message, required, validate }) {
  return (value) => {
    if (required && !value.trim()) {
      return `${labelOf(message)} is required.`;
    }
    if (validate) {
      return validate(value);
    }
    return undefined;
  };
}

function labelOf(message) {
  return message.replace(/[:\s]+$/, '').replace(/ \(or pick none\)$/, '');
}

function requireAny(rows, noun, recommend) {
  if (rows.length === 0) {
    throw new Error(`No ${noun} found yet. Add one first with "drugctl add ${recommend}".`);
  }
}

function formatInstitution(row) {
  const typeLabel = INSTITUTION_TYPE_LABELS[row.type] ?? row.type;
  return `${row.name} — ${typeLabel}${row.location ? ` (${row.location})` : ''}`;
}

function formatBatch(row) {
  let label = `${row.drug_name} | ${row.batch_no}`;
  if (row.expiry_date) {
    label += ` | expires ${formatDate(row.expiry_date)}`;
  }
  if (row.qty !== undefined) {
    const unit = row.unit ? ` ${row.unit}` : '';
    label += row.flagged ? ` | stock ${row.qty}${unit} (flagged)` : ` | stock ${row.qty}${unit}`;
  } else if (row.flagged) {
    label += ' (flagged)';
  }
  return label;
}

async function institutionOptions() {
  return (await listInstitutions()).map((row) => ({
    value: row.id,
    label: formatInstitution(row)
  }));
}

async function drugOptions() {
  return (await listDrugs()).map((row) => ({
    value: row.id,
    label: `${row.name}${row.form ? ` (${row.form})` : ''}`
  }));
}

async function pickOptionalOption(message, options, noneLabel) {
  if (options.length === 0) {
    return undefined;
  }
  const wanted = await askSelect(message, [{ value: 'none', label: noneLabel }, ...options]);
  return wanted === 'none' ? undefined : wanted;
}