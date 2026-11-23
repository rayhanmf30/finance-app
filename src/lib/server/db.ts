import postgres from 'postgres';
import { DATABASE_URL } from '$app/env/private';

const connectionString =
	DATABASE_URL ?? 'postgres://financeapp:financeapp@localhost:5432/finance_app';

export const db = postgres(connectionString, { prepare: false });
