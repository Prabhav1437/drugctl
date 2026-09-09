import { listExpiringStock } from '../models/stockTransaction.js';
import { printTable } from '../lib/format.js';
import { expiryCheckSchema } from '../lib/validate.js';
import { askNumber, pickOptionalInstitution } from '../lib/interact.js';

export function registerExpiry(program, check) {
  registerExpiryCommand(program.command('expiry'));
  registerExpiryCommand(check.command('expiry'));
}

function registerExpiryCommand(command) {
  command
    .description('List stock expiring within N days')
    .option('--within <within>', 'number of days')
    .option('--institution <institution>', 'optional institution id')
    .action(async (options) => {
      const within = options.within ?? await askNumber('Show stock expiring within how many days?', {
        initial: 90,
        min: 1
      });
      const institution = options.institution ?? await pickOptionalInstitution('Which institution?');

      const input = expiryCheckSchema.parse({ within, institution: institution ?? undefined });
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
    });
}