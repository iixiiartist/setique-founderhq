import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../../lib/services/database';
import { 
    getInvitationToken, 
    setInvitationToken, 
    clearInvitationToken,
    migrateFromLocalStorage 
} from '../../lib/utils/tokenStorage';

interface AcceptInviteNotificationProps {
    onAccepted: () => void;
}

export const AcceptInviteNotification: React.FC<AcceptInviteNotificationProps> = ({ onAccepted }) => {
    const [pendingInvites, setPendingInvites] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [acceptingInviteId, setAcceptingInviteId] = useState<string | null>(null);

    useEffect(() => {
        // Migrate any old tokens from localStorage to sessionStorage
        migrateFromLocalStorage();
        
        loadPendingInvites();
        
        // Check if there's a token in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            handleAcceptInviteFromUrl(token);
        }
        
        // Check if there's a stored token from a previous attempt (user just logged in/signed up)
        const storedToken = getInvitationToken();
        if (storedToken && !token) {
            // Try to accept the stored invitation
            handleAcceptInviteFromUrl(storedToken);
        }
    }, []);

    const loadPendingInvites = async () => {
        setIsLoading(true);
        try {
            const { data } = await DatabaseService.getPendingInvitationsForUser();
            setPendingInvites(data || []);
        } catch (error) {
            console.error('Error loading pending invites:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAcceptInviteFromUrl = async (token: string) => {
        try {
            console.log('[AcceptInvite] Accepting invitation with token:', token);
            const { data, error } = await DatabaseService.acceptWorkspaceInvitation(token);
            
            console.log('[AcceptInvite] Result:', { data, error });
            
            if (error) {
                console.error('[AcceptInvite] Error accepting invitation:', error);
                
                // If invitation is already accepted or expired, silently clean up
                if (error.message?.includes('Invalid or expired invitation') || 
                    error.message?.includes('Already a member')) {
                    console.log('[AcceptInvite] Invitation already processed, cleaning up URL');
                    window.history.replaceState({}, document.title, window.location.pathname);
                    clearInvitationToken();
                    return;
                }
                
                // Check if it's the "different email" error - user might not be logged in yet
                if (error.message?.includes('different email address')) {
                    // Store the token in sessionStorage (expires after 5 minutes)
                    setInvitationToken(token);
                    alert(
                        `⚠️ Please sign up or log in with the email address that received this invitation.\n\n` +
                        `After you log in, the invitation will be automatically accepted.\n\n` +
                        `Note: This link will expire in 5 minutes for security.`
                    );
                } else {
                    alert(`Failed to accept invitation: ${error.message || 'Unknown error'}`);
                }
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }

            if (data?.success) {
                console.log('[AcceptInvite] Successfully accepted invitation!');
                alert(`✅ Successfully joined ${data.workspace_name || 'workspace'}!`);
                // Clean up URL and stored token
                window.history.replaceState({}, document.title, window.location.pathname);
                clearInvitationToken();
                onAccepted();
            } else {
                console.error('[AcceptInvite] Unexpected response:', data);
                alert(`Failed to accept invitation: ${data?.error || 'Unknown error'}`);
            }
        } catch (error: any) {
            console.error('[AcceptInvite] Exception:', error);
            alert(`Failed to accept invitation: ${error.message || 'Unknown error'}`);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    const handleAcceptInvite = async (invitation: any) => {
        if (!confirm(`Do you want to join this workspace as a ${invitation.role}?`)) {
            return;
        }

        setAcceptingInviteId(invitation.id);
        try {
            const { data, error } = await DatabaseService.acceptWorkspaceInvitation(invitation.token);
            
            if (error) {
                throw error;
            }

            if (data?.success) {
                alert(`✅ Successfully joined ${data.workspace_name || 'workspace'}!`);
                setPendingInvites(prev => prev.filter(inv => inv.id !== invitation.id));
                
                onAccepted();
            }
        } catch (error: any) {
            console.error('Error accepting invitation:', error);
            alert(`Failed to accept invitation: ${error.message || 'Unknown error'}`);
        } finally {
            setAcceptingInviteId(null);
        }
    };

    if (isLoading || pendingInvites.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-50 max-w-md">
            <div className="bg-blue-500 border-4 border-black shadow-neo-lg">
                <div className="bg-white border-b-4 border-black p-4">
                    <h3 className="font-bold text-lg">📨 Workspace Invitations</h3>
                </div>
                <div className="p-4 space-y-3">
                    {pendingInvites.map((invite) => (
                        <div key={invite.id} className="bg-white border-2 border-black p-3">
                            <p className="font-mono text-sm font-bold mb-1">
                                Workspace Invitation
                            </p>
                            <p className="text-xs text-gray-600 mb-2">
                                Role: <span className="font-bold">{invite.role.toUpperCase()}</span>
                            </p>
                            <p className="text-xs text-gray-500 mb-3">
                                To: {invite.email}
                            </p>
                            <button
                                onClick={() => handleAcceptInvite(invite)}
                                disabled={acceptingInviteId === invite.id}
                                className="w-full font-mono bg-green-600 border-2 border-black text-white py-2 px-4 font-semibold shadow-neo-btn transition-all hover:bg-green-700 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {acceptingInviteId === invite.id ? 'Accepting...' : 'Accept Invitation'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
