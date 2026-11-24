-- =============================================================
-- Migrasi 002 — pengaturan per-user: tipe dompet milik pengguna
--
-- Sebelumnya wallet_types hanya global (PK `code`) dan wallets.type
-- memakai varchar yang merujuk ke wallet_types(code). Agar pengguna
-- login bisa mengelola tipe dompet miliknya sendiri:
--   1. wallet_types mendapat kolom surrogat `id UUID` (+unique index);
--   2. kolom `user_id UUID NULL` (NULL = global, dikelola admin);
--   3. wallets.type dikonversi varchar → UUID (FK ke wallet_types.id);
--   4. PK wallet_types dipindah dari `code` ke `id`.
--
-- IDEMPOTEN: aman dijalankan berulang di Supabase SQL Editor.
-- Urutan penting: FK wallets_type_fkey bergantung pada PK lama,
-- jadi konversi wallets dikerjakan SEBELUM drop PK lama.
-- =============================================================

-- 1) Surrogate id pada wallet_types (+ unique index untuk FK)
ALTER TABLE wallet_types ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS wallet_types_id_uidx ON wallet_types (id);

-- 2) user_id: NULL = global milik admin, terisi = milik pengguna tertentu
ALTER TABLE wallet_types ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE;

-- 3) unique (user_id, code) — NULL dibungkus agar efektif unik per scope
DROP INDEX IF EXISTS wallet_types_user_code_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS wallet_types_user_code_uidx
    ON wallet_types (COALESCE(user_id::text, 'GLOBAL'), code);

-- 4) wallets.type: VARCHAR (kode) → UUID (FK ke wallet_types.id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wallets' AND column_name = 'type' AND data_type = 'character varying'
    ) THEN
        -- kolom bantu, isi dari kode lama (global lebih dulu, lalu milik pemilik dompet)
        ALTER TABLE wallets ADD COLUMN IF NOT EXISTS type_id UUID NULL REFERENCES wallet_types(id) ON DELETE RESTRICT;
        UPDATE wallets w SET type_id = wt.id
            FROM wallet_types wt
            WHERE wt.code = w.type AND wt.user_id IS NULL AND w.type_id IS NULL;
        UPDATE wallets w SET type_id = wt.id
            FROM wallet_types wt
            WHERE wt.code = w.type AND wt.user_id = w.user_id AND w.type_id IS NULL;

        ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_type_fkey;
        ALTER TABLE wallets DROP COLUMN type;
        ALTER TABLE wallets RENAME COLUMN type_id TO type;
        ALTER TABLE wallets ALTER COLUMN type SET NOT NULL;
    ELSE
        -- skema baru sudah UUID: bersihkan sisa kolom bantu (bila ada)
        ALTER TABLE wallets DROP COLUMN IF EXISTS type_id;
    END IF;
END $$;

-- 5) PK wallet_types dipindah dari `code` ke `id` (FK lama sudah tidak ada)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'wallet_types'::regclass
          AND c.contype = 'p'
          AND a.attname = 'code'
    ) THEN
        ALTER TABLE wallet_types DROP CONSTRAINT wallet_types_pkey;
        ALTER TABLE wallet_types ADD CONSTRAINT wallet_types_pkey PRIMARY KEY (id);
        -- wallet_types_id_uidx dipertahankan: masih dipakai FK wallets.
    END IF;
END $$;

-- Trigger updated_at tetap berlaku untuk kedua tabel.
