import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DB_HOST: {
		schema: (value) => value
	},
	DB_PORT: {
		schema: (value) => (value ? Number(value) : undefined)
	},
	DB_USER: {
		schema: (value) => value
	},
	DB_PASSWORD: {
		schema: (value) => value
	},
	DB_NAME: {
		schema: (value) => value
	},
	DB_SSL: {
		schema: (value) => value
	},
	DEMO_USER_ID: {
		schema: (value) => value
	},
	ADMIN_EMAILS: {
		schema: (value) => value
	},
	AUTH_SECRET: {
		schema: (value) => value
	},
	/** API key Groq untuk ekstraksi struk (opsional — tanpa ini pakai mock). */
	GROQ_API_KEY: {
		schema: (value) => value
	},
	/** Model vision Groq, default meta-llama/llama-4-scout-17b-16e-instruct. */
	GROQ_MODEL: {
		schema: (value) => value
	}
});
