import { error, json } from '@sveltejs/kit';
import { demoUserId } from '#lib/server/auth';
import { createTransaction, listTransactions } from '#lib/server/transactions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const month = url.searchParams.get('month') ?? '';
	const query = url.searchParams.get('query') ?? '';

	if (!/^\d{4}-\d{2}$/.test(month)) {
		throw error(400, 'Parameter month wajib berformat YYYY-MM.');
	}

	const transactions = await listTransactions(demoUserId, month, query);
	return json(transactions);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const transaction = await createTransaction(demoUserId, body);
	return json(transaction, { status: 201 });
};
