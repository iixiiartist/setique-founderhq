/**
 * Email normalization utility
 * Centralizes email formatting to ensure consistency across authentication flows
 */

/**
 * Normalizes an email address by trimming whitespace and converting to lowercase
 * This prevents case-sensitivity issues and accidental whitespace in email addresses
 * 
 * @param email - The email address to normalize
 * @returns The normalized email address
 * 
 * @example
 * normalizeEmail('  User@Example.com  ') // returns 'user@example.com'
 */
export const normalizeEmail = (email: string): string => {
    return email.trim().toLowerCase();
};
