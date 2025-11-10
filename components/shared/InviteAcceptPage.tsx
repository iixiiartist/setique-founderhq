import React, { useEffect, useState, useRef } from 'react';
import { APP_CONFIG } from '../../lib/config';
import { clearInvitationToken } from '../../lib/utils/tokenStorage';
import { PasswordSetupForm } from './PasswordSetupForm';
import { supabase } from '../../lib/supabase';

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
    passwordResetSent?: boolean;
    magicLink?: string;
    tempPassword?: string;
}

export const InviteAcceptPage: React.FC<InviteAcceptPageProps> = ({ token, onComplete }) => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'needs_login' | 'setup_password'>('loading');
    const [message, setMessage] = useState('');
    const [inviteData, setInviteData] = useState<InviteAcceptResult | null>(null);
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
                    'Authorization': `Bearer ${APP_CONFIG.api.supabase.anonKey}`,
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

            if (result.isNewUser && result.tempPassword && result.email) {
                // New user created - log them in with temp password first
                console.log('New user detected, logging in with temporary password...');
                
                try {
                    const { error: signInError } = await supabase.auth.signInWithPassword({
                        email: result.email,
                        password: result.tempPassword
                    });
                    
                    if (signInError) {
                        console.error('Error signing in:', signInError);
                        throw signInError;
                    }
                    
                    console.log('✅ Session established, showing password setup form');
                    // Now show the password setup form with the user logged in
                    setStatus('setup_password');
                } catch (err: any) {
                    console.error('Error logging in new user:', err);
                    setStatus('error');
                    setMessage('Failed to initialize your session. Please try the invitation link again.');
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
                
                // Clear invitation token on successful completion
                clearInvitationToken();
                
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

    if (status === 'setup_password' && inviteData) {
        return (
            <PasswordSetupForm
                email={inviteData.email || ''}
                workspaceName={inviteData.workspace_name || 'the workspace'}
                onComplete={() => {
                    clearInvitationToken();
                    onComplete();
                }}
            />
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
                    <p className="text-gray-600 whitespace-pre-line mb-6">{message}</p>
                    
                    {inviteData?.isNewUser && (
                        <div className="bg-blue-50 border-2 border-blue-600 p-4 mb-4 text-left">
                            <h3 className="font-bold mb-2">📧 Next Steps:</h3>
                            <ol className="list-decimal list-inside space-y-1 text-sm">
                                <li>Check your email inbox</li>
                                <li>Click the password reset link</li>
                                <li>Set your new password</li>
                                <li>Log in and start collaborating!</li>
                            </ol>
                        </div>
                    )}
                    
                    <button
                        onClick={() => window.location.href = '/app'}
                        className="w-full bg-green-600 text-white border-4 border-black p-4 font-bold text-lg shadow-neo-btn hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all"
                    >
                        {inviteData?.isNewUser ? 'Go to Login' : 'Continue to App'} →
                    </button>
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
