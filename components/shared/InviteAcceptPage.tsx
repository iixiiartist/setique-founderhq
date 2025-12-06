import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '../../lib/config';
import { clearInvitationToken } from '../../lib/utils/tokenStorage';
import { PasswordSetupForm } from './PasswordSetupForm';
import { supabase } from '../../lib/supabase';
import { sanitizeAuthError } from '../../lib/utils/errorMessages';
import { Hand, CheckCircle, XCircle, Mail, Lightbulb, Loader2 } from 'lucide-react';

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
    const navigate = useNavigate();
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

            // Use Supabase SDK for edge function calls (automatically handles auth headers)
            const { data: result, error: invokeError } = await supabase.functions.invoke<InviteAcceptResult>('accept-invitation', {
                body: { token }
            });

            if (process.env.NODE_ENV === 'development') {
                console.log('Accept invitation response:', result);
            }

            if (invokeError || !result?.success) {
                setStatus('error');
                setMessage(result?.error || invokeError?.message || 'Failed to accept invitation');
                return;
            }

            setInviteData(result);

            if (result.isNewUser && result.tempPassword && result.email) {
                // New user created - log them in with temp password first
                if (process.env.NODE_ENV === 'development') {
                    console.log('New user detected, logging in with temporary password');
                }
                
                try {
                    const { error: signInError } = await supabase.auth.signInWithPassword({
                        email: result.email,
                        password: result.tempPassword
                    });
                    
                    if (signInError) {
                        if (process.env.NODE_ENV === 'development') {
                            console.error('Error signing in:', signInError);
                        }
                        throw signInError;
                    }
                    // Now show the password setup form with the user logged in
                    setStatus('setup_password');
                } catch (err: any) {
                    if (process.env.NODE_ENV === 'development') {
                        console.error('Error logging in new user:', err);
                    }
                    setStatus('error');
                    setMessage(sanitizeAuthError(err));
                }
            } else if (result.needsAuth) {
                // Existing user needs to log in - prefill their email and persist token
                setStatus('needs_login');
                setMessage(`You already have an account! Please log in with ${result.email} to access the workspace.`);
                
                // Store email for prefilling login form
                if (result.email) {
                    sessionStorage.setItem('auth_prefill_email', result.email);
                    sessionStorage.setItem('auth_message', `Logging in to join ${result.workspace_name || 'workspace'}`);
                }
                
                // CRITICAL: Persist the invite token so AcceptInviteNotification can complete acceptance after login
                const { setInvitationToken } = await import('../../lib/utils/tokenStorage');
                setInvitationToken(token);
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
            if (process.env.NODE_ENV === 'development') {
                console.error('Error accepting invitation:', error);
            }
            
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
            
            // Sanitize the error message to remove technical details
            errorMessage = sanitizeAuthError({ message: errorMessage });
            
            setStatus('error');
            setMessage(errorMessage);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-8 max-w-md w-full flex flex-col items-center gap-4">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-4 border-black animate-spin" style={{ animationDuration: '1.2s' }} />
                        <div className="absolute inset-2 border-2 border-gray-400 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
                    </div>
                    <h2 className="text-2xl font-bold">Processing Invitation</h2>
                    <p className="text-gray-600 text-center">{message}</p>
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
                <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="flex justify-center mb-4">
                        <Hand className="w-16 h-16 text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Welcome Back!</h2>
                    <p className="text-gray-600 mb-6">{message}</p>
                    <button
                        onClick={() => {
                            // Clear the inviteToken state so AppRoutes shows LoginForm
                            // Token is already persisted in tokenStorage for post-login acceptance
                            onComplete();
                        }}
                        className="w-full bg-blue-600 text-white rounded-xl border border-blue-700 p-4 font-bold text-lg shadow-sm hover:shadow-md hover:bg-blue-700 transition-all"
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
                <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="flex justify-center mb-4">
                        <CheckCircle className="w-16 h-16 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Success!</h2>
                    <p className="text-gray-600 whitespace-pre-line mb-6">{message}</p>
                    
                    {(inviteData?.isNewUser || inviteData?.passwordResetSent) && (
                        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-4 text-left">
                            <h3 className="font-bold mb-2 flex items-center gap-2"><Mail className="w-5 h-5 text-blue-600" /> Next Steps:</h3>
                            <ol className="list-decimal list-inside space-y-1 text-sm">
                                <li>Check your email inbox</li>
                                <li>Click the password reset link</li>
                                <li>Set your new password</li>
                                <li>Log in and start collaborating!</li>
                            </ol>
                            {inviteData?.passwordResetSent && (
                                <p className="mt-3 text-xs text-blue-700 border-t border-blue-300 pt-2 flex items-start gap-1">
                                    <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" /> We sent you a password reset email to complete your account setup. If you don't receive it within a few minutes, check your spam folder.
                                </p>
                            )}
                        </div>
                    )}
                    
                    <button
                        onClick={() => navigate('/app', { replace: true })}
                        className="w-full bg-green-600 text-white rounded-xl border border-green-700 p-4 font-bold text-lg shadow-sm hover:shadow-md hover:bg-green-700 transition-all"
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
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-8 max-w-md w-full text-center">
                <div className="flex justify-center mb-4">
                    <XCircle className="w-16 h-16 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Oops!</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <button
                    onClick={() => {
                        // Reset state and try again
                        hasAttemptedRef.current = false;
                        acceptInvitation();
                    }}
                    className="w-full bg-blue-600 text-white rounded-xl border border-blue-700 p-4 font-bold text-lg shadow-sm hover:shadow-md hover:bg-blue-700 transition-all mb-3"
                >
                    Try Again →
                </button>
                <button
                    onClick={() => navigate('/', { replace: true })}
                    className="w-full bg-gray-600 text-white rounded-xl border border-gray-700 p-4 font-bold text-lg shadow-sm hover:shadow-md hover:bg-gray-700 transition-all"
                >
                    Go to Home
                </button>
            </div>
        </div>
    );
};
