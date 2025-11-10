/**
 * Sanitize error messages to provide user-friendly messages
 * without exposing technical details like project URLs, stack traces, etc.
 */

export function sanitizeAuthError(error: any): string {
    if (!error) return 'An unexpected error occurred. Please try again.';
    
    const message = error.message || error.error_description || String(error);
    const lowerMessage = message.toLowerCase();
    
    // Password-related errors
    if (lowerMessage.includes('password') && lowerMessage.includes('weak')) {
        return 'Please choose a stronger password with at least 8 characters, including uppercase, lowercase, and numbers.';
    }
    
    if (lowerMessage.includes('password') && (lowerMessage.includes('short') || lowerMessage.includes('length'))) {
        return 'Password must be at least 8 characters long.';
    }
    
    if (lowerMessage.includes('invalid login credentials') || lowerMessage.includes('invalid password')) {
        return 'Invalid email or password. Please try again.';
    }
    
    // Email-related errors
    if (lowerMessage.includes('email') && lowerMessage.includes('already') && lowerMessage.includes('registered')) {
        return 'This email is already registered. Please sign in instead.';
    }
    
    if (lowerMessage.includes('email') && lowerMessage.includes('invalid')) {
        return 'Please enter a valid email address.';
    }
    
    if (lowerMessage.includes('email not confirmed')) {
        return 'Please confirm your email address before signing in.';
    }
    
    // Auth session errors
    if (lowerMessage.includes('session') && (lowerMessage.includes('expired') || lowerMessage.includes('invalid'))) {
        return 'Your session has expired. Please sign in again.';
    }
    
    if (lowerMessage.includes('not authenticated') || lowerMessage.includes('unauthorized')) {
        return 'Please sign in to continue.';
    }
    
    // Rate limiting
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
        return 'Too many attempts. Please wait a moment and try again.';
    }
    
    // Network errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch failed') || lowerMessage.includes('failed to fetch')) {
        return 'Network error. Please check your connection and try again.';
    }
    
    // Token/invitation errors
    if (lowerMessage.includes('token') && (lowerMessage.includes('invalid') || lowerMessage.includes('expired'))) {
        return 'This link has expired or is invalid. Please request a new one.';
    }
    
    // Generic fallbacks - strip out URLs and technical details
    let sanitized = message;
    
    // Remove URLs (http, https, project URLs)
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/gi, '[link removed]');
    
    // Remove project-specific identifiers
    sanitized = sanitized.replace(/[a-z]{20,}/gi, '[ID]');
    
    // Remove stack traces
    sanitized = sanitized.split('\n')[0];
    
    // If message is too technical or still contains URLs, use generic message
    if (sanitized.includes('supabase.co') || sanitized.includes('[link removed]') || sanitized.length > 200) {
        // Try to extract just the first sentence
        const firstSentence = sanitized.split('.')[0];
        if (firstSentence.length > 10 && firstSentence.length < 100) {
            return firstSentence + '.';
        }
        return 'An error occurred. Please try again or contact support if the problem persists.';
    }
    
    return sanitized;
}

/**
 * Sanitize general errors (non-auth)
 */
export function sanitizeError(error: any): string {
    if (!error) return 'An unexpected error occurred.';
    
    const message = error.message || String(error);
    const lowerMessage = message.toLowerCase();
    
    // Database errors
    if (lowerMessage.includes('duplicate key') || lowerMessage.includes('unique constraint')) {
        return 'This item already exists. Please use a different name or value.';
    }
    
    if (lowerMessage.includes('foreign key') || lowerMessage.includes('violates')) {
        return 'Cannot complete this action due to related data. Please try a different approach.';
    }
    
    if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
        return 'The requested item was not found. It may have been deleted.';
    }
    
    // Permission errors
    if (lowerMessage.includes('permission denied') || lowerMessage.includes('not authorized')) {
        return 'You do not have permission to perform this action.';
    }
    
    // Network errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch failed')) {
        return 'Network error. Please check your connection and try again.';
    }
    
    // Use auth sanitizer if it looks like an auth error
    if (lowerMessage.includes('auth') || lowerMessage.includes('login') || lowerMessage.includes('password')) {
        return sanitizeAuthError(error);
    }
    
    // Generic sanitization
    let sanitized = message;
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/gi, '[link]');
    sanitized = sanitized.replace(/[a-z]{20,}/gi, '[ID]');
    sanitized = sanitized.split('\n')[0];
    
    if (sanitized.includes('[link]') || sanitized.length > 200) {
        return 'An error occurred. Please try again.';
    }
    
    return sanitized;
}
