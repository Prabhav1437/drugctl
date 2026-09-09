#!/usr/bin/env node

import { Command } from 'commander';
import { closePool } from '../src/db/pool.js';
import { handleCliError } from '../src/lib/errors.js';
import { registerAddInstitution } from '../src/commands/addInstitution.js';
import { registerAddDrug } from '../src/commands/addDrug.js';
import { registerAddBatch } from '../src/commands/addBatch.js';
import { registerListInstitutions } from '../src/commands/listInstitutions.js';
import { registerListDrugs } from '../src/commands/listDrugs.js';
import { registerListBatches } from '../src/commands/listBatches.js';
import { registerReceive } from '../src/commands/receive.js';
import { registerIssue } from '../src/commands/issue.js';
import { registerAdjust } from '../src/commands/adjust.js';
import { registerBalance } from '../src/commands/balance.js';
import { registerExpiry } from '../src/commands/expiry.js';
import { registerLowStock } from '../src/commands/lowStock.js';
import { registerFlagBatch } from '../src/commands/flagBatch.js';

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

registerAddInstitution(add);
registerAddDrug(add);
registerAddBatch(add);
registerListInstitutions(list);
registerListDrugs(list);
registerListBatches(list);
registerReceive(program);
registerIssue(program);
registerAdjust(program);
registerBalance(program, list);
registerExpiry(program, check);
registerLowStock(program, list);
registerFlagBatch(flag);

try {
  await program.parseAsync(process.argv);
} catch (error) {
  handleCliError(error);
} finally {
  await closePool();
}