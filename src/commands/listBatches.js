import { listBatches } from '../models/batch.js';
import { printTable } from '../lib/format.js';
import { batchListSchema } from '../lib/validate.js';
import { pickOptionalDrug } from '../lib/interact.js';

export function registerListBatches(list) {
  list
    .command('batches')
    .alias('batch')
    .description('List batches')
    .option('--drug <drug>', 'filter by drug id')
    .action(async (options) => {
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
    });
}