import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { uploadToSupabase, validateImageFile } from '../../lib/services/imageUploadService';
import { extractTextFromImage, generateImageCaption } from '../../services/visionService';
import { FileText, Sparkles } from 'lucide-react';

interface ImageUploadModalProps {
  workspaceId: string;
  docId?: string;
  onInsert: (url: string, alt?: string) => void;
  onInsertText?: (text: string) => void; // New prop for inserting OCR text
  onClose: () => void;
}

type UploadMode = 'file' | 'url';

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  workspaceId,
  docId,
  onInsert,
  onInsertText,
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
  
  // OCR state
  const [extractingText, setExtractingText] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [generatingAlt, setGeneratingAlt] = useState(false);
  
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

  // Extract text from image using AI OCR
  const handleExtractText = async () => {
    if (!previewUrl) return;
    
    setExtractingText(true);
    setError(null);
    setExtractedText(null);
    
    try {
      const result = await extractTextFromImage(previewUrl, { documentType: 'general' });
      if (result.text.trim()) {
        setExtractedText(result.text);
      } else {
        setError('No text could be extracted from this image');
      }
    } catch (err: any) {
      console.error('OCR error:', err);
      setError(err.message || 'Failed to extract text');
    } finally {
      setExtractingText(false);
    }
  };

  // Generate alt text using AI
  const handleGenerateAltText = async () => {
    if (!previewUrl) return;
    
    setGeneratingAlt(true);
    setError(null);
    
    try {
      const caption = await generateImageCaption(previewUrl, { detailed: false });
      if (caption) {
        setAltText(caption);
      }
    } catch (err: any) {
      console.error('Caption error:', err);
      setError(err.message || 'Failed to generate alt text');
    } finally {
      setGeneratingAlt(false);
    }
  };

  // Insert extracted text into document
  const handleInsertExtractedText = () => {
    if (extractedText && onInsertText) {
      onInsertText(extractedText);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-800 to-slate-900 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Insert Image</h2>
            <button
              onClick={onClose}
              className="text-xl text-white/70 hover:text-white leading-none transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setMode('file')}
            className={`flex-1 py-3 font-semibold transition-colors ${
              mode === 'file' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-gray-50'
            }`}
          >
            📁 Upload File
          </button>
          <button
            onClick={() => setMode('url')}
            className={`flex-1 py-3 font-semibold transition-colors ${
              mode === 'url' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-gray-50'
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
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragActive ? 'border-slate-400 bg-slate-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="text-5xl mb-4">📸</div>
                  <p className="text-lg font-semibold text-slate-900 mb-2">
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
                      className="px-3 py-1.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Crop Toggle */}
                  <button
                    onClick={() => setShowCrop(!showCrop)}
                    className={`w-full py-2.5 font-semibold rounded-xl border transition-all ${
                      showCrop ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {showCrop ? '✂️ Cropping Enabled' : '✂️ Enable Crop'}
                  </button>

                  {/* Image Preview/Crop */}
                  <div className="border border-gray-200 rounded-xl bg-gray-900 p-2 overflow-hidden">
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Alt Text (optional but recommended)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={altText}
                        onChange={(e) => setAltText(e.target.value)}
                        placeholder="Describe the image..."
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                      />
                      <button
                        onClick={handleGenerateAltText}
                        disabled={generatingAlt}
                        className="px-3 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                        title="Generate alt text with AI"
                      >
                        <Sparkles className="w-4 h-4" />
                        {generatingAlt ? '...' : 'AI'}
                      </button>
                    </div>
                  </div>

                  {/* AI OCR Features */}
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> AI Features
                    </p>
                    <button
                      onClick={handleExtractText}
                      disabled={extractingText}
                      className="w-full py-2.5 font-semibold rounded-xl border transition-all flex items-center justify-center gap-2 bg-white text-slate-700 border-gray-200 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <FileText className="w-4 h-4" />
                      {extractingText ? 'Extracting Text...' : 'Extract Text from Image (OCR)'}
                    </button>
                  </div>

                  {/* Extracted Text */}
                  {extractedText && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Extracted Text
                      </label>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{extractedText}</pre>
                      </div>
                      {onInsertText && (
                        <button
                          onClick={handleInsertExtractedText}
                          className="w-full py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Insert Text into Document
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* URL Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                />
              </div>

              {/* Alt Text */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Alt Text (optional but recommended)
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe the image..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                />
              </div>

              {/* URL Preview */}
              {imageUrl && (
                <div className="border border-gray-200 rounded-xl bg-gray-900 p-4 overflow-hidden">
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
              <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-slate-900 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-600 mt-2">
                Uploading image... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-slate-700 hover:bg-gray-50 transition-colors"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={mode === 'file' ? handleFileUpload : handleUrlInsert}
            disabled={uploading || (mode === 'file' ? !selectedFile : !imageUrl)}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold shadow-sm hover:shadow-md hover:bg-slate-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
          >
            {uploading ? 'Uploading...' : 'Insert Image'}
          </button>
        </div>
      </div>
    </div>
  );
};
