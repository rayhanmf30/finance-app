import { json } from '@sveltejs/kit';
import { demoUserId } from '#lib/server/auth';
import { createTransaction, deleteTransaction } from '#lib/server/transactions';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
	await deleteTransaction(demoUserId, params.id);
	return new Response(null, { status: 204 });
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	await deleteTransaction(demoUserId, params.id);
	const transaction = await createTransaction(demoUserId, body);
	return json(transaction);
};
