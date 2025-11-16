import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    getDocumentVersions,
    restoreDocumentVersion,
    compareVersions,
    DocumentVersion,
    VersionDiff,
} from '../../lib/services/documentVersionService';
import { Clock, RotateCcw, Eye, X, ChevronRight } from 'lucide-react';

interface DocumentVersionHistoryProps {
    documentId: string;
    currentContent: string;
    onRestore: (version: DocumentVersion) => void;
}

const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
    documentId,
    currentContent,
    onRestore,
}) => {
    const { user } = useAuth();
    const [versions, setVersions] = useState<DocumentVersion[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
    const [comparisonDiff, setComparisonDiff] = useState<VersionDiff | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadVersions();
    }, [documentId]);

    const loadVersions = async () => {
        setLoading(true);
        const result = await getDocumentVersions(documentId);
        if (result.success && result.versions) {
            setVersions(result.versions);
        }
        setLoading(false);
    };

    const handleVersionSelect = (version: DocumentVersion) => {
        setSelectedVersion(version);
        // Compare selected version with current content
        const diff = compareVersions(version.content, currentContent);
        setComparisonDiff(diff);
    };

    const handleRestore = async () => {
        if (!selectedVersion || !user) return;

        if (!confirm(`Restore document to version ${selectedVersion.version_number}? This will create a new version with the restored content.`)) {
            return;
        }

        const result = await restoreDocumentVersion(
            documentId,
            selectedVersion.id,
            user.id,
            user.email?.split('@')[0] || 'Anonymous'
        );

        if (result.success && result.restoredVersion) {
            onRestore(result.restoredVersion);
            setSelectedVersion(null);
            loadVersions(); // Reload versions list
        } else {
            alert(`Failed to restore version: ${result.error}`);
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTimeAgo = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return formatTimestamp(timestamp);
    };

    if (loading) {
        return (
            <div className="bg-white p-6 border-2 border-black shadow-neo">
                <div className="flex items-center justify-center py-8">
                    <div className="font-mono text-sm text-gray-500">Loading version history...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border-2 border-black shadow-neo">
            {/* Header */}
            <div className="p-4 bg-black text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock size={20} />
                    <h3 className="font-mono font-bold text-lg">Version History</h3>
                    <span className="px-2 py-1 bg-white text-black text-xs font-mono font-bold rounded">
                        {versions.length}
                    </span>
                </div>
            </div>

            <div className="flex" style={{ height: '600px' }}>
                {/* Versions list */}
                <div className="w-1/3 border-r-2 border-black overflow-y-auto">
                    {versions.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 font-mono text-sm">
                            No versions yet
                        </div>
                    ) : (
                        <div className="divide-y-2 divide-gray-200">
                            {versions.map((version) => (
                                <button
                                    key={version.id}
                                    onClick={() => handleVersionSelect(version)}
                                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                                        selectedVersion?.id === version.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-1 bg-black text-white text-xs font-mono font-bold rounded">
                                                v{version.version_number}
                                            </span>
                                            {version.change_summary?.includes('Auto-saved') && (
                                                <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-mono rounded">
                                                    Auto
                                                </span>
                                            )}
                                            {version.change_summary?.includes('Restored') && (
                                                <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-mono rounded">
                                                    Restored
                                                </span>
                                            )}
                                        </div>
                                        <ChevronRight size={16} className={selectedVersion?.id === version.id ? 'text-blue-600' : 'text-gray-400'} />
                                    </div>
                                    
                                    <div className="font-mono font-semibold text-sm text-gray-900 mb-1">
                                        {version.title}
                                    </div>
                                    
                                    {version.change_summary && (
                                        <div className="font-mono text-xs text-gray-600 mb-2">
                                            {version.change_summary}
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                                        <span>{version.created_by_name}</span>
                                        <span>•</span>
                                        <span>{getTimeAgo(version.created_at)}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Version details / comparison */}
                <div className="flex-1 overflow-y-auto">
                    {selectedVersion ? (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-mono font-bold text-xl">
                                            Version {selectedVersion.version_number}
                                        </h4>
                                        <button
                                            onClick={handleRestore}
                                            className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white font-mono text-sm font-semibold border-2 border-black hover:bg-green-700"
                                        >
                                            <RotateCcw size={14} />
                                            Restore
                                        </button>
                                    </div>
                                    <div className="font-mono text-sm text-gray-600">
                                        {formatTimestamp(selectedVersion.created_at)} by {selectedVersion.created_by_name}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedVersion(null)}
                                    className="p-2 hover:bg-gray-100 rounded"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {selectedVersion.change_summary && (
                                <div className="mb-4 p-3 bg-gray-50 border-2 border-gray-300 rounded">
                                    <div className="font-mono text-xs font-semibold text-gray-700 mb-1">
                                        Change Summary
                                    </div>
                                    <div className="font-mono text-sm text-gray-900">
                                        {selectedVersion.change_summary}
                                    </div>
                                </div>
                            )}

                            {comparisonDiff && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-4 mb-3">
                                        <span className="font-mono text-sm font-semibold text-gray-700">
                                            Changes vs. Current
                                        </span>
                                        <div className="flex items-center gap-3 text-xs font-mono">
                                            <span className="text-green-600 font-semibold">
                                                +{comparisonDiff.additions} additions
                                            </span>
                                            <span className="text-red-600 font-semibold">
                                                -{comparisonDiff.deletions} deletions
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {comparisonDiff.changes.length > 0 && (
                                        <div className="border-2 border-gray-300 rounded max-h-48 overflow-y-auto">
                                            {comparisonDiff.changes.slice(0, 20).map((change, index) => (
                                                <div
                                                    key={index}
                                                    className={`px-3 py-1 font-mono text-xs border-b border-gray-200 ${
                                                        change.type === 'add'
                                                            ? 'bg-green-50 text-green-900'
                                                            : change.type === 'remove'
                                                            ? 'bg-red-50 text-red-900'
                                                            : 'bg-yellow-50 text-yellow-900'
                                                    }`}
                                                >
                                                    <span className="text-gray-500 mr-2">Line {change.line}:</span>
                                                    <span className="font-semibold mr-1">
                                                        {change.type === 'add' ? '+' : change.type === 'remove' ? '-' : '~'}
                                                    </span>
                                                    {change.content}
                                                </div>
                                            ))}
                                            {comparisonDiff.changes.length > 20 && (
                                                <div className="px-3 py-2 bg-gray-100 text-center text-xs font-mono text-gray-600">
                                                    +{comparisonDiff.changes.length - 20} more changes
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Version content preview */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Eye size={16} className="text-gray-700" />
                                    <span className="font-mono text-sm font-semibold text-gray-700">
                                        Version Content
                                    </span>
                                </div>
                                <div className="border-2 border-gray-300 rounded p-4 bg-gray-50 max-h-96 overflow-y-auto">
                                    <pre className="font-mono text-sm text-gray-900 whitespace-pre-wrap">
                                        {selectedVersion.content}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full p-8 text-center">
                            <div>
                                <Clock size={48} className="mx-auto mb-4 text-gray-300" />
                                <p className="font-mono text-sm text-gray-500">
                                    Select a version to view details and restore
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentVersionHistory;
