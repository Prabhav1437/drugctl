#!/usr/bin/env node

import { Command } from 'commander';
import { closePool } from '../src/db/pool.js';
import { handleCliError } from '../src/lib/errors.js';
import { registerInstitutionCommands } from '../src/commands/institution.js';
import { registerDrugCommands } from '../src/commands/drug.js';
import { registerBatchCommands } from '../src/commands/batch.js';
import { registerStockCommands } from '../src/commands/stock.js';
import { registerExpiryCommands } from '../src/commands/expiry.js';
import { registerReportCommands } from '../src/commands/report.js';

const program = new Command();
const add = new Command('add').description('Add institution, drug, or batch records');
const list = new Command('list').description('List inventory records and reports');
const flag = new Command('flag').description('Flag records for review');
const check = new Command('check').description('Run inventory checks');

program
  .name('drugctl')
  .description('Track drug inventory and supply chain activity across health institutions.')
  .version('0.1.0');

program.addCommand(add);
program.addCommand(list);
program.addCommand(flag);
program.addCommand(check);

registerInstitutionCommands({ add, list });
registerDrugCommands({ add, list });
registerBatchCommands({ add, list, flag });
registerStockCommands(program, { list });
registerExpiryCommands(program, { check });
registerReportCommands(program, { list });

try {
  await program.parseAsync(process.argv);
} catch (error) {
  handleCliError(error);
} finally {
  await closePool();
}
