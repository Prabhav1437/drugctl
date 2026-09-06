import { listExpiringStock } from '../models/stockTransaction.js';
import { printTable } from '../lib/format.js';
import { handleCliError } from '../lib/errors.js';
import { expiryCheckSchema } from '../lib/validate.js';

export function registerExpiryCommands(program, { check }) {
  registerExpiryCommand(program.command('expiry'), 'List positive stock expiring within N days');
  registerExpiryCommand(check.command('expiry'), 'Check for positive stock expiring within N days');
}

function registerExpiryCommand(command, description) {
  command
    .description(description)
    .option('--within <within>', 'number of days')
    .option('--institution <institution>', 'optional institution id')
    .action(withErrorHandling(async (options) => {
      const input = expiryCheckSchema.parse(options);
      const rows = await listExpiringStock(input);
      printTable(
        ['Institution', 'Drug', 'Unit', 'Batch', 'Expiry', 'Days', 'Qty'],
        rows.map((row) => [
          row.institution_name,
          row.drug_name,
          row.unit,
          row.batch_no,
          row.expiry_date,
          row.days_to_expiry,
          row.qty
        ])
      );
    }));
}

function withErrorHandling(fn) {
  return (...args) => fn(...args).catch(handleCliError);
}
