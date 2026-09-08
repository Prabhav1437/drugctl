import { createInstitution, listInstitutions } from '../models/institution.js';
import { printRecord, printTable } from '../lib/format.js';
import { institutionAddSchema, institutionListSchema } from '../lib/validate.js';
import {
  askOptionalText,
  askText,
  pickListType,
  pickOptionalInstitution,
  pickType
} from '../lib/interact.js';

export function registerInstitutionCommands({ add, list }) {
  add
    .command('institution')
    .description('Add an institution')
    .option('--name <name>', 'institution name')
    .option('--type <type>', 'STATE_WH, DIST_WH, HOSPITAL, CHC, or PHC')
    .option('--parent <parent>', 'parent institution id')
    .option('--location <location>', 'free-text location')
    .action(async (options) => {
      const name = options.name ?? await askText('Institution name:');
      const type = options.type ?? await pickType('Institution type:');
      const parent = options.parent ?? await pickOptionalInstitution('Parent institution:', {
        noneLabel: 'No parent'
      });
      const location = options.location ?? await askOptionalText('Location (optional):');

      const row = await createInstitution(institutionAddSchema.parse({ name, type, parent, location }));
      printRecord({
        id: row.id,
        name: row.name,
        type: row.type,
        parent_id: row.parent_id,
        location: row.location
      });
    });

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