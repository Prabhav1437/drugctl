import { flagBatch } from '../models/batch.js';
import { printRecord } from '../lib/format.js';
import { AppError } from '../lib/errors.js';
import { batchFlagSchema } from '../lib/validate.js';
import { askText, pickBatch } from '../lib/interact.js';

export function registerFlagBatch(flag) {
  flag
    .command('batch')
    .description('Flag a batch for review')
    .argument('[batchId]', 'batch id, or pick from a list')
    .option('--reason <reason>', 'flag reason')
    .action(async (batchId, options) => {
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
    });
}