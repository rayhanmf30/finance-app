export class HttpError extends Error {
	constructor(
		readonly status: number,
		readonly body: string
	) {
		super(`HTTP ${status}: ${body}`);
		this.name = 'HttpError';
	}
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...init,
		headers: { 'Content-Type': 'application/json', ...init?.headers }
	});

	if (!response.ok) {
		throw new HttpError(response.status, await response.text());
	}

	return (await response.json()) as T;
}

export const httpClient = {
	get: <T>(url: string) => request<T>(url),
	post: <T>(url: string, body: unknown) =>
		request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
	put: <T>(url: string, body: unknown) =>
		request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
	delete: <T>(url: string) => request<T>(url, { method: 'DELETE' })
};
