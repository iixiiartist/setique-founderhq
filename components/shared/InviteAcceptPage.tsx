import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { APP_CONFIG } from '../../lib/config';

interface InviteAcceptPageProps {
    token: string;
    onComplete: () => void;
}

interface InviteAcceptResult {
    success: boolean;
    message?: string;
    error?: string;
    workspace_name?: string;
    workspace_id?: string;
    isNewUser?: boolean;
    needsAuth?: boolean;
    email?: string;
    tempPassword?: string;
    session?: any;
}

export const InviteAcceptPage: React.FC<InviteAcceptPageProps> = ({ token, onComplete }) => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'needs_login' | 'password_setup'>('loading');
    const [message, setMessage] = useState('');
    const [inviteData, setInviteData] = useState<InviteAcceptResult | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const hasAttemptedRef = useRef(false);

    // Auto-fill name from email when invite data is available
    useEffect(() => {
        if (inviteData?.email && !name) {
            const emailPrefix = inviteData.email.split('@')[0] || '';
            setName(emailPrefix);
        }
    }, [inviteData?.email, name]);

    useEffect(() => {
        // Prevent double-call in React Strict Mode using ref
        if (!hasAttemptedRef.current) {
            hasAttemptedRef.current = true;
            acceptInvitation();
        }
    }, [token]);

    const acceptInvitation = async () => {
        try {
            setStatus('loading');
            setMessage('Accepting invitation...');

            const functionsUrl = `${APP_CONFIG.api.supabase.url}/functions/v1`;
            const response = await fetch(`${functionsUrl}/accept-invitation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token })
            });

            console.log('Accept invitation response status:', response.status);
            
            const result: InviteAcceptResult = await response.json();
            console.log('Accept invitation response body:', result);
            console.log('Error details:', result.error, result.success);

            if (!response.ok || !result.success) {
                setStatus('error');
                setMessage(result.error || `Failed to accept invitation (Status: ${response.status})`);
                return;
            }

            setInviteData(result);

            if (result.isNewUser) {
                // New user created - sign them in with temp password
                setStatus('password_setup');
                setMessage(`Welcome! Your account has been created. Please set your password to continue.`);
                
                // Sign in with temporary password
                if (result.tempPassword && result.email) {
                    try {
                        const { error: signInError } = await supabase.auth.signInWithPassword({
                            email: result.email,
                            password: result.tempPassword
                        });
                        
                        if (signInError) {
                            console.error('Error signing in with temp password:', signInError);
                            // Show fallback message
                            setMessage(`Your temporary password is: ${result.tempPassword}\n\nPlease save it and log in manually to set a new password.`);
                        } else {
                            // Successfully signed in, can now update password
                            console.log('Successfully signed in with temp password');
                        }
                    } catch (e) {
                        console.error('Error auto-signing in:', e);
                    }
                }
            } else if (result.needsAuth) {
                // Existing user needs to log in - prefill their email
                setStatus('needs_login');
                setMessage(`You already have an account! Please log in with ${result.email} to access the workspace.`);
                
                // Store email for prefilling login form
                if (result.email) {
                    sessionStorage.setItem('auth_prefill_email', result.email);
                    sessionStorage.setItem('auth_message', `Logging in to join ${result.workspace_name || 'workspace'}`);
                }
            } else {
                // Success - already logged in
                setStatus('success');
                setMessage(result.message);
                setTimeout(() => {
                    onComplete();
                }, 2000);
            }

        } catch (error: any) {
            console.error('Error accepting invitation:', error);
            
            // Try to get the actual error message from the function response
            let errorMessage = 'Failed to accept invitation';
            
            if (error.context?.body) {
                try {
                    const errorBody = JSON.parse(error.context.body);
                    errorMessage = errorBody.error || errorMessage;
                } catch (e) {
                    // If we can't parse the body, use the error message
                    errorMessage = error.message || errorMessage;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            console.error('Final error message:', errorMessage);
            setStatus('error');
            setMessage(errorMessage);
        }
    };

    const handleSetPassword = async () => {
        // Validate inputs
        setFormError(null);
        const trimmedName = name.trim();
        
        if (!trimmedName) {
            setFormError('Please enter your name');
            return;
        }

        if (!password) {
            setFormError('Please enter a password');
            return;
        }

        if (password.length < 8) {
            setFormError('Password must be at least 8 characters');
            return;
        }

        if (password !== confirmPassword) {
            setFormError('Passwords do not match');
            return;
        }

        setIsProcessing(true);

        try {
            // Update both auth metadata and profiles table in parallel
            const [{ data: userData, error: getUserError }, { error: updateError }] = await Promise.all([
                supabase.auth.getUser(),
                supabase.auth.updateUser({
                    password: password,
                    data: { full_name: trimmedName }
                })
            ]);

            if (getUserError) throw getUserError;
            if (updateError) throw updateError;

            // Also update profiles table
            if (userData?.user?.id) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ full_name: trimmedName })
                    .eq('id', userData.user.id);

                if (profileError) {
                    console.error('Error updating profile:', profileError);
                    // Don't fail the whole process if profile update fails
                }
            }

            setStatus('success');
            setMessage('Password set successfully! Redirecting...');
            setTimeout(() => {
                onComplete();
            }, 1500);

        } catch (error: any) {
            console.error('Error setting password:', error);
            setFormError(error.message || 'Failed to set password. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-4">
                <div className="bg-white border-4 border-black shadow-neo-brutal p-8 max-w-md w-full text-center">
                    <div className="animate-spin text-6xl mb-4">⚙️</div>
                    <h2 className="text-2xl font-bold mb-2">Processing Invitation</h2>
                    <p className="text-gray-600">{message}</p>
                </div>
            </div>
        );
    }

    if (status === 'password_setup') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-4">
                <div className="bg-white border-4 border-black shadow-neo-brutal p-8 max-w-md w-full">
                    <div className="text-center mb-6">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-2xl font-bold mb-2">Welcome to Setique!</h2>
                        <p className="text-gray-600 mb-4">{message}</p>
                        {inviteData?.workspace_name && (
                            <div className="bg-purple-100 border-2 border-black p-3 mb-4">
                                <p className="font-bold">Workspace: {inviteData.workspace_name}</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {formError && (
                            <div className="bg-red-100 border-2 border-red-600 p-3 text-red-700 font-bold">
                                ⚠️ {formError}
                            </div>
                        )}

                        <div>
                            <label className="block font-bold mb-2">Your Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setFormError(null);
                                }}
                                className={`w-full border-2 p-3 font-mono ${
                                    formError && !name.trim() ? 'border-red-600' : 'border-black'
                                }`}
                                placeholder="Enter your name"
                            />
                        </div>

                        <div>
                            <label className="block font-bold mb-2">Set Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setFormError(null);
                                }}
                                className={`w-full border-2 p-3 font-mono ${
                                    formError && (!password || password.length < 8) ? 'border-red-600' : 'border-black'
                                }`}
                                placeholder="Min 8 characters"
                            />
                        </div>

                        <div>
                            <label className="block font-bold mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setFormError(null);
                                }}
                                className={`w-full border-2 p-3 font-mono ${
                                    formError && password !== confirmPassword ? 'border-red-600' : 'border-black'
                                }`}
                                placeholder="Re-enter password"
                            />
                        </div>

                        <button
                            onClick={handleSetPassword}
                            disabled={isProcessing || !password || password !== confirmPassword}
                            className="w-full bg-purple-600 text-white border-4 border-black p-4 font-bold text-lg shadow-neo-btn hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Setting Password...' : 'Continue →'}
                        </button>

                        {inviteData?.tempPassword && (
                            <div className="bg-yellow-100 border-2 border-black p-3 mt-4">
                                <p className="text-xs font-bold mb-1">⚠️ TEMPORARY PASSWORD</p>
                                <p className="text-xs">If you need to log in manually later:</p>
                                <code className="block bg-white p-2 mt-2 text-xs break-all">
                                    {inviteData.tempPassword}
                                </code>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'needs_login') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-4">
                <div className="bg-white border-4 border-black shadow-neo-brutal p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">👋</div>
                    <h2 className="text-2xl font-bold mb-4">Welcome Back!</h2>
                    <p className="text-gray-600 mb-6">{message}</p>
                    <button
                        onClick={() => {
                            window.location.href = '/app';
                        }}
                        className="w-full bg-blue-600 text-white border-4 border-black p-4 font-bold text-lg shadow-neo-btn hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all"
                    >
                        Go to Login →
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 to-blue-600 p-4">
                <div className="bg-white border-4 border-black shadow-neo-brutal p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold mb-4">Success!</h2>
                    <p className="text-gray-600 whitespace-pre-line">{message}</p>
                </div>
            </div>
        );
    }

    // Error state
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-pink-600 p-4">
            <div className="bg-white border-4 border-black shadow-neo-brutal p-8 max-w-md w-full text-center">
                <div className="text-6xl mb-4">❌</div>
                <h2 className="text-2xl font-bold mb-4">Oops!</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <button
                    onClick={() => {
                        // Reset state and try again
                        hasAttemptedRef.current = false;
                        acceptInvitation();
                    }}
                    className="w-full bg-blue-600 text-white border-4 border-black p-4 font-bold text-lg shadow-neo-btn hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all mb-3"
                >
                    Try Again →
                </button>
                <button
                    onClick={() => window.location.href = '/'}
                    className="w-full bg-gray-600 text-white border-4 border-black p-4 font-bold text-lg shadow-neo-btn hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all"
                >
                    Go to Home
                </button>
            </div>
        </div>
    );
};
