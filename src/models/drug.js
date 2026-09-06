import { getPool } from '../db/pool.js';

export async function createDrug({ name, genericName, form, unit, storage }) {
  const result = await getPool().query(
    `
      INSERT INTO drugs (name, generic_name, form, unit, storage_condition)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, generic_name, form, unit, storage_condition, created_at
    `,
    [name, genericName ?? null, form ?? null, unit, storage]
  );

  return result.rows[0];
}

export async function listDrugs() {
  const result = await getPool().query(
    `
      SELECT id, name, generic_name, form, unit, storage_condition, created_at
      FROM drugs
      ORDER BY name
    `
  );

  return result.rows;
}
