import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

/** Hash password format `salt:hash` (scrypt, tanpa dependensi eksternal). */
export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
	return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [salt, hash] = stored.split(':');
	if (!salt || !hash) return false;
	const candidate = scryptSync(password, salt, KEY_LENGTH);
	const expected = Buffer.from(hash, 'hex');
	return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function validateEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function validatePassword(password: string): boolean {
	// Minimal 8 karakter, mengandung huruf dan angka.
	return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}
