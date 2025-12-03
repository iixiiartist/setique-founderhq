import React, { useState, useEffect, useRef } from 'react';
import { useSuccessState } from '../../hooks';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { DatabaseService } from '../../lib/services/database';
import { uploadBinary } from '../../lib/services/uploadService';
import { Upload, User, Mail, Save, X, Camera, Loader2, Trash2 } from 'lucide-react';

interface ProfileSettingsProps {
  onSave?: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onSave }) => {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<{
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    avatarUrl: '',
  });

  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, triggerSaveSuccess, resetSaveSuccess] = useSuccessState(3000);

  // Allowed file types and max size
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // Load profile data
  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await DatabaseService.getUserProfile(user.id);
    
    if (data) {
      setProfile(data);
      setFormData({
        fullName: data.full_name || '',
        avatarUrl: data.avatar_url || '',
      });
    }
    
    setLoading(false);
  };

  const handleInputChange = (field: 'fullName' | 'avatarUrl', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    resetSaveSuccess();
  };

  const handleSave = async () => {
    if (!user || !isDirty) return;

    setSaving(true);
    resetSaveSuccess();

    try {
      const { error } = await DatabaseService.updateUserProfile(user.id, {
        full_name: formData.fullName.trim() || null,
        avatar_url: formData.avatarUrl.trim() || null,
      });

      if (error) {
        throw error;
      }

      // Reload profile to get updated data
      await loadProfile();
      setIsDirty(false);
      triggerSaveSuccess();
      onSave?.();
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    
    setFormData({
      fullName: profile.full_name || '',
      avatarUrl: profile.avatar_url || '',
    });
    setIsDirty(false);
    resetSaveSuccess();
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      alert('Image size must be less than 5MB');
      return;
    }

    if (!user) {
      alert('You must be logged in to upload an avatar');
      return;
    }

    if (!workspace?.id) {
      alert('No workspace found. Please refresh the page.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate a unique path for the avatar
      // Path must start with workspace ID to pass RLS policies
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const path = `${workspace.id}/avatars/${user.id}/${timestamp}.${fileExt}`;

      // Upload to Supabase storage
      const result = await uploadBinary({
        bucket: 'workspace-images',
        path,
        file,
        cacheControl: '3600',
        upsert: true,
        makePublic: true,
        onProgress: (progress) => {
          if (progress.total) {
            setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        },
      });

      if (result.publicUrl) {
        // Update form data with new URL
        setFormData(prev => ({ ...prev, avatarUrl: result.publicUrl! }));
        setIsDirty(true);
        resetSaveSuccess();
      } else {
        throw new Error('Upload succeeded but no public URL was returned');
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = () => {
    setFormData(prev => ({ ...prev, avatarUrl: '' }));
    setIsDirty(true);
    resetSaveSuccess();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-8 text-gray-500">
        Failed to load profile. Please refresh the page.
      </div>
    );
  }

  const getInitials = () => {
    if (formData.fullName) {
      return formData.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return profile.email.charAt(0).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-black">Profile Settings</h2>
        <p className="text-gray-600 mt-1">
          Manage your personal information and how others see you in the workspace
        </p>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="bg-green-50 rounded-xl border border-green-200 text-green-800 px-4 py-3 flex items-center justify-between">
          <span className="font-semibold">✓ Profile updated successfully!</span>
          <button
            onClick={resetSaveSuccess}
            className="text-green-800 hover:text-green-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar Preview with Upload Overlay */}
          <div className="relative group flex-shrink-0">
            {formData.avatarUrl ? (
              <img
                src={formData.avatarUrl}
                alt="Profile"
                className="w-28 h-28 rounded-full object-cover border-2 border-gray-200 shadow-sm"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl font-bold border-2 border-gray-200 shadow-sm">
                {getInitials()}
              </div>
            )}
            
            {/* Upload Overlay */}
            {!uploading && (
              <button
                onClick={handleFileSelect}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                title="Upload new photo"
              >
                <Camera className="w-8 h-8 text-white" />
              </button>
            )}
            
            {/* Upload Progress Overlay */}
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/70 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <span className="text-white text-xs mt-1 font-mono">{uploadProgress}%</span>
              </div>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1 space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              <Camera className="w-4 h-4 inline mr-1" />
              Profile Photo
            </label>
            
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {/* Upload Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleFileSelect}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Photo
                  </>
                )}
              </button>
              
              {formData.avatarUrl && !uploading && (
                <button
                  onClick={handleRemoveAvatar}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 font-semibold rounded-xl hover:bg-red-50 hover:shadow-sm transition-all border border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              )}
            </div>
            
            <p className="text-xs text-gray-500">
              Upload a square image (JPEG, PNG, GIF, or WebP). Max size: 5MB.
            </p>
          </div>
        </div>

        <div className="border-t-2 border-gray-200 pt-6 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Full Name
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-xs text-gray-500 mt-1">
              This is how your name will appear to other workspace members
            </p>
          </div>

          {/* Email (Read-Only) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Address
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Email address cannot be changed
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {isDirty && (
          <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving || !formData.fullName.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-6 py-2 bg-white rounded-xl border border-gray-200 text-slate-900 font-semibold hover:bg-gray-50 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use your real name so team members can easily identify you</li>
          <li>• Upload a square photo for the best results</li>
          <li>• Supported formats: JPEG, PNG, GIF, WebP (max 5MB)</li>
          <li>• Your changes will be visible immediately to all workspace members</li>
        </ul>
      </div>
    </div>
  );
};
