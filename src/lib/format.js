import Table from 'cli-table3';

export function printTable(head, rows) {
  const table = new Table({ head });
  for (const row of rows) {
    table.push(row.map(formatCell));
  }
  console.log(table.toString());
}

export function printRecord(record) {
  const rows = Object.entries(record).map(([key, value]) => [key, formatCell(value)]);
  printTable(['Field', 'Value'], rows);
}

export function printTransaction(row) {
  printRecord({
    id: row.id,
    institution_id: row.institution_id,
    batch_id: row.batch_id,
    type: row.type,
    qty: row.qty,
    note: row.note
  });
}

function formatCell(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return formatDate(value);
  }

  return String(value);
}

// pg parses a DATE column into a Date at local midnight, so going through UTC
// would shift the day backwards for any positive UTC offset.
export function formatDate(date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
