import { createBatch, flagBatch, listBatches } from '../models/batch.js';
import { printRecord, printTable } from '../lib/format.js';
import { AppError, handleCliError } from '../lib/errors.js';
import { batchAddSchema, batchFlagSchema, batchListSchema } from '../lib/validate.js';
import {
  askDate,
  askOptionalText,
  askText,
  pickBatch,
  pickDrug,
  pickOptionalDrug
} from '../lib/interact.js';

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
      const drug = options.drug ?? await pickDrug('Which drug is this batch for?');
      const batchNo = options.batchNo ?? await askText('Batch number:');
      const mfg = options.mfg ?? await askOptionalText('Manufacturing date YYYY-MM-DD (optional):');
      const expiry = options.expiry ?? await askDate('Expiry date YYYY-MM-DD:');
      const vendor = options.vendor ?? await askOptionalText('Vendor / supplier (optional):');

      const row = await createBatch(batchAddSchema.parse({ drug, batchNo, mfg, expiry, vendor }));
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
    .description('List batches')
    .option('--drug <drug>', 'filter by drug id')
    .action(withErrorHandling(async (options) => {
      const drug = options.drug ?? await pickOptionalDrug('Filter by a specific drug?', {
        noneLabel: 'All drugs'
      });
      const input = batchListSchema.parse({ drug: drug ?? undefined });
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
    .argument('[batchId]', 'batch id, or pick from a list')
    .option('--reason <reason>', 'flag reason')
    .action(withErrorHandling(async (batchId, options) => {
      const picked = batchId ?? await pickBatch('Which batch should be flagged?');
      const reason = options.reason ?? await askText('Reason for flagging:');

      const input = batchFlagSchema.parse({ batchId: picked, reason });
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