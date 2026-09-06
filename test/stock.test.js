import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adjustStock,
  getPool,
  issueStock,
  listBalances,
  receiveStock,
  registerDatabaseHooks,
  seedStock
} from './helpers.js';

registerDatabaseHooks();

test('receive and issue maintain the current batch balance', async () => {
  const { institution, batch } = await seedStock();

  await receiveStock({
    institution: institution.id,
    batch: batch.id,
    qty: 500,
    note: 'opening receipt'
  });
  await issueStock({
    institution: institution.id,
    batch: batch.id,
    qty: 125,
    note: 'dispensed'
  });

  const balances = await listBalances({ institution: institution.id });

  assert.equal(balances.length, 1);
  assert.equal(balances[0].qty, 375);
});

test('issue rejects transactions that would make stock negative', async () => {
  const { institution, batch } = await seedStock({ qty: 30 });

  await assert.rejects(
    issueStock({
      institution: institution.id,
      batch: batch.id,
      qty: 31,
      note: 'too much'
    }),
    /Current balance is 30/
  );

  const balances = await listBalances({ institution: institution.id });
  assert.equal(balances[0].qty, 30);
});

test('adjustment applies signed deltas and rejects negative resulting balances', async () => {
  const { institution, batch } = await seedStock({ qty: 50 });

  await adjustStock({
    institution: institution.id,
    batch: batch.id,
    qty: -20,
    reason: 'damaged'
  });

  await assert.rejects(
    adjustStock({
      institution: institution.id,
      batch: batch.id,
      qty: -31,
      reason: 'impossible correction'
    }),
    /Current balance is 30/
  );

  const balances = await listBalances({ institution: institution.id });
  assert.equal(balances[0].qty, 30);
});

test('database trigger blocks direct inserts that would make stock negative', async () => {
  const { institution, batch } = await seedStock({ qty: 10 });

  await assert.rejects(
    getPool().query(
      `
        INSERT INTO stock_transactions (institution_id, batch_id, type, qty, note)
        VALUES ($1, $2, 'ISSUE', $3, $4)
      `,
      [institution.id, batch.id, -11, 'direct write']
    ),
    /stock balance cannot go negative/
  );

  const balances = await listBalances({ institution: institution.id });
  assert.equal(balances[0].qty, 10);
});
