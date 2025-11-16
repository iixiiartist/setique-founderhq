import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../../lib/services/auth';
import { sanitizeAuthError } from '../../lib/utils/errorMessages';

interface ResetPasswordProps {
    onSuccess?: () => void;
}

const validatePassword = (password: string): { valid: boolean; error?: string } => {
    if (password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters long' };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one lowercase letter' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one uppercase letter' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one number' };
    }
    return { valid: true };
};

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onSuccess }) => {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (loading) return;

        setError(null);
        setMessage(null);

        // Validate password strength
        const validation = validatePassword(newPassword);
        if (!validation.valid) {
            setError(validation.error!);
            return;
        }

        // Check passwords match
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const { error } = await AuthService.updatePassword(newPassword);

            if (error) {
                setError(sanitizeAuthError(error));
                setLoading(false);
                return;
            }

            setMessage('Password updated successfully! Redirecting to app...');
            
            // Redirect after short delay
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                } else {
                    navigate('/app', { replace: true });
                }
            }, 2000);
        } catch (err) {
            setError(sanitizeAuthError(err));
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="bg-black p-6 border-2 border-black mb-0">
                    <h1 className="text-3xl font-bold text-white font-mono text-center">
                        FounderHQ
                    </h1>
                    <p className="text-yellow-400 text-center text-sm mt-2 font-mono">
                        Reset Your Password
                    </p>
                </div>

                {/* Form Container */}
                <div className="bg-white border-2 border-t-0 border-black p-8 shadow-[8px_8px_0_rgba(0,0,0,1)]">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-black font-mono">
                            Set New Password
                        </h2>
                        <p className="mt-1 text-sm text-gray-600 font-mono">
                            Choose a strong password for your account
                        </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-bold font-mono text-black mb-2">
                                New Password
                            </label>
                            <input
                                id="new-password"
                                name="newPassword"
                                type="password"
                                required
                                className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-yellow-400 font-mono text-sm"
                                placeholder="Min. 8 characters, mixed case, numbers"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold font-mono text-black mb-2">
                                Confirm Password
                            </label>
                            <input
                                id="confirm-password"
                                name="confirmPassword"
                                type="password"
                                required
                                className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-yellow-400 font-mono text-sm"
                                placeholder="Re-enter your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <div className="bg-blue-50 border-2 border-blue-600 p-3">
                            <p className="text-xs font-mono text-blue-900 font-bold mb-2">
                                🔒 Password Requirements:
                            </p>
                            <ul className="text-xs font-mono text-blue-800 space-y-1 list-disc list-inside">
                                <li>At least 8 characters</li>
                                <li>Contains uppercase letter (A-Z)</li>
                                <li>Contains lowercase letter (a-z)</li>
                                <li>Contains number (0-9)</li>
                            </ul>
                        </div>

                        {error && (
                            <div className="rounded-none bg-red-50 p-4 border-2 border-red-600 shadow-[4px_4px_0_rgba(220,38,38,1)] animate-pulse">
                                <div className="flex items-center">
                                    <span className="text-red-600 text-2xl mr-3">❌</span>
                                    <div className="text-base font-mono font-bold text-red-900">{error}</div>
                                </div>
                            </div>
                        )}

                        {message && (
                            <div className="rounded-none bg-green-50 p-4 border-2 border-green-600 shadow-[4px_4px_0_rgba(22,163,74,1)]">
                                <div className="flex items-center">
                                    <span className="text-green-600 text-2xl mr-3">✅</span>
                                    <div className="text-base font-mono font-bold text-green-900">{message}</div>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-yellow-400 border-2 border-black font-bold font-mono text-black hover:bg-yellow-300 transition-colors shadow-[4px_4px_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_rgba(0,0,0,1)] disabled:bg-gray-300"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    UPDATING...
                                </span>
                            ) : (
                                'UPDATE PASSWORD →'
                            )}
                        </button>

                        <div className="pt-4 border-t-2 border-gray-200 text-center">
                            <button
                                type="button"
                                className="text-sm font-mono text-gray-600 hover:text-black underline"
                                onClick={() => window.location.href = '/app'}
                            >
                                ← Back to Login
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
