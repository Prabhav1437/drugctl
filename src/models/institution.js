import { getPool } from '../db/pool.js';

export async function createInstitution({ name, type, parent, location }) {
  const result = await getPool().query(
    `
      INSERT INTO institutions (name, type, parent_id, location)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, type, parent_id, location, created_at
    `,
    [name, type, parent ?? null, location ?? null]
  );

  return result.rows[0];
}

export async function listInstitutions({ type } = {}) {
  const params = [];
  let where = '';

  if (type) {
    params.push(type);
    where = 'WHERE i.type = $1';
  }

  const result = await getPool().query(
    `
      SELECT i.id, i.name, i.type, p.name AS parent_name, i.location, i.created_at
      FROM institutions i
      LEFT JOIN institutions p ON p.id = i.parent_id
      ${where}
      ORDER BY i.type, i.name
    `,
    params
  );

  return result.rows;
}
