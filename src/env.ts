import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: {
		schema: (value) => value
	},
	DEMO_USER_ID: {
		schema: (value) => value
	}
});
