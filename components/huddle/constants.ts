// Huddle upload configuration
export const HUDDLE_UPLOAD_BUCKET = 'huddle-uploads';

// File upload constraints
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'text/plain', 'text/csv', 'text/markdown',
    // Archives
    'application/zip', 'application/x-zip-compressed',
];
