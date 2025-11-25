import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadBinary, deleteObjects } from '../../lib/services/uploadService';

const supabaseMocks = vi.hoisted(() => {
  const uploadMock = vi.fn();
  const getPublicUrlMock = vi.fn();
  const removeMock = vi.fn();
  const fromMock = vi.fn(() => ({
    upload: uploadMock,
    getPublicUrl: getPublicUrlMock,
    remove: removeMock,
  }));

  return { uploadMock, getPublicUrlMock, removeMock, fromMock };
});

const telemetryMock = vi.hoisted(() => ({
  track: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: supabaseMocks.fromMock,
    },
  },
}));

vi.mock('../../lib/services/telemetry', () => ({
  telemetry: telemetryMock,
}));

const { uploadMock, getPublicUrlMock, removeMock, fromMock } = supabaseMocks;
const trackMock = telemetryMock.track;

describe('uploadService', () => {
  const makeBlob = () => new Blob(['payload'], { type: 'image/png' });

  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockClear();
    uploadMock.mockReset();
    getPublicUrlMock.mockReset();
    removeMock.mockReset();
    trackMock.mockReset();

    uploadMock.mockResolvedValue({ data: { path: 'workspace-images/example.png' }, error: null });
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/example.png' } });
    removeMock.mockResolvedValue({ error: null });
  });

  it('uploads binary to the default bucket and returns metadata', async () => {
    const file = makeBlob();

    const result = await uploadBinary({ path: 'demo/path.png', file });

    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      bucket: 'workspace-images',
      path: 'workspace-images/example.png',
      publicUrl: 'https://cdn.example.com/example.png',
    });
    expect(trackMock).toHaveBeenCalledWith('upload_succeeded', expect.objectContaining({ path: 'demo/path.png', attempts: 1 }));
  });

  it('retries failed uploads before succeeding', async () => {
    uploadMock
      .mockRejectedValueOnce(new Error('network outage'))
      .mockResolvedValueOnce({ data: { path: 'workspace-images/retry.png' }, error: null });

    const file = makeBlob();
    const result = await uploadBinary({ path: 'retry/path.png', file, makePublic: false });

    expect(uploadMock).toHaveBeenCalledTimes(2);
    expect(result.path).toBe('workspace-images/retry.png');

    const failureCalls = trackMock.mock.calls.filter(([event]) => event === 'upload_failed');
    expect(failureCalls).toHaveLength(1);
    expect(failureCalls[0][1].attempt).toBe(1);
  });

  it('throws after exceeding retry budget', async () => {
    uploadMock.mockRejectedValue(new Error('persistent failure'));

    const file = makeBlob();
    await expect(uploadBinary({ path: 'fail/path.png', file, makePublic: false })).rejects.toThrow('persistent failure');

    const failureCalls = trackMock.mock.calls.filter(([event]) => event === 'upload_failed');
    expect(failureCalls).toHaveLength(3);
  });

  it('respects aborted signals before uploading', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(uploadBinary({ path: 'abort/path.png', file: makeBlob(), signal: controller.signal })).rejects.toThrow('Upload aborted');
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('deletes objects successfully', async () => {
    await deleteObjects({ bucket: 'workspace-images', paths: ['one.png', 'two.png'] });

    expect(removeMock).toHaveBeenCalledWith(['one.png', 'two.png']);

    const deleteSuccessCalls = trackMock.mock.calls.filter(([event]) => event === 'upload_delete_succeeded');
    expect(deleteSuccessCalls).toHaveLength(1);
    expect(deleteSuccessCalls[0][1].paths).toEqual(['one.png', 'two.png']);
  });

  it('throws when delete operations fail', async () => {
    removeMock.mockResolvedValue({ error: { message: 'permission denied' } });

    await expect(deleteObjects({ paths: 'blocked.png' })).rejects.toThrow('Delete failed: permission denied');

    const deleteFailureCalls = trackMock.mock.calls.filter(([event]) => event === 'upload_delete_failed');
    expect(deleteFailureCalls).toHaveLength(1);
    expect(deleteFailureCalls[0][1].paths).toEqual(['blocked.png']);
  });
});
