/**
 * Content Studio Storage Service
 * Handles image uploads to Supabase Storage instead of base64 embedding
 * This prevents hitting the 5MB JSON limit for documents
 */

import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

const BUCKET_NAME = 'content-studio-assets';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 7; // 7 days

export interface UploadResult {
  success: boolean;
  url?: string;
  publicUrl?: string;
  path?: string;
  error?: string;
}

export interface ImageMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  path: string;
  url: string;
  createdAt: string;
}

/**
 * Validate image file before upload
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed: ${ALLOWED_TYPES.map(t => t.split('/')[1]).join(', ')}` 
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
    };
  }

  return { valid: true };
}

/**
 * Get image dimensions from a file
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Compress image if needed (for large images)
 */
export async function compressImage(
  file: File, 
  maxWidth = 2000, 
  maxHeight = 2000, 
  quality = 0.85
): Promise<Blob> {
  // Skip compression for SVGs and small files
  if (file.type === 'image/svg+xml' || file.size < 500 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let { width, height } = img;
      
      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      } else {
        // No resize needed, return original
        resolve(file);
        return;
      }
      
      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to blob
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        mimeType,
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };
    
    img.src = url;
  });
}

/**
 * Upload image to Supabase Storage
 */
export async function uploadImage(
  file: File,
  workspaceId: string,
  documentId?: string,
  compress = true
): Promise<UploadResult> {
  try {
    // Validate
    const validation = validateImage(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Compress if needed
    let uploadBlob: Blob = file;
    if (compress && file.type !== 'image/svg+xml') {
      try {
        uploadBlob = await compressImage(file);
      } catch (e) {
        console.warn('[Storage] Compression failed, using original:', e);
      }
    }

    // Generate unique path
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${uuidv4()}.${ext}`;
    const path = documentId 
      ? `${workspaceId}/${documentId}/${fileName}`
      : `${workspaceId}/shared/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, uploadBlob, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('[Storage] Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return {
      success: true,
      path: data.path,
      url: urlData.publicUrl,
      publicUrl: urlData.publicUrl,
    };
  } catch (error: any) {
    console.error('[Storage] Upload failed:', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
}

/**
 * Get a signed URL for private assets
 */
export async function getSignedUrl(path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, SIGNED_URL_EXPIRY);

    if (error) {
      console.error('[Storage] Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('[Storage] Signed URL failed:', error);
    return null;
  }
}

/**
 * Delete an asset from storage
 */
export async function deleteAsset(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('[Storage] Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Storage] Delete failed:', error);
    return false;
  }
}

/**
 * Delete all assets for a document
 */
export async function deleteDocumentAssets(workspaceId: string, documentId: string): Promise<boolean> {
  try {
    const path = `${workspaceId}/${documentId}`;
    
    // List all files in the document folder
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(path);

    if (listError) {
      console.error('[Storage] List error:', listError);
      return false;
    }

    if (!files || files.length === 0) {
      return true; // No files to delete
    }

    // Delete all files
    const filePaths = files.map(f => `${path}/${f.name}`);
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths);

    if (deleteError) {
      console.error('[Storage] Delete error:', deleteError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Storage] Delete document assets failed:', error);
    return false;
  }
}

/**
 * Convert a base64 image to a storage URL
 * Used for migrating existing base64 images to storage
 */
export async function migrateBase64ToStorage(
  base64Data: string,
  workspaceId: string,
  documentId: string,
  fileName = 'migrated-image'
): Promise<UploadResult> {
  try {
    // Extract mime type and data
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return { success: false, error: 'Invalid base64 format' };
    }

    const mimeType = match[1];
    const base64 = match[2];
    
    // Convert to blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const blob = new Blob([byteNumbers], { type: mimeType });
    const ext = mimeType.split('/')[1] || 'jpg';
    const file = new File([blob], `${fileName}.${ext}`, { type: mimeType });
    
    return uploadImage(file, workspaceId, documentId, false);
  } catch (error: any) {
    console.error('[Storage] Migration failed:', error);
    return { success: false, error: error.message || 'Migration failed' };
  }
}
