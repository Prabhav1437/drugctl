import { after, before, beforeEach } from 'node:test';
import { randomUUID } from 'node:crypto';

export let createInstitution;
export let createDrug;
export let createBatch;
export let receiveStock;
export let issueStock;
export let adjustStock;
export let listBalances;
export let listExpiringStock;
export let getPool;

let closePool;

export function registerDatabaseHooks() {
  before(async () => {
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL ||
      process.env.DATABASE_URL ||
      'postgres://drugctl:drugctl@localhost:5432/drugctl';

    ({ getPool, closePool } = await import('../src/db/pool.js'));
    const migrate = await import('../src/db/migrate.js');
    const institutionModel = await import('../src/models/institution.js');
    const drugModel = await import('../src/models/drug.js');
    const batchModel = await import('../src/models/batch.js');
    const stockModel = await import('../src/models/stockTransaction.js');

    createInstitution = institutionModel.createInstitution;
    createDrug = drugModel.createDrug;
    createBatch = batchModel.createBatch;
    receiveStock = stockModel.receiveStock;
    issueStock = stockModel.issueStock;
    adjustStock = stockModel.adjustStock;
    listBalances = stockModel.listBalances;
    listExpiringStock = stockModel.listExpiringStock;

    await migrate.runMigrations();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  after(async () => {
    await closePool?.();
  });
}

export async function resetDatabase() {
  await getPool().query('TRUNCATE stock_transactions, batches, drugs, institutions RESTART IDENTITY CASCADE');
}

export async function seedStock({ expiryDays = 120, qty = 0 } = {}) {
  const institution = await createInstitution({
    name: `PHC ${randomUUID()}`,
    type: 'PHC'
  });
  const drug = await createDrug({
    name: `Paracetamol ${randomUUID()}`,
    form: 'tablet',
    unit: 'strip',
    storage: 'NORMAL'
  });
  const batch = await createBatch({
    drug: drug.id,
    batchNo: `B-${randomUUID()}`,
    expiry: dateAfterDays(expiryDays)
  });

  if (qty > 0) {
    await receiveStock({
      institution: institution.id,
      batch: batch.id,
      qty,
      note: 'test seed'
    });
  }

  return { institution, drug, batch };
}

export function dateAfterDays(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
