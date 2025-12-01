// Admin tab types and interfaces

export interface UserSignup {
    id: string;
    email: string;
    fullName: string;
    createdAt: string;
    emailConfirmed: boolean;
    planType: string;
    workspaceId: string;
    workspaceName: string;
    lastSignIn: string | null;
    isAdmin: boolean;
}

export type PlanType = 'free' | 'team-pro';

export interface SignupStats {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    confirmed: number;
    unconfirmed: number;
    freePlan: number;
    paidPlan: number;
}

// Calculate stats from users array
export function calculateStats(users: UserSignup[]): SignupStats {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    return {
        total: users.length,
        today: users.filter(u => new Date(u.createdAt) >= today).length,
        thisWeek: users.filter(u => new Date(u.createdAt) >= weekAgo).length,
        thisMonth: users.filter(u => new Date(u.createdAt) >= monthAgo).length,
        confirmed: users.filter(u => u.emailConfirmed).length,
        unconfirmed: users.filter(u => !u.emailConfirmed).length,
        freePlan: users.filter(u => u.planType === 'free').length,
        paidPlan: users.filter(u => u.planType !== 'free').length
    };
}

// Format date for display
export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Get time since date
export function getTimeSince(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return formatDate(dateString);
}
