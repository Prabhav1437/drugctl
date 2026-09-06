CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'institution_type') THEN
    CREATE TYPE institution_type AS ENUM ('STATE_WH', 'DIST_WH', 'HOSPITAL', 'CHC', 'PHC');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_condition') THEN
    CREATE TYPE storage_condition AS ENUM ('NORMAL', 'COLD_CHAIN');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'txn_type') THEN
    CREATE TYPE txn_type AS ENUM ('RECEIPT', 'ISSUE', 'TRANSFER', 'RETURN', 'WASTAGE', 'ADJUSTMENT');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type institution_type NOT NULL,
  parent_id UUID REFERENCES institutions(id),
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  form TEXT,
  unit TEXT NOT NULL,
  storage_condition storage_condition NOT NULL DEFAULT 'NORMAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_id UUID NOT NULL REFERENCES drugs(id),
  batch_no TEXT NOT NULL,
  mfg_date DATE,
  expiry_date DATE NOT NULL,
  vendor_name TEXT,
  flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (mfg_date IS NULL OR mfg_date <= expiry_date),
  UNIQUE (drug_id, batch_no)
);

CREATE TABLE IF NOT EXISTS stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  batch_id UUID NOT NULL REFERENCES batches(id),
  type txn_type NOT NULL,
  qty INTEGER NOT NULL CHECK (qty <> 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_txn_inst_batch ON stock_transactions (institution_id, batch_id);

CREATE OR REPLACE FUNCTION ensure_stock_balance_not_negative()
RETURNS TRIGGER AS $$
DECLARE
  current_balance INTEGER;
  next_balance INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.institution_id::text), hashtext(NEW.batch_id::text));

  SELECT COALESCE(SUM(qty), 0)
  INTO current_balance
  FROM stock_transactions
  WHERE institution_id = NEW.institution_id
    AND batch_id = NEW.batch_id;

  next_balance := current_balance + NEW.qty;

  IF next_balance < 0 THEN
    RAISE EXCEPTION 'stock balance cannot go negative for institution %, batch %. Current balance: %, attempted change: %',
      NEW.institution_id, NEW.batch_id, current_balance, NEW.qty
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_balance_non_negative ON stock_transactions;
CREATE TRIGGER trg_stock_balance_non_negative
BEFORE INSERT ON stock_transactions
FOR EACH ROW
EXECUTE FUNCTION ensure_stock_balance_not_negative();

CREATE OR REPLACE FUNCTION reject_stock_transaction_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'stock_transactions is append-only; insert a correcting ADJUSTMENT instead'
    USING ERRCODE = '25006';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_transactions_append_only_update ON stock_transactions;
CREATE TRIGGER trg_stock_transactions_append_only_update
BEFORE UPDATE ON stock_transactions
FOR EACH ROW
EXECUTE FUNCTION reject_stock_transaction_mutation();

DROP TRIGGER IF EXISTS trg_stock_transactions_append_only_delete ON stock_transactions;
CREATE TRIGGER trg_stock_transactions_append_only_delete
BEFORE DELETE ON stock_transactions
FOR EACH ROW
EXECUTE FUNCTION reject_stock_transaction_mutation();
