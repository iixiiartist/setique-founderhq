import { supabase } from '../supabase';
import { telemetry } from './telemetry';

const DEFAULT_BUCKET = 'workspace-images';
const BLOCK_ASSET_BUCKET = 'doc-block-assets';
const MAX_UPLOAD_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 400;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface UploadRequest {
  bucket?: string;
  path: string;
  file: Blob | File;
  cacheControl?: string;
  upsert?: boolean;
  contentType?: string;
  metadata?: Record<string, unknown>;
  makePublic?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: { loaded: number; total?: number }) => void;
}

export interface UploadResult {
  bucket: string;
  path: string;
  size: number;
  mimeType?: string;
  publicUrl?: string;
}

export interface UploadSignatureAssetRequest {
  workspaceId: string;
  docId?: string;
  blob: Blob;
  signal?: AbortSignal;
  onProgress?: UploadRequest['onProgress'];
}

export interface DeleteRequest {
  bucket?: string;
  paths: string | string[];
}

const emitProgress = (callback?: UploadRequest['onProgress'], loaded = 0, total?: number) => {
  if (callback) {
    callback({ loaded, total });
  }
};

export async function uploadBinary(request: UploadRequest): Promise<UploadResult> {
  const {
    bucket = DEFAULT_BUCKET,
    path,
    file,
    cacheControl = '3600',
    upsert = false,
    contentType,
    metadata,
    makePublic = true,
    signal,
    onProgress,
  } = request;

  if (signal?.aborted) {
    throw new DOMException('Upload aborted', 'AbortError');
  }

  emitProgress(onProgress, 0, file.size ?? undefined);
  telemetry.track('upload_started', {
    bucket,
    path,
    size: file.size ?? null,
    metadata,
  });

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
    try {
      const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl,
        upsert,
        contentType: contentType ?? (file instanceof File ? file.type : undefined),
        signal,
      } as any);

      if (error) {
        throw error;
      }

      const { data: urlData } = makePublic
        ? supabase.storage.from(bucket).getPublicUrl(path)
        : { data: { publicUrl: undefined } };

      const result: UploadResult = {
        bucket,
        path: data?.path ?? path,
        size: file.size ?? 0,
        mimeType: contentType ?? (file instanceof File ? file.type : undefined),
        publicUrl: urlData?.publicUrl,
      };

      emitProgress(onProgress, file.size ?? 0, file.size ?? undefined);
      telemetry.track('upload_succeeded', {
        bucket,
        path,
        size: result.size,
        attempts: attempt,
      });

      return result;
    } catch (error) {
      lastError = error;
      telemetry.track('upload_failed', {
        bucket,
        path,
        attempt,
        message: error instanceof Error ? error.message : 'unknown_error',
      });

      if (attempt >= MAX_UPLOAD_RETRIES) {
        break;
      }

      const backoff = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(backoff);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Upload failed after maximum retries');
}

export async function deleteObjects(request: DeleteRequest): Promise<void> {
  const { bucket = DEFAULT_BUCKET, paths } = request;
  const normalized = Array.isArray(paths) ? paths : [paths];

  const { error } = await supabase.storage.from(bucket).remove(normalized);

  if (error) {
    telemetry.track('upload_delete_failed', {
      bucket,
      paths: normalized,
      message: error.message,
    });
    throw new Error(`Delete failed: ${error.message}`);
  }

  telemetry.track('upload_delete_succeeded', {
    bucket,
    paths: normalized,
  });
}

const generateObjectKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export async function uploadSignatureAsset(request: UploadSignatureAssetRequest): Promise<UploadResult> {
  const { workspaceId, docId, blob, signal, onProgress } = request;
  if (!workspaceId) {
    throw new Error('workspaceId is required to upload signature assets');
  }

  const objectKey = generateObjectKey();
  const docSegment = docId ? `${workspaceId}/${docId}` : `${workspaceId}/drafts`;
  const path = `${docSegment}/signatures/${objectKey}.png`;

  const result = await uploadBinary({
    bucket: BLOCK_ASSET_BUCKET,
    path,
    file: blob,
    cacheControl: '3600',
    contentType: 'image/png',
    makePublic: true,
    metadata: {
      workspaceId,
      docId,
      type: 'signature',
    },
    signal,
    onProgress,
  });

  if (!result.publicUrl) {
    throw new Error('Signature upload succeeded but no public URL was returned');
  }

  return result;
}
