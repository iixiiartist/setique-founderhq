import { supabase } from '../supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_WIDTH = 1920; // Max width for compression

export interface ImageUploadResult {
  url: string;
  path: string;
  size: number;
}

export interface ImageValidationError {
  error: string;
  details?: string;
}

/**
 * Validates an image file for upload
 * @param file - File to validate
 * @returns true if valid, error object if invalid
 */
export function validateImageFile(file: File): true | ImageValidationError {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      error: 'File too large',
      details: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
    };
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      error: 'Invalid file type',
      details: `Allowed types: ${ALLOWED_TYPES.join(', ')}. Your file is ${file.type}.`,
    };
  }

  return true;
}

/**
 * Compresses an image file to reduce size
 * @param file - Original image file
 * @param maxWidth - Maximum width in pixels
 * @returns Compressed file
 */
export async function compressImage(file: File, maxWidth: number = MAX_WIDTH): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Only compress if image is larger than maxWidth
        if (img.width <= maxWidth) {
          resolve(file);
          return;
        }

        // Calculate new dimensions
        const ratio = maxWidth / img.width;
        const newWidth = maxWidth;
        const newHeight = img.height * ratio;

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not compress image'));
              return;
            }

            // Create new file with original name
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          file.type,
          0.85 // Quality (0.85 = 85%)
        );
      };

      img.onerror = () => reject(new Error('Could not load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a thumbnail for an image
 * @param file - Original image file
 * @param maxSize - Maximum width/height in pixels
 * @returns Thumbnail file
 */
export async function generateThumbnail(file: File, maxSize: number = 300): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate dimensions to fit within maxSize square
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        // Create canvas and draw thumbnail
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not create thumbnail'));
              return;
            }

            // Create thumbnail file
            const thumbnailFile = new File(
              [blob],
              `thumb_${file.name}`,
              {
                type: file.type,
                lastModified: Date.now(),
              }
            );

            resolve(thumbnailFile);
          },
          file.type,
          0.8
        );
      };

      img.onerror = () => reject(new Error('Could not load image for thumbnail'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Could not read file for thumbnail'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image to Supabase Storage
 * @param file - Image file to upload
 * @param workspaceId - Workspace ID for organization
 * @param docId - Optional document ID for organization
 * @returns Upload result with public URL
 */
export async function uploadToSupabase(
  file: File,
  workspaceId: string,
  docId?: string
): Promise<ImageUploadResult> {
  // Validate file
  const validation = validateImageFile(file);
  if (validation !== true) {
    throw new Error(validation.error + (validation.details ? ': ' + validation.details : ''));
  }

  // Compress image
  const compressedFile = await compressImage(file);

  // Generate unique filename
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

  // Build storage path
  const path = docId
    ? `${workspaceId}/${docId}/${filename}`
    : `${workspaceId}/${filename}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('workspace-images')
    .upload(path, compressedFile, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('workspace-images')
    .getPublicUrl(path);

  return {
    url: urlData.publicUrl,
    path: path,
    size: compressedFile.size,
  };
}

/**
 * Deletes an image from Supabase Storage
 * @param path - Storage path of the image
 */
export async function deleteFromSupabase(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from('workspace-images')
    .remove([path]);

  if (error) {
    console.error('Delete error:', error);
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Gets image metadata from Supabase Storage
 * @param path - Storage path of the image
 */
export async function getImageMetadata(path: string) {
  const { data, error } = await supabase.storage
    .from('workspace-images')
    .list(path);

  if (error) {
    console.error('Metadata error:', error);
    throw new Error(`Could not get metadata: ${error.message}`);
  }

  return data;
}
