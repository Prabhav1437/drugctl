import { listBalances } from '../models/stockTransaction.js';
import { printTable } from '../lib/format.js';
import { stockBalanceSchema } from '../lib/validate.js';
import { pickInstitution, pickOptionalDrug } from '../lib/interact.js';

export function registerBalance(program, list) {
  registerBalanceCommand(program.command('balance'));
  registerBalanceCommand(list.command('balances').alias('balance'));
}

function registerBalanceCommand(command) {
  command
    .description('Show current stock at an institution')
    .option('--institution <institution>', 'institution id')
    .option('--drug <drug>', 'optional drug id')
    .action(async (options) => {
      const institution = options.institution ?? await pickInstitution('Which institution?');
      const drug = options.drug ?? await pickOptionalDrug('Filter by a specific drug?', {
        noneLabel: 'All drugs'
      });

      const rows = await listBalances(stockBalanceSchema.parse({ institution, drug: drug ?? undefined }));
      printTable(
        ['Drug', 'Unit', 'Batch', 'Expiry', 'Qty'],
        rows.map((row) => [row.drug_name, row.unit, row.batch_no, row.expiry_date, row.qty])
      );
    });
}