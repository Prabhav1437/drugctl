import { listLowStock } from '../models/stockTransaction.js';
import { printTable } from '../lib/format.js';
import { handleCliError } from '../lib/errors.js';
import { lowStockSchema } from '../lib/validate.js';
import { askNumber, pickInstitution } from '../lib/interact.js';

export function registerReportCommands(program, { list }) {
  registerLowStockCommand(
    program.command('low-stock'),
    'List drugs below a stock threshold at an institution'
  );
  registerLowStockCommand(
    list.command('low-stock'),
    'List drugs below a stock threshold at an institution'
  );
}

function registerLowStockCommand(command, description) {
  command
    .description(description)
    .option('--institution <institution>', 'institution id')
    .option('--threshold <threshold>', 'quantity threshold')
    .action(withErrorHandling(async (options) => {
      const institution = options.institution ?? await pickInstitution('Which institution?');
      const threshold = options.threshold ?? await askNumber('Show drugs below what quantity?', {
        initial: 100,
        min: 0
      });

      const input = lowStockSchema.parse({ institution, threshold });
      const rows = await listLowStock(input);
      printTable(
        ['Drug', 'Unit', 'Qty'],
        rows.map((row) => [row.drug_name, row.unit, row.qty])
      );
    }));
}

function withErrorHandling(fn) {
  return (...args) => fn(...args).catch(handleCliError);
}