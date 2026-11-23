-- =============================================================
-- Migrasi 001: fitur admin (role, blokir akun, tipe dompet dinamis)
-- Jalankan di database yang SUDAH aktif (mis. Supabase):
--   via Supabase Dashboard → SQL Editor → tempel seluruh isi file ini → Run
-- Skema baru tidak perlu file ini (sudah ada di schema.sql).
-- =============================================================

BEGIN;

-- 1. users: role + status blokir
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason TEXT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
    END IF;
END $$;

-- User demo (dari seed) langsung diangkat jadi admin.
UPDATE users SET role = 'admin' WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Tipe dompet dinamis
CREATE TABLE IF NOT EXISTS wallet_types (
    code       VARCHAR(20)  PRIMARY KEY,
    label      VARCHAR(50)  NOT NULL,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO wallet_types (code, label) VALUES
    ('CASH', 'Tunai'),
    ('BANK', 'Bank'),
    ('EWALLET', 'E-Wallet'),
    ('CREDIT_CARD', 'Kartu Kredit')
ON CONFLICT (code) DO NOTHING;

-- 3. wallets.type: ganti CHECK statis dengan FK ke wallet_types
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_type_check;
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_type_fk;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_type_fk') THEN
        ALTER TABLE wallets
            ADD CONSTRAINT wallets_type_fk FOREIGN KEY (type) REFERENCES wallet_types(code);
    END IF;
END $$;

-- 4. Trigger updated_at untuk wallet_types
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wallet_types_updated ON wallet_types;
CREATE TRIGGER trg_wallet_types_updated BEFORE UPDATE ON wallet_types
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
