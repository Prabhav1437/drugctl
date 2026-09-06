# drugctl

`drugctl` is a Node.js CLI for tracking drug inventory across government health institutions, from state warehouses down to district warehouses, hospitals, CHCs, and PHCs.

This is Iteration 1. It covers master data, batch tracking, stock receive/issue/adjustment, current balances, expiry checks, and low-stock reports.

## Prerequisites

- Node.js current LTS or newer
- npm
- PostgreSQL, either installed locally or through Docker Compose

## Setup

Install dependencies:

```bash
npm install
```

By default, the CLI connects to:

```bash
DATABASE_URL=postgres://drugctl:drugctl@localhost:5432/drugctl
```

If you already have a local PostgreSQL database named `drugctl`, check the connection and run migrations:

```bash
npm run db:check
npm run migrate
```

Copy `.env.example` to `.env` if you want to override `DATABASE_URL` or keep the setting explicit:

```bash
cp .env.example .env
```

If you do not have PostgreSQL installed locally, use Docker Compose:

```bash
npm run db:up
npm run migrate
```

Link the package once during local development so commands run as `drugctl`:

```bash
npm link
drugctl --help
```

If you do not want to link it, use `npm run dev --` before any command. For example, `npm run dev -- list drugs` runs the same code as `drugctl list drugs`.

## Database

Run migrations:

```bash
npm run migrate
```

The schema uses UUID primary keys, plain SQL migrations, and a signed stock ledger. Current balance is derived from `SUM(qty)` in `stock_transactions`.

Negative stock is blocked in two places:

- Application logic checks balance inside a database transaction for `stock issue` and `stock adjust`.
- A PostgreSQL trigger rejects any direct insert that would make an institution and batch balance negative.

## Command Reference

All examples below use the linked CLI name, `drugctl`.

### System

```bash
drugctl --help
drugctl add --help
drugctl list --help
drugctl check --help
drugctl flag --help
```

`drugctl --help` shows the top-level command tree. The grouped help commands show available subcommands for adding, listing, checking, and flagging records.

### Add Records

```bash
drugctl add institution --name "State Warehouse Delhi" --type STATE_WH --location "Delhi"
drugctl add institution --name "PHC Rohini 12" --type PHC --parent <parent_id>
drugctl add drug --name "Paracetamol 500mg" --form tablet --unit strip --storage NORMAL
drugctl add drug --name "Insulin" --form injection --unit vial --storage COLD_CHAIN
drugctl add batch --drug <drug_id> --batch-no B22 --expiry 2027-03-01 --vendor "XYZ Pharma"
drugctl add batch --drug <drug_id> --batch-no B23 --mfg 2026-01-01 --expiry 2027-04-01
```

`drugctl add institution` creates master records for state warehouses, district warehouses, hospitals, CHCs, and PHCs. `drugctl add drug` creates drug master records. `drugctl add batch` creates a batch under an existing drug.

### List Records

```bash
drugctl list institutions
drugctl list institutions --type PHC
drugctl list drugs
drugctl list batches --drug <drug_id>
drugctl list balances --institution <institution_id>
drugctl list balances --institution <institution_id> --drug <drug_id>
drugctl list low-stock --institution <institution_id> --threshold 100
```

List commands print tables. `drugctl list balances` shows positive on-hand stock per batch. `drugctl list low-stock` shows drugs whose total on-hand quantity at an institution is below the threshold.

Singular aliases also work for the master-data lists:

```bash
drugctl list institution
drugctl list drug
drugctl list batch --drug <drug_id>
drugctl list balance --institution <institution_id>
```

### Stock Movement

```bash
drugctl receive --institution <institution_id> --batch <batch_id> --qty 500 --note "opening receipt"
drugctl issue --institution <institution_id> --batch <batch_id> --qty 50 --note "issued to OPD"
drugctl adjust --institution <institution_id> --batch <batch_id> --qty -20 --reason "damaged in storage"
drugctl balance --institution <institution_id>
drugctl balance --institution <institution_id> --drug <drug_id>
```

`drugctl receive` records stock coming in. `drugctl issue` records stock going out. `drugctl adjust` records signed corrections, such as damaged stock. `drugctl issue` and negative `drugctl adjust` commands fail if the resulting balance would be below zero. The error includes the current balance.

### Checks

```bash
drugctl check expiry --within 90
drugctl check expiry --within 90 --institution <institution_id>
drugctl expiry --within 90
drugctl expiry --within 90 --institution <institution_id>
```

The expiry check lists batches expiring within the requested number of days that still have positive stock somewhere.

### Flag Records

```bash
drugctl flag batch <batch_id> --reason "vendor quality complaint"
```

Flagging marks a batch for review and stores a reason, such as a quality complaint.

## Testing

Start PostgreSQL and run the integration tests:

```bash
npm run db:up
npm test
```

To run tests against another database:

```bash
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/drugctl_test npm test
```

Tests run the migrations and truncate Iteration 1 data tables between test cases.

## Known Limitations

- No authentication or RBAC. The MVP assumes a single trusted local user.
- No vendor master, purchase orders, shipments, rate contracts, or procurement workflow. `batches.vendor_name` is free text for now.
- No inter-institution transfer command yet, although the transaction type is reserved in the schema.
- No dashboard or hierarchy roll-up reporting yet.
- No offline sync or multi-instance replication. This version expects one PostgreSQL database.
- No ORM is used; database access is raw SQL via `pg`.
