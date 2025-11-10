import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { sanitizeAuthError } from '../../lib/utils/errorMessages';

interface PasswordSetupFormProps {
    email: string;
    workspaceName: string;
    onComplete: () => void;
}

export const PasswordSetupForm: React.FC<PasswordSetupFormProps> = ({ email, workspaceName, onComplete }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (!/[A-Z]/.test(pwd)) {
            return 'Password must contain at least one uppercase letter';
        }
        if (!/[a-z]/.test(pwd)) {
            return 'Password must contain at least one lowercase letter';
        }
        if (!/[0-9]/.test(pwd)) {
            return 'Password must contain at least one number';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate password
        const validationError = validatePassword(password);
        if (validationError) {
            setError(validationError);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsSubmitting(true);

        try {
            // Update the user's password
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) {
                throw updateError;
            }

            // Success! Redirect to app
            onComplete();
        } catch (err: any) {
            console.error('Error setting password:', err);
            setError(sanitizeAuthError(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const getPasswordStrength = (pwd: string): { strength: string; color: string; width: string } => {
        if (pwd.length === 0) return { strength: '', color: '', width: '0%' };
        
        let score = 0;
        if (pwd.length >= 8) score++;
        if (pwd.length >= 12) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[a-z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;

        if (score <= 2) return { strength: 'Weak', color: '#ef4444', width: '33%' };
        if (score <= 4) return { strength: 'Medium', color: '#f59e0b', width: '66%' };
        return { strength: 'Strong', color: '#10b981', width: '100%' };
    };

    const passwordStrength = getPasswordStrength(password);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-4">
            <div className="bg-white border-4 border-black shadow-neo-brutal p-8 max-w-md w-full">
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">🔐</div>
                    <h2 className="text-2xl font-bold mb-2">Set Your Password</h2>
                    <p className="text-gray-600">
                        You've been added to <strong>{workspaceName}</strong>
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        Email: {email}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                            placeholder="Enter your password"
                            required
                            disabled={isSubmitting}
                            autoComplete="new-password"
                        />
                        {password && (
                            <div className="mt-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-gray-600">Password strength:</span>
                                    <span style={{ color: passwordStrength.color }} className="font-medium">
                                        {passwordStrength.strength}
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded overflow-hidden">
                                    <div
                                        className="h-full transition-all duration-300"
                                        style={{
                                            width: passwordStrength.width,
                                            backgroundColor: passwordStrength.color
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                            placeholder="Confirm your password"
                            required
                            disabled={isSubmitting}
                            autoComplete="new-password"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border-2 border-red-200 rounded p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="bg-blue-50 border-2 border-blue-200 rounded p-3 text-xs text-gray-600">
                        <strong>Password requirements:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>At least 8 characters long</li>
                            <li>One uppercase letter</li>
                            <li>One lowercase letter</li>
                            <li>One number</li>
                        </ul>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !password || !confirmPassword}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 border-4 border-black shadow-neo-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                    >
                        {isSubmitting ? 'Setting Password...' : 'Set Password & Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
};