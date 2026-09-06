import { createInstitution, listInstitutions } from '../models/institution.js';
import { printRecord, printTable } from '../lib/format.js';
import { handleCliError } from '../lib/errors.js';
import { institutionAddSchema, institutionListSchema } from '../lib/validate.js';

export function registerInstitutionCommands({ add, list }) {
  add
    .command('institution')
    .description('Add an institution')
    .option('--name <name>', 'institution name')
    .option('--type <type>', 'STATE_WH, DIST_WH, HOSPITAL, CHC, or PHC')
    .option('--parent <parent>', 'parent institution id')
    .option('--location <location>', 'free-text location')
    .action(withErrorHandling(async (options) => {
      const input = institutionAddSchema.parse(options);
      const row = await createInstitution(input);
      printRecord({
        id: row.id,
        name: row.name,
        type: row.type,
        parent_id: row.parent_id,
        location: row.location
      });
    }));

  list
    .command('institutions')
    .alias('institution')
    .description('List institutions')
    .option('--type <type>', 'filter by institution type')
    .action(withErrorHandling(async (options) => {
      const input = institutionListSchema.parse(options);
      const rows = await listInstitutions(input);
      printTable(
        ['ID', 'Name', 'Type', 'Parent', 'Location'],
        rows.map((row) => [row.id, row.name, row.type, row.parent_name, row.location])
      );
    }));
}

function withErrorHandling(fn) {
  return (...args) => fn(...args).catch(handleCliError);
}
