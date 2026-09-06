import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  createBatch,
  listExpiringStock,
  receiveStock,
  registerDatabaseHooks,
  seedStock
} from './helpers.js';

registerDatabaseHooks();

test('expiry check lists only positive stock expiring within the requested window', async () => {
  const soon = await seedStock({ expiryDays: 20, qty: 100 });
  const later = await seedStock({ expiryDays: 120, qty: 100 });
  const noStock = await seedStock({ expiryDays: 15, qty: 0 });

  const rows = await listExpiringStock({ within: 90 });
  const batchNos = rows.map((row) => row.batch_no);

  assert.deepEqual(batchNos, [soon.batch.batch_no]);
  assert.equal(batchNos.includes(later.batch.batch_no), false);
  assert.equal(batchNos.includes(noStock.batch.batch_no), false);
  assert.equal(rows[0].qty, 100);
});

test('expiry check can be filtered by institution', async () => {
  const included = await seedStock({ expiryDays: 30, qty: 50 });
  const other = await seedStock({ expiryDays: 30, qty: 50 });

  const secondBatchAtIncludedInstitution = await createBatch({
    drug: included.drug.id,
    batchNo: `B-${randomUUID()}`,
    expiry: included.batch.expiry_date
  });
  await receiveStock({
    institution: included.institution.id,
    batch: secondBatchAtIncludedInstitution.id,
    qty: 25,
    note: 'same institution'
  });

  const rows = await listExpiringStock({
    within: 90,
    institution: included.institution.id
  });

  assert.equal(rows.length, 2);
  assert.equal(rows.every((row) => row.institution_name === included.institution.name), true);
  assert.equal(rows.some((row) => row.batch_no === other.batch.batch_no), false);
});
