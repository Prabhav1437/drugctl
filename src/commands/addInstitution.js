import { createInstitution } from '../models/institution.js';
import { printRecord } from '../lib/format.js';
import { institutionAddSchema } from '../lib/validate.js';
import {
  askOptionalText,
  askText,
  pickOptionalInstitution,
  pickType
} from '../lib/interact.js';

export function registerAddInstitution(add) {
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
}