import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { uploadToSupabase, validateImageFile } from '../../lib/services/imageUploadService';

interface ImageUploadModalProps {
  workspaceId: string;
  docId?: string;
  onInsert: (url: string, alt?: string) => void;
  onClose: () => void;
}

type UploadMode = 'file' | 'url';

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  workspaceId,
  docId,
  onInsert,
  onClose,
}) => {
  const [mode, setMode] = useState<UploadMode>('file');
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Crop state
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [showCrop, setShowCrop] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Dropzone for drag and drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    const file = acceptedFiles[0];
    
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (validation !== true) {
      setError(validation.error + (validation.details ? ': ' + validation.details : ''));
      return;
    }

    // Set file and create preview
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setAltText(file.name.replace(/\.[^/.]+$/, '')); // Remove extension for alt text
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    },
    maxFiles: 1,
    multiple: false,
  });

  // Handle URL input
  const handleUrlInsert = () => {
    if (!imageUrl.trim()) {
      setError('Please enter an image URL');
      return;
    }

    try {
      new URL(imageUrl); // Validate URL
      onInsert(imageUrl, altText || undefined);
      onClose();
    } catch {
      setError('Invalid URL format');
    }
  };

  // Apply crop to image
  const getCroppedImage = async (): Promise<File | null> => {
    if (!completedCrop || !imgRef.current || !selectedFile) return null;

    const canvas = document.createElement('canvas');
    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const croppedFile = new File([blob], selectedFile.name, {
          type: selectedFile.type,
          lastModified: Date.now(),
        });
        resolve(croppedFile);
      }, selectedFile.type);
    });
  };

  // Upload file to Supabase
  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(20);

    try {
      // Get cropped image if crop was applied
      let fileToUpload = selectedFile;
      if (showCrop && completedCrop) {
        const croppedFile = await getCroppedImage();
        if (croppedFile) {
          fileToUpload = croppedFile;
        }
      }

      setUploadProgress(50);

      // Upload to Supabase
      const result = await uploadToSupabase(fileToUpload, workspaceId, docId);
      
      setUploadProgress(100);

      // Insert image into editor
      onInsert(result.url, altText || undefined);
      onClose();
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b-4 border-black bg-yellow-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">Insert Image</h2>
            <button
              onClick={onClose}
              className="text-2xl font-bold hover:text-red-600 leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex border-b-4 border-black">
          <button
            onClick={() => setMode('file')}
            className={`flex-1 py-3 font-bold border-r-4 border-black ${
              mode === 'file' ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'
            }`}
          >
            📁 Upload File
          </button>
          <button
            onClick={() => setMode('url')}
            className={`flex-1 py-3 font-bold ${
              mode === 'url' ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'
            }`}
          >
            🔗 Image URL
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'file' ? (
            <div className="space-y-4">
              {/* Dropzone */}
              {!selectedFile && (
                <div
                  {...getRootProps()}
                  className={`border-4 border-dashed border-black p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'bg-yellow-100' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="text-6xl mb-4">📸</div>
                  <p className="text-lg font-bold mb-2">
                    {isDragActive ? 'Drop image here' : 'Drag & drop image here'}
                  </p>
                  <p className="text-sm text-gray-600">or click to browse</p>
                  <p className="text-xs text-gray-500 mt-4">
                    Supports: JPEG, PNG, WebP, GIF • Max 5MB
                  </p>
                </div>
              )}

              {/* Preview */}
              {selectedFile && previewUrl && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setShowCrop(false);
                      }}
                      className="px-3 py-1 bg-red-500 text-white font-bold border-2 border-black hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Crop Toggle */}
                  <button
                    onClick={() => setShowCrop(!showCrop)}
                    className={`w-full py-2 font-bold border-2 border-black ${
                      showCrop ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    {showCrop ? '✂️ Cropping Enabled' : '✂️ Enable Crop'}
                  </button>

                  {/* Image Preview/Crop */}
                  <div className="border-4 border-black bg-gray-900 p-2">
                    {showCrop ? (
                      <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                      >
                        <img
                          ref={imgRef}
                          src={previewUrl}
                          alt="Preview"
                          className="max-w-full h-auto"
                        />
                      </ReactCrop>
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-full h-auto mx-auto"
                      />
                    )}
                  </div>

                  {/* Alt Text */}
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Alt Text (optional but recommended)
                    </label>
                    <input
                      type="text"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Describe the image..."
                      className="w-full px-3 py-2 border-2 border-black font-mono text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* URL Input */}
              <div>
                <label className="block text-sm font-bold mb-2">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border-2 border-black font-mono text-sm"
                />
              </div>

              {/* Alt Text */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  Alt Text (optional but recommended)
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe the image..."
                  className="w-full px-3 py-2 border-2 border-black font-mono text-sm"
                />
              </div>

              {/* URL Preview */}
              {imageUrl && (
                <div className="border-4 border-black bg-gray-900 p-4">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-w-full h-auto mx-auto"
                    onError={() => setError('Could not load image from URL')}
                  />
                </div>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="mt-4">
              <div className="bg-gray-200 border-2 border-black h-8 overflow-hidden">
                <div
                  className="bg-yellow-300 h-full transition-all duration-300 flex items-center justify-center font-bold"
                  style={{ width: `${uploadProgress}%` }}
                >
                  {uploadProgress}%
                </div>
              </div>
              <p className="text-center text-sm text-gray-600 mt-2">
                Uploading image...
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-100 border-2 border-red-500 text-red-800 font-bold">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-4 border-black bg-gray-50 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border-2 border-black font-bold hover:bg-gray-100"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={mode === 'file' ? handleFileUpload : handleUrlInsert}
            disabled={uploading || (mode === 'file' ? !selectedFile : !imageUrl)}
            className="px-6 py-2 bg-yellow-300 border-2 border-black font-bold hover:bg-yellow-400 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
          >
            {uploading ? 'Uploading...' : 'Insert Image'}
          </button>
        </div>
      </div>
    </div>
  );
};
