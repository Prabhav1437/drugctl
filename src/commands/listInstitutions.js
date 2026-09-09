import { listInstitutions } from '../models/institution.js';
import { printTable } from '../lib/format.js';
import { institutionListSchema } from '../lib/validate.js';
import { pickListType } from '../lib/interact.js';

export function registerListInstitutions(list) {
  list
    .command('institutions')
    .alias('institution')
    .description('List institutions')
    .option('--type <type>', 'filter by institution type')
    .action(async (options) => {
      const typeSelection = options.type ?? await pickListType('Filter by institution type:');
      const type = typeSelection === 'all' ? undefined : typeSelection;
      const rows = await listInstitutions(institutionListSchema.parse({ type }));
      printTable(
        ['ID', 'Name', 'Type', 'Parent', 'Location'],
        rows.map((row) => [row.id, row.name, row.type, row.parent_name, row.location])
      );
    });
}