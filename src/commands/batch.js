import { createBatch, flagBatch, listBatches } from '../models/batch.js';
import { printRecord, printTable } from '../lib/format.js';
import { AppError, handleCliError } from '../lib/errors.js';
import { batchAddSchema, batchFlagSchema, batchListSchema } from '../lib/validate.js';

export function registerBatchCommands({ add, list, flag }) {
  add
    .command('batch')
    .description('Add a batch')
    .option('--drug <drug>', 'drug id')
    .option('--batch-no <batchNo>', 'batch number')
    .option('--mfg <mfg>', 'manufacturing date, YYYY-MM-DD')
    .option('--expiry <expiry>', 'expiry date, YYYY-MM-DD')
    .option('--vendor <vendor>', 'vendor name')
    .action(withErrorHandling(async (options) => {
      const input = batchAddSchema.parse(options);
      const row = await createBatch(input);
      printRecord({
        id: row.id,
        drug_id: row.drug_id,
        batch_no: row.batch_no,
        mfg_date: row.mfg_date,
        expiry_date: row.expiry_date,
        vendor_name: row.vendor_name
      });
    }));

  list
    .command('batches')
    .alias('batch')
    .description('List batches for a drug')
    .option('--drug <drug>', 'drug id')
    .action(withErrorHandling(async (options) => {
      const input = batchListSchema.parse(options);
      const rows = await listBatches(input);
      printTable(
        ['ID', 'Drug', 'Batch', 'Mfg', 'Expiry', 'Vendor', 'Flagged', 'Reason'],
        rows.map((row) => [
          row.id,
          row.drug_name,
          row.batch_no,
          row.mfg_date,
          row.expiry_date,
          row.vendor_name,
          row.flagged,
          row.flag_reason
        ])
      );
    }));

  flag
    .command('batch')
    .description('Flag a batch for review')
    .argument('<batchId>')
    .option('--reason <reason>', 'flag reason')
    .action(withErrorHandling(async (batchId, options) => {
      const input = batchFlagSchema.parse({ batchId, ...options });
      const row = await flagBatch(input);

      if (!row) {
        throw new AppError('Batch not found.');
      }

      printRecord({
        id: row.id,
        batch_no: row.batch_no,
        flagged: row.flagged,
        flag_reason: row.flag_reason
      });
    }));
}

function withErrorHandling(fn) {
  return (...args) => fn(...args).catch(handleCliError);
}
