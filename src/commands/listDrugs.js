import { listDrugs } from '../models/drug.js';
import { printTable } from '../lib/format.js';

export function registerListDrugs(list) {
  list
    .command('drugs')
    .alias('drug')
    .description('List drugs')
    .action(async () => {
      const rows = await listDrugs();
      printTable(
        ['ID', 'Name', 'Generic', 'Form', 'Unit', 'Storage'],
        rows.map((row) => [
          row.id,
          row.name,
          row.generic_name,
          row.form,
          row.unit,
          row.storage_condition
        ])
      );
    });
}