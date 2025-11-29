import React, { useEffect, useState } from 'react';
import { FileText, Mail, ExternalLink, Trash2, Loader2, FolderOpen, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { showError, showSuccess } from '../../lib/utils/toast';

interface LinkedDocument {
  id: string;
  name: string;
  mime_type: string;
  created_at: string;
  notes: any;
  content?: string;
}

interface LinkedDocumentsSectionProps {
  companyId: string;
  contactId?: string;
  onOpenDocument?: (doc: LinkedDocument) => void;
}

export const LinkedDocumentsSection: React.FC<LinkedDocumentsSectionProps> = ({
  companyId,
  contactId,
  onOpenDocument
}) => {
  const { workspace } = useWorkspace();
  const [documents, setDocuments] = useState<LinkedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState<LinkedDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchLinkedDocuments();
  }, [companyId, contactId, workspace?.id]);

  const fetchLinkedDocuments = async () => {
    if (!workspace?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('documents')
        .select('id, name, mime_type, created_at, notes')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false });

      // Filter by company_id and optionally contact_id
      if (contactId) {
        query = query.eq('contact_id', contactId);
      } else {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('[LinkedDocumentsSection] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Remove this linked document?')) return;
    
    setDeletingId(docId);
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;
      
      setDocuments(prev => prev.filter(d => d.id !== docId));
      showSuccess('Document removed');
    } catch (err: any) {
      console.error('[LinkedDocumentsSection] Delete error:', err);
      showError(`Failed to remove: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewDocument = async (doc: LinkedDocument) => {
    try {
      // Fetch the full content
      const { data, error } = await supabase
        .from('documents')
        .select('content')
        .eq('id', doc.id)
        .single();

      if (error) throw error;
      
      setViewingDoc({ ...doc, content: data.content });
    } catch (err: any) {
      console.error('[LinkedDocumentsSection] View error:', err);
      showError('Failed to load document');
    }
  };

  const getDocumentIcon = (mimeType: string, notes: any) => {
    // Check if it's a saved email
    if (notes?.source === 'email_snapshot') {
      return <Mail className="w-4 h-4 text-blue-500" />;
    }
    if (mimeType.includes('html')) {
      return <FileText className="w-4 h-4 text-orange-500" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="w-4 h-4 text-red-500" />;
    }
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSourceBadge = (notes: any) => {
    if (notes?.source === 'email_snapshot') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded">
          <Mail className="w-2.5 h-2.5" />
          Email
        </span>
      );
    }
    if (notes?.source === 'research_agent') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-medium rounded">
          Research
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Linked Documents</h2>
        </div>
        <div className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-gray-500" />
            Linked Documents ({documents.length})
          </h2>
        </div>
        <div className="p-5">
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No documents linked yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Save emails or upload files to link them here
              </p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {documents.map((doc) => (
                <li 
                  key={doc.id} 
                  className="group flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getDocumentIcon(doc.mime_type, doc.notes)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {doc.name}
                        </span>
                        {getSourceBadge(doc.notes)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatDate(doc.created_at)}
                        {doc.notes?.from_address && (
                          <span className="ml-2">• From: {doc.notes.from_address.replace(/<.*>/, '').trim()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleViewDocument(doc)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="View document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      disabled={deletingId === doc.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      title="Remove link"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {getDocumentIcon(viewingDoc.mime_type, viewingDoc.notes)}
                <span className="font-medium text-gray-900 truncate">{viewingDoc.name}</span>
                {getSourceBadge(viewingDoc.notes)}
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {viewingDoc.mime_type.includes('html') && viewingDoc.content ? (
                <iframe
                  srcDoc={decodeURIComponent(escape(atob(viewingDoc.content)))}
                  className="w-full h-full min-h-[600px]"
                  sandbox="allow-same-origin"
                  title="Document Preview"
                />
              ) : (
                <div className="p-6 text-gray-500 text-center">
                  <p>Preview not available for this file type</p>
                  <p className="text-sm mt-1">MIME type: {viewingDoc.mime_type}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LinkedDocumentsSection;
