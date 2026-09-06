import { createDrug, listDrugs } from '../models/drug.js';
import { printRecord, printTable } from '../lib/format.js';
import { handleCliError } from '../lib/errors.js';
import { drugAddSchema } from '../lib/validate.js';
import {
  DRUG_FORMS,
  DRUG_UNITS,
  askOptionalText,
  askSelectOrOther,
  askText,
  pickStorage
} from '../lib/interact.js';

export function registerDrugCommands({ add, list }) {
  add
    .command('drug')
    .description('Add a drug')
    .option('--name <name>', 'drug name')
    .option('--generic-name <genericName>', 'generic name')
    .option('--form <form>', 'tablet, syrup, injection, etc.')
    .option('--unit <unit>', 'strip, bottle, vial, etc.')
    .option('--storage <storage>', 'NORMAL or COLD_CHAIN')
    .action(withErrorHandling(async (options) => {
      const name = options.name ?? await askText('Drug name:');
      const genericName = options.genericName ?? await askOptionalText('Generic name (optional):');
      const form = options.form ?? await askSelectOrOther('Form:', DRUG_FORMS);
      const unit = options.unit ?? await askSelectOrOther('Packaging unit:', DRUG_UNITS);
      const storage = options.storage ?? await pickStorage('Storage requirement:');

      const row = await createDrug(drugAddSchema.parse({ name, genericName, form, unit, storage }));
      printRecord({
        id: row.id,
        name: row.name,
        generic_name: row.generic_name,
        form: row.form,
        unit: row.unit,
        storage_condition: row.storage_condition
      });
    }));

  list
    .command('drugs')
    .alias('drug')
    .description('List drugs')
    .action(withErrorHandling(async () => {
      const rows = await listDrugs();
      printTable(
        ['ID', 'Name', 'Generic', 'Form', 'Unit', 'Storage'],
        rows.map((row) => [
          row.id,
          row.name,
          row.generic_name,
          row.form,
          row.unit,
          row.storage_condition
        ])
      );
    }));
}

function withErrorHandling(fn) {
  return (...args) => fn(...args).catch(handleCliError);
}