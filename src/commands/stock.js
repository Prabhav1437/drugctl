import {
  adjustStock,
  issueStock,
  listBalances,
  receiveStock
} from '../models/stockTransaction.js';
import { printRecord, printTable } from '../lib/format.js';
import { handleCliError } from '../lib/errors.js';
import {
  stockAdjustSchema,
  stockBalanceSchema,
  stockIssueSchema,
  stockReceiveSchema
} from '../lib/validate.js';
import {
  askNumber,
  askOptionalText,
  askText,
  isInteractive,
  pickBatch,
  pickInstitution,
  pickOptionalDrug
} from '../lib/interact.js';

export function registerStockCommands(program, { list }) {
  program
    .command('receive')
    .description('Receive stock into an institution')
    .option('--institution <institution>', 'institution id')
    .option('--batch <batch>', 'batch id')
    .option('--qty <qty>', 'quantity')
    .option('--note <note>', 'note')
    .action(withErrorHandling(async (options) => {
      const institution = options.institution ?? await pickInstitution('Which institution received the stock?');
      const batch = options.batch ?? await pickBatch('Which drug / batch was received?', { institution });
      const qty = options.qty ?? await askNumber('How many units were received?', { min: 1 });
      const note = options.note ?? await askOptionalText('Note (optional):');

      const row = await receiveStock(stockReceiveSchema.parse({ institution, batch, qty, note }));
      printTransaction(row);
    }));

  program
    .command('issue')
    .description('Issue stock out of an institution')
    .option('--institution <institution>', 'institution id')
    .option('--batch <batch>', 'batch id')
    .option('--qty <qty>', 'quantity')
    .option('--note <note>', 'note')
    .action(withErrorHandling(async (options) => {
      const institution = options.institution ?? await pickInstitution('Which institution issued the stock?');
      const batch = options.batch ?? await pickBatch('Which drug / batch was issued?', { institution });
      const qty = options.qty ?? await askNumber('How many units were issued?', { min: 1 });
      const note = options.note ?? await askOptionalText('Note (optional):');

      const row = await issueStock(stockIssueSchema.parse({ institution, batch, qty, note }));
      printTransaction(row);
    }));

  program
    .command('adjust')
    .description('Adjust stock by a signed quantity')
    .option('--institution <institution>', 'institution id')
    .option('--batch <batch>', 'batch id')
    .option('--qty <qty>', 'signed non-zero quantity')
    .option('--reason <reason>', 'adjustment reason')
    .action(withErrorHandling(async (options) => {
      const institution = options.institution ?? await pickInstitution('Which institution does the adjustment apply to?');
      const batch = options.batch ?? await pickBatch('Which drug / batch was adjusted?', { institution });
      const qty = options.qty ?? await askSignedNumber('Adjustment quantity (use - for damaged/lost stock):');
      const reason = options.reason ?? await askText('Reason for adjustment:');

      const row = await adjustStock(stockAdjustSchema.parse({ institution, batch, qty, reason }));
      printTransaction(row);
    }));

  registerBalanceCommand(program.command('balance'), 'Show current stock at an institution');
  registerBalanceCommand(list.command('balances').alias('balance'), 'Show current stock at an institution');
}

function registerBalanceCommand(command, description) {
  command
    .description(description)
    .option('--institution <institution>', 'institution id')
    .option('--drug <drug>', 'optional drug id')
    .action(withErrorHandling(async (options) => {
      const institution = options.institution ?? await pickInstitution('Which institution?');
      const drug = options.drug ?? await pickOptionalDrug('Filter by a specific drug?', {
        noneLabel: 'All drugs'
      });

      const rows = await listBalances(stockBalanceSchema.parse({ institution, drug: drug ?? undefined }));
      printTable(
        ['Drug', 'Unit', 'Batch', 'Expiry', 'Qty'],
        rows.map((row) => [row.drug_name, row.unit, row.batch_no, row.expiry_date, row.qty])
      );
    }));
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

function printTransaction(row) {
  printRecord({
    id: row.id,
    institution_id: row.institution_id,
    batch_id: row.batch_id,
    type: row.type,
    qty: row.qty,
    note: row.note
  });
}

function withErrorHandling(fn) {
  return (...args) => fn(...args).catch(handleCliError);
}