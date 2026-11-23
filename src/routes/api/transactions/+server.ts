import { error, json } from '@sveltejs/kit';
import { createTransaction, listTransactions } from '#lib/server/transactions';
import { requireUserId } from '#lib/server/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const userId = requireUserId(locals);
	const month = url.searchParams.get('month') ?? '';
	const query = url.searchParams.get('query') ?? '';

	if (!/^\d{4}-\d{2}$/.test(month)) {
		throw error(400, 'Parameter month wajib berformat YYYY-MM.');
	}

	const transactions = await listTransactions(userId, month, query);
	return json(transactions);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const userId = requireUserId(locals);
	const body = await request.json();
	const transaction = await createTransaction(userId, body);
	return json(transaction, { status: 201 });
};
