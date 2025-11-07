import React, { useState } from 'react';
import { DatabaseService } from '../../lib/services/database';

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
            
            // Generate invitation link
            const inviteLink = `${window.location.origin}?token=${data.token}`;
            
            // Show success message based on whether email was sent
            if (data.emailSent) {
                alert(
                    `✅ Invitation sent successfully!\n\n` +
                    `An email has been sent to ${email} with an invitation link.\n\n` +
                    `You can also share this link directly:\n${inviteLink}\n\n` +
                    `This link will expire in 7 days.`
                );
            } else {
                alert(
                    `✅ Invitation created!\n\n` +
                    `⚠️ Email service is not configured yet.\n\n` +
                    `Please share this link with ${email}:\n${inviteLink}\n\n` +
                    `This link will expire in 7 days.\n\n` +
                    `To enable automatic emails, follow the setup guide in EMAIL_SETUP.md`
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
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
            <div className="bg-white border-4 border-black shadow-neo-lg max-w-md w-full">
                {/* Header */}
                <div className="bg-blue-500 border-b-4 border-black p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Invite Team Member</h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-black transition-colors text-2xl font-bold leading-none"
                        disabled={isLoading}
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">
                        Invite someone to join <span className="font-bold">{workspaceName}</span>
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Input */}
                        <div>
                            <label className="block font-mono font-bold text-sm mb-2">
                                Email Address *
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 border-2 border-black font-mono"
                                placeholder="colleague@example.com"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {/* Role Selection */}
                        <div>
                            <label className="block font-mono font-bold text-sm mb-2">
                                Role *
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as 'member' | 'owner')}
                                className="w-full px-4 py-2 border-2 border-black font-mono bg-white"
                                disabled={isLoading}
                            >
                                <option value="member">Member - Can view and edit</option>
                                <option value="owner">Owner - Full access including team management</option>
                            </select>
                        </div>

                        {/* Role Description */}
                        <div className="bg-gray-50 border-2 border-gray-200 p-3">
                            <p className="text-xs text-gray-600">
                                {role === 'member' ? (
                                    <>
                                        <strong>Members</strong> can access all workspace data, tasks, and documents.
                                        They cannot invite or remove team members.
                                    </>
                                ) : (
                                    <>
                                        <strong>Owners</strong> have full access including the ability to invite
                                        and remove team members, and manage subscription settings.
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border-2 border-red-500 p-3">
                                <p className="text-sm text-red-700 font-mono">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="bg-green-50 border-2 border-green-500 p-3">
                                <p className="text-sm text-green-700 font-mono">
                                    ✅ Invitation sent successfully!
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 font-mono bg-gray-200 border-2 border-black text-black py-2 px-4 font-semibold shadow-neo-btn transition-all hover:bg-gray-300 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 font-mono bg-blue-600 border-2 border-black text-white py-2 px-4 font-semibold shadow-neo-btn transition-all hover:bg-blue-700 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Sending...' : 'Send Invitation'}
                            </button>
                        </div>
                    </form>

                    {/* Info Note */}
                    <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-300">
                        <p className="text-xs text-gray-500">
                            💡 The invitation link will expire in 7 days. The invited person must have
                            an account or sign up to accept the invitation.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
