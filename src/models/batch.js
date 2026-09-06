import { getPool } from '../db/pool.js';

export async function createBatch({ drug, batchNo, mfg, expiry, vendor }) {
  const result = await getPool().query(
    `
      INSERT INTO batches (drug_id, batch_no, mfg_date, expiry_date, vendor_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, drug_id, batch_no, mfg_date, expiry_date, vendor_name, flagged, flag_reason, created_at
    `,
    [drug, batchNo, mfg ?? null, expiry, vendor ?? null]
  );

  return result.rows[0];
}

export async function listBatches({ drug } = {}) {
  const params = [];
  const where = drug ? 'WHERE b.drug_id = $1' : '';
  if (drug) {
    params.push(drug);
  }

  const result = await getPool().query(
    `
      SELECT b.id, d.name AS drug_name, b.batch_no, b.mfg_date, b.expiry_date,
             b.vendor_name, b.flagged, b.flag_reason
      FROM batches b
      JOIN drugs d ON d.id = b.drug_id
      ${where}
      ORDER BY b.expiry_date, b.batch_no
    `,
    params
  );

  return result.rows;
}

export async function flagBatch({ batchId, reason }) {
  const result = await getPool().query(
    `
      UPDATE batches
      SET flagged = true,
          flag_reason = $2
      WHERE id = $1
      RETURNING id, batch_no, flagged, flag_reason
    `,
    [batchId, reason]
  );

  return result.rows[0] ?? null;
}
