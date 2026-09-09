import { issueStock } from '../models/stockTransaction.js';
import { printTransaction } from '../lib/format.js';
import { stockReceiveSchema } from '../lib/validate.js';
import { askNumber, askOptionalText, pickBatch, pickInstitution } from '../lib/interact.js';

export function registerIssue(program) {
  program
    .command('issue')
    .description('Issue stock out of an institution')
    .option('--institution <institution>', 'institution id')
    .option('--batch <batch>', 'batch id')
    .option('--qty <qty>', 'quantity')
    .option('--note <note>', 'note')
    .action(async (options) => {
      const institution = options.institution ?? await pickInstitution('Which institution issued the stock?');
      const batch = options.batch ?? await pickBatch('Which drug / batch was issued?', { institution });
      const qty = options.qty ?? await askNumber('How many units were issued?', { min: 1 });
      const note = options.note ?? await askOptionalText('Note (optional):');

      const row = await issueStock(stockReceiveSchema.parse({ institution, batch, qty, note }));
      printTransaction(row);
    });
}