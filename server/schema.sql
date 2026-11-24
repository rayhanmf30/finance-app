-- =============================================================
-- FinanceApp — Skema Database (PostgreSQL 14+)
-- Sesuai ERD: users, wallets, wallet_types, categories, transactions,
-- transaction_items, budgets, budget_categories, budget_alerts, recurring_transactions
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------------
-- users
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(150)  NOT NULL,
    email            VARCHAR(150)  NOT NULL UNIQUE,
    password_hash    VARCHAR(255),
    role             VARCHAR(20)   NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_blocked       BOOLEAN       NOT NULL DEFAULT FALSE,
    block_reason     TEXT,
    default_currency VARCHAR(3)    NOT NULL DEFAULT 'IDR',
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- wallet_types (tipe dompet: global dikelola admin + milik per-user)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallet_types (
    id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID         NULL REFERENCES users(id) ON DELETE CASCADE,
    code      VARCHAR(20)  NOT NULL,
    label     VARCHAR(50)  NOT NULL,
    is_active BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP   NOT NULL DEFAULT NOW()
);
-- user_id NULL = global (dikelola admin); unik per scope (global / per-user)
CREATE UNIQUE INDEX IF NOT EXISTS wallet_types_user_code_uidx
    ON wallet_types (COALESCE(user_id::text, 'GLOBAL'), code);

INSERT INTO wallet_types (code, label) VALUES
    ('CASH', 'Tunai'),
    ('BANK', 'Bank'),
    ('EWALLET', 'E-Wallet'),
    ('CREDIT_CARD', 'Kartu Kredit')
ON CONFLICT (code) DO NOTHING;

-- -------------------------------------------------------------
-- wallets (sumber dana: tunai, bank, e-wallet, kartu kredit)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                 VARCHAR(100) NOT NULL,
    type                 UUID         NOT NULL REFERENCES wallet_types(id) ON DELETE RESTRICT,
    currency             VARCHAR(3)   NOT NULL DEFAULT 'IDR',
    current_balance      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    is_included_in_total BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets (user_id);

-- -------------------------------------------------------------
-- categories (mendukung sub-kategori via parent_id)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id  UUID         NULL REFERENCES categories(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    type       VARCHAR(10)  NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    icon       VARCHAR(50),
    color      VARCHAR(7),
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON categories (user_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories (parent_id);

-- -------------------------------------------------------------
-- transactions (buku besar arus kas; TRANSFER tidak dihitung
-- sebagai pemasukan/pengeluaran)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id             UUID        NOT NULL REFERENCES wallets(id),
    destination_wallet_id UUID        NULL REFERENCES wallets(id),
    category_id           UUID        NULL REFERENCES categories(id),
    type                  VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER')),
    amount                DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    transaction_date      TIMESTAMP   NOT NULL,
    note                  TEXT,
    receipt_url           VARCHAR(255),
    created_at            TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP   NOT NULL DEFAULT NOW(),

    -- destination_wallet_id wajib hanya untuk TRANSFER
    CHECK ((type = 'TRANSFER') = (destination_wallet_id IS NOT NULL)),
    -- category_id wajib kosong untuk TRANSFER
    CHECK (type <> 'TRANSFER' OR category_id IS NULL),
    -- transfer ke dompet sendiri tidak valid
    CHECK (destination_wallet_id IS NULL OR destination_wallet_id <> wallet_id)
);

-- Composite index untuk agregasi cashflow & cek limit (hitungan milidetik)
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date
    ON transactions (user_id, type, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category_date
    ON transactions (user_id, category_id, transaction_date);
-- Index untuk rekonstruksi saldo per dompet
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_date
    ON transactions (wallet_id, transaction_date);

-- -------------------------------------------------------------
-- transaction_items (pecahan item hasil scan resi)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID         NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    name           VARCHAR(150) NOT NULL,
    quantity       DECIMAL(10,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price     DECIMAL(15,2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    discount       DECIMAL(15,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    category_id    UUID         NULL REFERENCES categories(id),
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction
    ON transaction_items (transaction_id);

-- -------------------------------------------------------------
-- budgets (batas pengeluaran untuk sekumpulan kategori atau global)
-- Budget tanpa baris di budget_categories = budget GLOBAL (semua pengeluaran).
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_type           VARCHAR(10) NOT NULL CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
    limit_amount          DECIMAL(15,2) NOT NULL CHECK (limit_amount > 0),
    warning_threshold_pct INT         NOT NULL DEFAULT 80 CHECK (warning_threshold_pct BETWEEN 1 AND 100),
    is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- budget_categories (banyak kategori per budget, N:M)
CREATE TABLE IF NOT EXISTS budget_categories (
    budget_id    UUID NOT NULL REFERENCES budgets(id)    ON DELETE CASCADE,
    category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,

    PRIMARY KEY (budget_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_active ON budgets (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_budget_categories_category ON budget_categories (category_id);

-- -------------------------------------------------------------
-- budget_alerts (log peringatan + anti-spam per periode)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budget_alerts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    budget_id     UUID        NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    period_key    VARCHAR(20) NOT NULL,
    alert_level   VARCHAR(20) NOT NULL CHECK (alert_level IN ('WARNING_THRESHOLD', 'EXCEEDED_LIMIT')),
    spent_amount  DECIMAL(15,2) NOT NULL,
    limit_amount  DECIMAL(15,2) NOT NULL,
    message       TEXT        NOT NULL,
    is_read       BOOLEAN     NOT NULL DEFAULT FALSE,
    triggered_at  TIMESTAMP   NOT NULL DEFAULT NOW(),

    -- Anti-spam: satu alert per level per budget per periode
    UNIQUE (budget_id, period_key, alert_level)
);

CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_unread
    ON budget_alerts (user_id, is_read, triggered_at DESC);

-- -------------------------------------------------------------
-- recurring_transactions (tagihan/pemasukan rutin)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recurring_transactions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id     UUID        NOT NULL REFERENCES wallets(id),
    category_id   UUID        NOT NULL REFERENCES categories(id),
    type          VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    amount        DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    frequency     VARCHAR(10) NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
    next_run_date DATE        NOT NULL,
    end_date      DATE,
    last_run_date DATE,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_user_active
    ON recurring_transactions (user_id, is_active, next_run_date);

-- -------------------------------------------------------------
-- Trigger updated_at otomatis
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_wallet_types_updated ON wallet_types;
CREATE TRIGGER trg_wallet_types_updated BEFORE UPDATE ON wallet_types
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_wallets_updated ON wallets;
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated ON categories;
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated ON transactions;
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_budgets_updated ON budgets;
CREATE TRIGGER trg_budgets_updated BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_recurring_updated ON recurring_transactions;
CREATE TRIGGER trg_recurring_updated BEFORE UPDATE ON recurring_transactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
