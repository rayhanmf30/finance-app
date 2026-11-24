-- Perbaikan constraint: TRANSFER tidak boleh punya kategori, tetapi
-- INCOME/EXPENSE boleh tanpa kategori (constraint lama keliru mewajibkannya).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_no_category_on_transfer'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_check1;
    ALTER TABLE transactions ADD CONSTRAINT transactions_no_category_on_transfer
        CHECK (type <> 'TRANSFER' OR category_id IS NULL);
  END IF;
END
$$;
