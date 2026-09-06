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

export function registerStockCommands(program, { list }) {
  program
    .command('receive')
    .description('Receive stock into an institution')
    .option('--institution <institution>', 'institution id')
    .option('--batch <batch>', 'batch id')
    .option('--qty <qty>', 'positive quantity')
    .option('--note <note>', 'transaction note')
    .action(withErrorHandling(async (options) => {
      const input = stockReceiveSchema.parse(options);
      const row = await receiveStock(input);
      printTransaction(row);
    }));

  program
    .command('issue')
    .description('Issue stock out of an institution')
    .option('--institution <institution>', 'institution id')
    .option('--batch <batch>', 'batch id')
    .option('--qty <qty>', 'positive quantity')
    .option('--note <note>', 'transaction note')
    .action(withErrorHandling(async (options) => {
      const input = stockIssueSchema.parse(options);
      const row = await issueStock(input);
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
      const input = stockAdjustSchema.parse(options);
      const row = await adjustStock(input);
      printTransaction(row);
    }));

  registerBalanceCommand(program.command('balance'), 'Show current stock at an institution');
  registerBalanceCommand(list.command('balances').alias('balance'), 'List current stock at an institution');
}

function registerBalanceCommand(command, description) {
  command
    .description(description)
    .option('--institution <institution>', 'institution id')
    .option('--drug <drug>', 'optional drug id')
    .action(withErrorHandling(async (options) => {
      const input = stockBalanceSchema.parse(options);
      const rows = await listBalances(input);
      printTable(
        ['Drug', 'Unit', 'Batch', 'Expiry', 'Qty'],
        rows.map((row) => [row.drug_name, row.unit, row.batch_no, row.expiry_date, row.qty])
      );
    }));
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
