# drugctl

`drugctl` is a Node.js CLI for tracking drug inventory across government health institutions, from state warehouses down to district warehouses, hospitals, CHCs, and PHCs.

It is Iteration 1. It covers master data, batch tracking, stock receive/issue/adjustment, current balances, expiry checks, and low-stock reports.

## Prerequisites

- Node.js current LTS or newer
- npm
- PostgreSQL, either installed locally or through Docker Compose

## Setup

Install dependencies and link the CLI so it runs as `drugctl`:

```bash
npm install
npm link
```

By default, the CLI connects to:

```bash
DATABASE_URL=postgres://drugctl:drugctl@localhost:5432/drugctl
```

Check the connection and run migrations:

```bash
npm run db:check
npm run migrate
```

Copy `.env.example` to `.env` if you want to override `DATABASE_URL` or keep the setting explicit:

```bash
cp .env.example .env
```

If you do not have PostgreSQL installed locally, use Docker Compose instead:

```bash
npm run db:up
npm run migrate
```

If you do not want to link the package, use `npm run dev --` before any command. For example, `npm run dev -- list drugs` runs the same code as `drugctl list drugs`.

## Quick start (guided mode)

Every command can be used as a simple walkthrough. Type the command, press Enter, and answer the questions as they come. No IDs or flags needed — you pick institutions, drugs, and batches from menus:

```bash
drugctl receive
```

```
◆  Which institution received the stock?
│  ● State Warehouse Delhi — State Warehouse (Delhi)
│  ○ PHC Rohini — Primary Health Centre (PHC) (Rohini)
└

◆  Which drug / batch was received?
│  ● ORS Powder | ORS1 | expires 2026-09-15 | stock 200 sachet
│  ○ Paracetamol 500mg | B22  | expires 2030-03-01 | stock 500 strip
└

◆  How many units were received?
│  25

◆  Note (optional):
│  opening receipt
```

The same style works for `add`, `issue`, `adjust`, `balance`, `expiry`, `low-stock`, and `flag`:

```bash
drugctl add institution      # answers: name, type, parent, location
drugctl add drug             # answers: name, generic name, form, unit, storage
drugctl add batch            # answers: drug, batch number, dates, vendor
drugctl issue                # answers: institution, drug/batch, quantity, note
drugctl adjust               # answers: institution, drug/batch, quantity, reason
drugctl balance              # answers: institution, optional drug
drugctl expiry --within 90   # answers: days (default 90), optional institution
drugctl low-stock            # answers: institution, threshold (default 100)
drugctl flag batch           # answers: batch, reason
```

Use the arrow keys to move through a menu and Enter to select. Press Ctrl+C at any time to cancel.

## Flags for automation

Every command also accepts flags, which is useful for scripting and bulk tasks. When a value is provided as a flag, it is used instead of asking. For example:

```bash
drugctl add institution --name "PHC Rohini" --type PHC --location "Rohini"
drugctl add drug --name "Paracetamol 500mg" --form tablet --unit strip
drugctl add batch --drug <drug_id> --batch-no B22 --expiry 2030-03-01
drugctl receive --institution <id> --batch <id> --qty 500 --note "opening"
drugctl issue --institution <id> --batch <id> --qty 50 --note "issued to OPD"
drugctl adjust --institution <id> --batch <id> --qty -20 --reason "damaged"
drugctl balance --institution <id> --drug <id>
drugctl expiry --within 90 --institution <id>
drugctl low-stock --institution <id> --threshold 100
drugctl flag batch <batch_id> --reason "quality complaint"
```

## Database

Run migrations:

```bash
npm run migrate
```

The schema uses UUID primary keys, plain SQL migrations, and a signed stock ledger. Current balance is derived from `SUM(qty)` in `stock_transactions`.

Negative stock is blocked in two places:

- Application logic checks balance inside a database transaction for `issue` and negative `adjust` commands.
- A PostgreSQL trigger rejects any direct insert that would make an institution and batch balance negative.

## Command Reference

All commands are run as `drugctl`. Every command works in guided mode (just run it and answer the prompts) or with flags.

### System

```bash
drugctl --help
drugctl add --help
drugctl list --help
drugctl check --help
drugctl flag --help
```

`drugctl --help` shows the top-level command tree, grouped into add/list/check/flag plus the direct stock commands.

### master data

```bash
drugctl add institution     # guided: name, type, parent, location
drugctl add drug            # guided: name, generic name, form, unit, storage
drugctl add batch           # guided: drug, batch number, mfg, expiry, vendor
drugctl list institutions
drugctl list drugs
drugctl list batches
```

`drugctl list institutions` can be filtered by type (`--type PHC`), `drugctl list batches` can be filtered by drug (`--drug <id>`). Singular aliases also work for the master-data lists: `drugctl list institution`, `drugctl list drug`, `drugctl list batch`.

### Stock movement

```bash
drugctl receive    # guided: institution, drug/batch, quantity, note
drugctl issue      # guided: institution, drug/batch, quantity, note
drugctl adjust     # guided: institution, drug/batch, quantity, reason
drugctl balance    # guided: institution, optional drug filter
```

- `receive` records stock coming in.
- `issue` records stock going out.
- `adjust` records signed corrections, such as damaged stock.
- `issue` and negative `adjust` fail if the resulting balance would be below zero, and the error includes the current balance.
- `balance` prints the current on-hand stock per batch, optionally for one drug.

### Checks

```bash
drugctl expiry
drugctl expiry --within 90
drugctl check expiry
drugctl expiry --institution <id>
```

The guided prompts default to stock expiring within 90 days. The expiry report lists batches expiring within the requested window that still have positive stock, optionally for one institution.

### Reports

```bash
drugctl low-stock
drugctl low-stock --threshold 100
```

Lists drugs whose total on-hand quantity at an institution is below the threshold (guided default 100).

### Flag records

```bash
drugctl flag batch
drugctl flag batch <batch_id> --reason "quality complaint"
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