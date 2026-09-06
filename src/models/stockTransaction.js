import { getPool } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

export async function receiveStock({ institution, batch, qty, note }) {
  const result = await getPool().query(
    `
      INSERT INTO stock_transactions (institution_id, batch_id, type, qty, note)
      VALUES ($1, $2, 'RECEIPT', $3, $4)
      RETURNING id, institution_id, batch_id, type, qty, note, created_at
    `,
    [institution, batch, qty, note ?? null]
  );

  return result.rows[0];
}

export async function issueStock({ institution, batch, qty, note }) {
  return mutateStockWithBalanceCheck({
    institution,
    batch,
    qtyDelta: -qty,
    type: 'ISSUE',
    note: note ?? null,
    insufficientMessage: (current) =>
      `Insufficient stock. Current balance is ${current}; attempted issue is ${qty}.`
  });
}

export async function adjustStock({ institution, batch, qty, reason }) {
  return mutateStockWithBalanceCheck({
    institution,
    batch,
    qtyDelta: qty,
    type: 'ADJUSTMENT',
    note: reason,
    insufficientMessage: (current) =>
      `Adjustment would make stock negative. Current balance is ${current}; attempted adjustment is ${qty}.`
  });
}

export async function getBalance(client, institution, batch) {
  const result = await client.query(
    `
      SELECT COALESCE(SUM(qty), 0)::integer AS balance
      FROM stock_transactions
      WHERE institution_id = $1
        AND batch_id = $2
    `,
    [institution, batch]
  );

  return result.rows[0].balance;
}

export async function listBalances({ institution, drug }) {
  const params = [institution];
  const drugFilter = drug ? 'AND d.id = $2' : '';
  if (drug) {
    params.push(drug);
  }

  const result = await getPool().query(
    `
      SELECT d.name AS drug_name,
             d.unit,
             b.batch_no,
             b.expiry_date,
             COALESCE(SUM(st.qty), 0)::integer AS qty
      FROM stock_transactions st
      JOIN batches b ON b.id = st.batch_id
      JOIN drugs d ON d.id = b.drug_id
      WHERE st.institution_id = $1
        ${drugFilter}
      GROUP BY b.id, d.name, d.unit, b.batch_no, b.expiry_date
      HAVING COALESCE(SUM(st.qty), 0) > 0
      ORDER BY d.name, b.expiry_date, b.batch_no
    `,
    params
  );

  return result.rows;
}

export async function listExpiringStock({ within, institution }) {
  const params = [within];
  const institutionFilter = institution ? 'AND i.id = $2' : '';
  if (institution) {
    params.push(institution);
  }

  const result = await getPool().query(
    `
      SELECT i.name AS institution_name,
             d.name AS drug_name,
             d.unit,
             b.batch_no,
             b.expiry_date,
             (b.expiry_date - CURRENT_DATE)::integer AS days_to_expiry,
             COALESCE(SUM(st.qty), 0)::integer AS qty
      FROM stock_transactions st
      JOIN institutions i ON i.id = st.institution_id
      JOIN batches b ON b.id = st.batch_id
      JOIN drugs d ON d.id = b.drug_id
      WHERE b.expiry_date >= CURRENT_DATE
        AND b.expiry_date <= CURRENT_DATE + ($1::integer * INTERVAL '1 day')
        ${institutionFilter}
      GROUP BY i.id, i.name, b.id, d.name, d.unit, b.batch_no, b.expiry_date
      HAVING COALESCE(SUM(st.qty), 0) > 0
      ORDER BY b.expiry_date, i.name, d.name, b.batch_no
    `,
    params
  );

  return result.rows;
}

export async function listLowStock({ institution, threshold }) {
  const result = await getPool().query(
    `
      SELECT d.name AS drug_name,
             d.unit,
             COALESCE(SUM(st.qty), 0)::integer AS qty
      FROM stock_transactions st
      JOIN batches b ON b.id = st.batch_id
      JOIN drugs d ON d.id = b.drug_id
      WHERE st.institution_id = $1
      GROUP BY d.id, d.name, d.unit
      HAVING COALESCE(SUM(st.qty), 0) >= 0
         AND COALESCE(SUM(st.qty), 0) < $2
      ORDER BY qty, d.name
    `,
    [institution, threshold]
  );

  return result.rows;
}

async function mutateStockWithBalanceCheck({
  institution,
  batch,
  qtyDelta,
  type,
  note,
  insufficientMessage
}) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await lockStockKey(client, institution, batch);

    const current = await getBalance(client, institution, batch);
    if (current + qtyDelta < 0) {
      throw new AppError(insufficientMessage(current));
    }

    const result = await client.query(
      `
        INSERT INTO stock_transactions (institution_id, batch_id, type, qty, note)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, institution_id, batch_id, type, qty, note, created_at
      `,
      [institution, batch, type, qtyDelta, note]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function lockStockKey(client, institution, batch) {
  await client.query(
    'SELECT pg_advisory_xact_lock(hashtext($1::text), hashtext($2::text))',
    [institution, batch]
  );
}
