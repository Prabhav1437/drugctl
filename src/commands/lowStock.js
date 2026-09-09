import { listLowStock } from '../models/stockTransaction.js';
import { printTable } from '../lib/format.js';
import { lowStockSchema } from '../lib/validate.js';
import { askNumber, pickInstitution } from '../lib/interact.js';

export function registerLowStock(program, list) {
  registerLowStockCommand(program.command('low-stock'));
  registerLowStockCommand(list.command('low-stock'));
}

function registerLowStockCommand(command) {
  command
    .description('List drugs below a stock threshold at an institution')
    .option('--institution <institution>', 'institution id')
    .option('--threshold <threshold>', 'quantity threshold')
    .action(async (options) => {
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
    });
}