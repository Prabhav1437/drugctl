import { adjustStock } from '../models/stockTransaction.js';
import { printTransaction } from '../lib/format.js';
import { stockAdjustSchema } from '../lib/validate.js';
import { askText, isInteractive, pickBatch, pickInstitution } from '../lib/interact.js';

export function registerAdjust(program) {
  program
    .command('adjust')
    .description('Adjust stock by a signed quantity')
    .option('--institution <institution>', 'institution id')
    .option('--batch <batch>', 'batch id')
    .option('--qty <qty>', 'signed non-zero quantity')
    .option('--reason <reason>', 'adjustment reason')
    .action(async (options) => {
      const institution = options.institution ?? await pickInstitution('Which institution does the adjustment apply to?');
      const batch = options.batch ?? await pickBatch('Which drug / batch was adjusted?', { institution });
      const qty = options.qty ?? await askSignedNumber('Adjustment quantity (use - for damaged/lost stock):');
      const reason = options.reason ?? await askText('Reason for adjustment:');

      const row = await adjustStock(stockAdjustSchema.parse({ institution, batch, qty, reason }));
      printTransaction(row);
    });
}

async function askSignedNumber(message) {
  if (!isInteractive()) {
    return undefined;
  }
  const value = await askText(message, {
    placeholder: 'e.g. 50 or -20',
    validate: (input) => {
      if (!/^-?\d+$/.test(input.trim())) {
        return `${message.replace(/[:\s]+$/, '')} must be a whole number.`;
      }
      if (Number(input) === 0) {
        return 'Quantity must not be zero.';
      }
      return undefined;
    }
  });
  return Number(value);
}