import React from 'react';
import { WorkspaceMember } from '../../types';

interface TeamSectionProps {
    workspaceName: string;
    planType: string;
    members: WorkspaceMember[];
    pendingInvitations: any[];
    currentUserEmail: string | undefined;
    currentUserId: string | undefined;
    workspaceOwnerId: string | undefined;
    isLoadingMembers: boolean;
    isLoadingInvitations: boolean;
    onInviteClick: () => void;
    onRemoveMember: (memberId: string, email: string, role: string) => void;
    onRevokeInvitation: (invitationId: string) => void;
}

export function TeamSection({
    workspaceName,
    planType,
    members,
    pendingInvitations,
    currentUserEmail,
    currentUserId,
    workspaceOwnerId,
    isLoadingMembers,
    isLoadingInvitations,
    onInviteClick,
    onRemoveMember,
    onRevokeInvitation
}: TeamSectionProps) {
    const isCurrentUserOwner = currentUserId === workspaceOwnerId;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-bold text-black mb-2">Workspace: {workspaceName}</h3>
                <p className="text-sm text-gray-600">
                    Plan: <span className="font-mono font-semibold">{planType}</span>
                </p>
            </div>

            <div>
                <h4 className="font-bold text-black mb-3">Team Members ({members.length})</h4>
                {isLoadingMembers ? (
                    <p className="text-sm text-gray-600">Loading team members...</p>
                ) : members.length > 0 ? (
                    <div className="space-y-2">
                        {members.map((member: any) => {
                            const isCurrentUser = member.email === currentUserEmail;
                            const displayName = member.fullName || member.email || `User (${member.userId.substring(0, 8)}...)`;
                            const displayEmail = member.email || 'No email found';
                            
                            return (
                                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                                    <div className="flex-1">
                                        <p className="font-mono text-sm font-semibold">
                                            {displayName}
                                            {isCurrentUser && <span className="ml-2 text-xs text-blue-600">(You)</span>}
                                            {!member.fullName && !member.email && <span className="ml-2 text-xs text-orange-600">(Profile missing)</span>}
                                        </p>
                                        <p className="text-xs text-gray-600">{displayEmail}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 text-xs font-bold border border-gray-300 bg-white rounded">
                                            {member.role.toUpperCase()}
                                        </span>
                                        {!isCurrentUser && isCurrentUserOwner && (
                                            <button
                                                onClick={() => onRemoveMember(member.id, member.email, member.role)}
                                                className="px-3 py-1 text-xs font-bold border border-gray-300 bg-red-500 text-white hover:bg-red-600 transition-colors rounded"
                                                title={`Remove ${member.email}`}
                                                disabled={member.role === 'owner'}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-gray-600">You are the only member of this workspace.</p>
                )}
            </div>

            {pendingInvitations.length > 0 && (
                <div>
                    <h4 className="font-bold text-black mb-3">Pending Invitations ({pendingInvitations.length})</h4>
                    {isLoadingInvitations ? (
                        <p className="text-sm text-gray-600">Loading invitations...</p>
                    ) : (
                        <div className="space-y-2">
                            {pendingInvitations.map((invitation: any) => (
                                <div key={invitation.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                                    <div className="flex-1">
                                        <p className="font-mono text-sm font-semibold">{invitation.email}</p>
                                        <p className="text-xs text-gray-600">
                                            Invited {new Date(invitation.created_at).toLocaleDateString()} • 
                                            Expires {new Date(invitation.expires_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 text-xs font-bold border border-gray-300 bg-white rounded">
                                            {invitation.role.toUpperCase()}
                                        </span>
                                        <button
                                            onClick={() => onRevokeInvitation(invitation.id)}
                                            className="px-3 py-1 text-xs font-bold border border-gray-300 bg-red-500 text-white hover:bg-red-600 rounded"
                                            title="Revoke invitation"
                                        >
                                            Revoke
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div>
                <button
                    onClick={onInviteClick}
                    className="font-mono bg-green-600 border border-gray-300 text-white cursor-pointer py-2 px-6 rounded-md font-semibold transition-colors hover:bg-green-700"
                    data-testid="open-invite-team-modal"
                >
                    + Invite Team Member
                </button>
            </div>
        </div>
    );
}
