import { json } from '@sveltejs/kit';
import { createTransaction, deleteTransaction } from '#lib/server/transactions';
import { requireUserId } from '#lib/server/session';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const userId = requireUserId(locals);
	await deleteTransaction(userId, params.id);
	return new Response(null, { status: 204 });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const userId = requireUserId(locals);
	const body = await request.json();
	await deleteTransaction(userId, params.id);
	const transaction = await createTransaction(userId, body);
	return json(transaction);
};
