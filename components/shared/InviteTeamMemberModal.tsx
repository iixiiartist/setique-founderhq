import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { DatabaseService } from '../../lib/services/database';
import { AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';

interface InviteTeamMemberModalProps {
    workspaceId: string;
    workspaceName: string;
    onClose: () => void;
    onInviteSent: () => void;
}

export const InviteTeamMemberModal: React.FC<InviteTeamMemberModalProps> = ({
    workspaceId,
    workspaceName,
    onClose,
    onInviteSent
}) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'member' | 'owner'>('member');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setIsLoading(true);

        try {
            const { data, error: inviteError } = await DatabaseService.createWorkspaceInvitation(
                workspaceId,
                email,
                role,
                true // Send email
            );

            if (inviteError) {
                throw inviteError;
            }

            setSuccess(true);
            
            // Generate invitation link using configured app URL (fallback to window.location.origin for development)
            const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
            const inviteUrl = new URL('/app', appUrl);
            inviteUrl.searchParams.set('token', data.token);
            const inviteLink = inviteUrl.toString();
            
            // Show success message based on whether email was sent
            if (data.emailSent) {
                toast.success(
                    `Invitation sent to ${email}! Link expires in 7 days.`,
                    { duration: 5000 }
                );
            } else {
                toast(
                    `Invitation created! Email service not configured - share this link: ${inviteLink}`,
                    { duration: 8000, icon: '⚡' }
                );
            }

            onInviteSent();
            
            // Reset form
            setEmail('');
            setRole('member');
            
            // Close modal after a short delay
            setTimeout(() => {
                onClose();
            }, 500);
        } catch (err: any) {
            console.error('Error sending invitation:', err);
            setError(err.message || 'Failed to send invitation. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" data-testid="invite-team-modal">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Invite Team Member</h2>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                        disabled={isLoading}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-4">
                        Invite someone to join <span className="font-semibold text-slate-900">{workspaceName}</span>
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Email Address *
                            </label>
                            <input
                                type="email"
                                data-testid="invite-email-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                                placeholder="colleague@example.com"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Role *
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as 'member' | 'owner')}
                                data-testid="invite-role-select"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                                disabled={isLoading}
                            >
                                <option value="member">Member - Can view and edit</option>
                                <option value="owner">Owner - Full access including team management</option>
                            </select>
                        </div>

                        {/* Role Description */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                            <p className="text-xs text-slate-600">
                                {role === 'member' ? (
                                    <>
                                        <span className="font-medium text-slate-900">Members</span> can access all workspace data, tasks, and documents.
                                        They cannot invite or remove team members.
                                    </>
                                ) : (
                                    <>
                                        <span className="font-medium text-slate-900">Owners</span> have full access including the ability to invite
                                        and remove team members, and manage subscription settings.
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <p className="text-sm text-green-700">
                                    Invitation sent successfully!
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                data-testid="invite-cancel-button"
                                className="flex-1 bg-white border border-gray-200 text-slate-700 py-2.5 px-4 rounded-xl font-medium shadow-sm hover:bg-gray-50 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                data-testid="invite-submit-button"
                                className="flex-1 bg-slate-900 text-white py-2.5 px-4 rounded-xl font-medium shadow-sm hover:bg-slate-800 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Sending...' : 'Send Invitation'}
                            </button>
                        </div>
                    </form>

                    {/* Info Note */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-slate-500 flex items-start gap-1">
                            <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" /> The invitation link will expire in 7 days. The invited person must have
                            an account or sign up to accept the invitation.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
