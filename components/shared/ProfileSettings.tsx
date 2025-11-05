import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../lib/services/database';
import { Upload, User, Mail, Save, X } from 'lucide-react';

interface ProfileSettingsProps {
  onSave?: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onSave }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!user || !isDirty) return;

    setSaving(true);
    setSaveSuccess(false);

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
      setSaveSuccess(true);
      onSave?.();

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
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
    setSaveSuccess(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
        <div className="bg-green-50 border-2 border-green-500 text-green-800 px-4 py-3 rounded-none flex items-center justify-between">
          <span className="font-semibold">✓ Profile updated successfully!</span>
          <button
            onClick={() => setSaveSuccess(false)}
            className="text-green-800 hover:text-green-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white border-2 border-black shadow-neo p-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            {formData.avatarUrl ? (
              <img
                src={formData.avatarUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-black"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl font-bold border-2 border-black">
                {getInitials()}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Avatar URL
            </label>
            <input
              type="text"
              value={formData.avatarUrl}
              onChange={(e) => handleInputChange('avatarUrl', e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full px-3 py-2 border-2 border-black rounded-none focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500">
              Enter a URL to your profile picture. We recommend using a square image.
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
              className="w-full px-3 py-2 border-2 border-black rounded-none focus:outline-none focus:border-blue-500"
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
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-none bg-gray-50 text-gray-600 cursor-not-allowed"
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
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-none font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-2 border-blue-700 shadow-neo-btn"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-6 py-2 bg-white border-2 border-black text-black rounded-none font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="bg-blue-50 border-2 border-blue-500 p-4 rounded-none">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use your real name so team members can easily identify you</li>
          <li>• A profile picture helps personalize your workspace presence</li>
          <li>• Your changes will be visible immediately to all workspace members</li>
        </ul>
      </div>
    </div>
  );
};
