import { createBatch } from '../models/batch.js';
import { printRecord } from '../lib/format.js';
import { batchAddSchema } from '../lib/validate.js';
import {
  askDate,
  askOptionalText,
  askText,
  pickDrug
} from '../lib/interact.js';

export function registerAddBatch(add) {
  add
    .command('batch')
    .description('Add a batch')
    .option('--drug <drug>', 'drug id')
    .option('--batch-no <batchNo>', 'batch number')
    .option('--mfg <mfg>', 'manufacturing date, YYYY-MM-DD')
    .option('--expiry <expiry>', 'expiry date, YYYY-MM-DD')
    .option('--vendor <vendor>', 'vendor name')
    .action(async (options) => {
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
    });
}