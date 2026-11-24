-- =============================================================
-- Migrasi 001: budget multi-kategori
-- Menambahkan tabel relasi N:M budget_categories dan memindahkan
-- data kolom tunggal budgets.category_id ke tabel relasi.
-- IDEMPOTEN — aman dijalankan berulang.
-- Jalankan di Supabase: Dashboard -> SQL Editor -> paste -> Run.
-- =============================================================

CREATE TABLE IF NOT EXISTS budget_categories (
    budget_id   UUID NOT NULL REFERENCES budgets(id)    ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (budget_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_budget_categories_category
    ON budget_categories (category_id);

-- Pindahkan relasi lama (kolom tunggal) bila masih ada
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'budgets' AND column_name = 'category_id'
    ) THEN
        INSERT INTO budget_categories (budget_id, category_id)
        SELECT id, category_id FROM budgets
        WHERE category_id IS NOT NULL
        ON CONFLICT (budget_id, category_id) DO NOTHING;

        ALTER TABLE budgets DROP COLUMN category_id;
    END IF;
END $$;
