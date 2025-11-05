import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { APP_CONFIG } from '../../lib/config';

interface InviteAcceptPageProps {
    token: string;
    onComplete: () => void;
}

export const InviteAcceptPage: React.FC<InviteAcceptPageProps> = ({ token, onComplete }) => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'needs_login' | 'password_setup'>('loading');
    const [message, setMessage] = useState('');
    const [inviteData, setInviteData] = useState<any>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const hasAttemptedRef = useRef(false);

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
            
            const result = await response.json();
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
                // Existing user needs to log in
                setStatus('needs_login');
                setMessage(`You already have an account! Please log in with ${result.email} to access the workspace.`);
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
        if (!password || password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }

        setIsProcessing(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setStatus('success');
            setMessage('Password set successfully! Redirecting...');
            setTimeout(() => {
                onComplete();
            }, 1500);

        } catch (error: any) {
            console.error('Error setting password:', error);
            alert(`Failed to set password: ${error.message}`);
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
                        <div>
                            <label className="block font-bold mb-2">Your Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full border-2 border-black p-3 font-mono"
                                placeholder="Enter your name"
                            />
                        </div>

                        <div>
                            <label className="block font-bold mb-2">Set Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border-2 border-black p-3 font-mono"
                                placeholder="Min 8 characters"
                            />
                        </div>

                        <div>
                            <label className="block font-bold mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full border-2 border-black p-3 font-mono"
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
                            // Clear token and go to login
                            window.history.replaceState({}, document.title, window.location.pathname);
                            window.location.reload();
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
                    onClick={() => window.location.href = '/'}
                    className="w-full bg-gray-600 text-white border-4 border-black p-4 font-bold text-lg shadow-neo-btn hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all"
                >
                    Go to Home →
                </button>
            </div>
        </div>
    );
};
