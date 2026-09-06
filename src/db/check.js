import { getPool, closePool } from './pool.js';

async function checkDatabase() {
  const result = await getPool().query(`
    SELECT current_database() AS database,
           current_user AS user,
           version() AS version
  `);
  const row = result.rows[0];

  console.log(`Connected to database "${row.database}" as "${row.user}".`);
  console.log(row.version);
}

checkDatabase()
  .then(async () => {
    await closePool();
  })
  .catch(async (error) => {
    console.error(error.message);
    await closePool();
    process.exit(1);
  });
