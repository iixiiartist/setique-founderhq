import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Card, CardContent } from '../ui/Card';
import { Select } from '../ui/Select';
import { Form, FormStatus } from '../../types/forms';
import { getWorkspaceForms, deleteForm, duplicateForm, archiveForm, publishForm, unpublishForm, generateEmbedCode, generateShareLinks } from '../../services/formService';
import { formatDistanceToNow } from 'date-fns';

// Form type from database
type FormType = 'form' | 'survey' | 'poll' | 'quiz' | 'feedback';

// Extended Form type with integration fields
interface ExtendedForm extends Form {
  type?: FormType;
  default_campaign_id?: string;
  auto_create_contact?: boolean;
}

interface FormsListProps {
  workspaceId: string;
  onCreateForm: () => void;
  onEditForm: (form: Form) => void;
  onViewAnalytics: (form: Form) => void;
}

// Form type icons
const FORM_TYPE_ICONS: Record<FormType, string> = {
  form: '📝',
  survey: '📊',
  poll: '📈',
  quiz: '❓',
  feedback: '💬',
};

// Form type labels
const FORM_TYPE_LABELS: Record<FormType, string> = {
  form: 'Form',
  survey: 'Survey',
  poll: 'Poll',
  quiz: 'Quiz',
  feedback: 'Feedback',
};

export const FormsList: React.FC<FormsListProps> = ({
  workspaceId,
  onCreateForm,
  onEditForm,
  onViewAnalytics,
}) => {
  const [forms, setForms] = useState<ExtendedForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name' | 'submissions'>('updated');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [shareModalForm, setShareModalForm] = useState<ExtendedForm | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    console.log('[FormsList] workspaceId:', workspaceId);
    if (workspaceId) {
      loadForms();
    } else {
      setLoading(false);
    }
  }, [workspaceId]);

  const loadForms = async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log('[FormsList] Loading forms for workspace:', workspaceId);
    const { data, error } = await getWorkspaceForms(workspaceId);
    console.log('[FormsList] Forms loaded:', { count: data?.length, error });
    if (!error) {
      setForms(data as ExtendedForm[]);
    }
    setLoading(false);
  };

  const handleDelete = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This cannot be undone.')) return;
    
    const { error } = await deleteForm(formId);
    if (!error) {
      setForms(prev => prev.filter(f => f.id !== formId));
    }
    setOpenMenuId(null);
  };

  const handleDuplicate = async (form: ExtendedForm) => {
    const userId = localStorage.getItem('userId') || '';
    if (!workspaceId || !userId) return;
    
    const { data, error } = await duplicateForm(form.id, workspaceId, userId);
    if (!error && data) {
      setForms(prev => [data as ExtendedForm, ...prev]);
    }
    setOpenMenuId(null);
  };

  const handleArchive = async (formId: string) => {
    const { error } = await archiveForm(formId);
    if (!error) {
      setForms(prev => prev.map(f => f.id === formId ? { ...f, status: 'archived' as FormStatus } : f));
    }
    setOpenMenuId(null);
  };

  const handlePublish = async (formId: string) => {
    const { data, error } = await publishForm(formId);
    if (!error && data) {
      setForms(prev => prev.map(f => f.id === formId ? { ...f, status: 'published' as FormStatus, published_at: data.published_at } : f));
    }
    setOpenMenuId(null);
  };

  const handleUnpublish = async (formId: string) => {
    const { error } = await unpublishForm(formId);
    if (!error) {
      setForms(prev => prev.map(f => f.id === formId ? { ...f, status: 'draft' as FormStatus } : f));
    }
    setOpenMenuId(null);
  };

  const handleCopyLink = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getFormUrl = (slug: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/forms/${slug}`;
  };

  // Filter and sort forms
  const filteredForms = forms
    .filter(form => {
      const matchesSearch = form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
      const matchesType = typeFilter === 'all' || (form.type || 'form') === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'submissions':
          return (b.total_submissions || 0) - (a.total_submissions || 0);
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  const getStatusVariant = (status: FormStatus): 'success' | 'warning' | 'default' => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">📝 Forms & Surveys</h2>
          <p className="text-sm text-gray-600">Create and manage forms, surveys, and polls</p>
        </div>
        <Button onClick={onCreateForm} variant="primary">
          + Create New
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            id="forms-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search forms..."
          />
        </div>
        <Select
          id="forms-type-filter"
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'form', label: '📝 Forms' },
            { value: 'survey', label: '📊 Surveys' },
            { value: 'poll', label: '📈 Polls' },
            { value: 'quiz', label: '❓ Quizzes' },
            { value: 'feedback', label: '💬 Feedback' },
          ]}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          fullWidth={false}
        />
        <Select
          id="forms-status-filter"
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
            { value: 'archived', label: 'Archived' },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          fullWidth={false}
        />
        <Select
          id="forms-sort-by"
          options={[
            { value: 'updated', label: 'Last Updated' },
            { value: 'created', label: 'Created Date' },
            { value: 'name', label: 'Name' },
            { value: 'submissions', label: 'Submissions' },
          ]}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          fullWidth={false}
        />
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredForms.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <span className="text-6xl mb-4 block">📋</span>
            <h3 className="text-lg font-bold text-black mb-2">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' ? 'No forms found' : 'No forms yet'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first form to start collecting responses'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={onCreateForm} variant="primary">
                + Create Your First Form
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForms.map(form => {
            const formType = (form.type || 'form') as FormType;
            return (
            <Card
              key={form.id}
              className="relative group cursor-pointer hover:shadow-neo-lg transition-shadow"
              onClick={() => onEditForm(form)}
            >
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Type Badge */}
                    <span className="text-lg" title={FORM_TYPE_LABELS[formType]}>
                      {FORM_TYPE_ICONS[formType]}
                    </span>
                    <Badge variant={getStatusVariant(form.status)} size="sm">
                      {form.status}
                    </Badge>
                    <span className="text-gray-500" title={form.visibility}>
                      {form.visibility === 'public' ? '🌐' : form.visibility === 'private' ? '🔒' : '🔑'}
                    </span>
                    {form.default_campaign_id && (
                      <span className="text-gray-500" title="Linked to campaign">📣</span>
                    )}
                    {form.auto_create_contact && (
                      <span className="text-gray-500" title="Auto-creates contacts">👤</span>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === form.id ? null : form.id);
                      }}
                      className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ⋮
                    </button>
                    {openMenuId === form.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                          }}
                        />
                        <div className="absolute right-0 top-full mt-1 bg-white border-2 border-black shadow-neo z-20 min-w-[180px]">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEditForm(form); setOpenMenuId(null); }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-100 flex items-center gap-2"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onViewAnalytics(form); setOpenMenuId(null); }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-100 flex items-center gap-2"
                          >
                            📊 Analytics
                          </button>
                          
                          <hr className="border-gray-200" />
                          
                          {/* Publish / Unpublish */}
                          {form.status === 'draft' || form.status === 'archived' ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePublish(form.id); }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-green-100 text-green-700 flex items-center gap-2"
                            >
                              🚀 Publish
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUnpublish(form.id); }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-100 flex items-center gap-2"
                            >
                              📝 Unpublish
                            </button>
                          )}
                          
                          {/* Share options - only for published forms */}
                          {form.status === 'published' && form.slug && (
                            <>
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleCopyLink(getFormUrl(form.slug!), 'link');
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-100 flex items-center gap-2"
                              >
                                📋 Copy Link
                              </button>
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setShareModalForm(form);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-100 flex items-center gap-2"
                              >
                                🔗 Share & Embed
                              </button>
                              <a
                                href={getFormUrl(form.slug)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-100 flex items-center gap-2 block"
                              >
                                👁️ View Live
                              </a>
                            </>
                          )}
                          
                          <hr className="border-gray-200" />
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDuplicate(form); }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-100 flex items-center gap-2"
                          >
                            📋 Duplicate
                          </button>
                          {form.status !== 'archived' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleArchive(form.id); }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-100 flex items-center gap-2"
                            >
                              📦 Archive
                            </button>
                          )}
                          <hr className="border-gray-200" />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(form.id); }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-red-100 text-red-600 flex items-center gap-2"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-black mb-1 truncate">{form.name}</h3>
                {form.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{form.description}</p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    📥 {form.total_submissions || 0} responses
                  </div>
                  <div className="flex items-center gap-1">
                    🕐 {formatDistanceToNow(new Date(form.updated_at), { addSuffix: true })}
                  </div>
                </div>

                {/* Preview of theme colors */}
                <div className="mt-4 flex gap-1">
                  <div
                    className="w-6 h-2 border border-gray-300"
                    style={{ backgroundColor: form.theme?.primaryColor || '#8B5CF6' }}
                  />
                  <div
                    className="w-6 h-2 border border-gray-300"
                    style={{ backgroundColor: form.theme?.backgroundColor || '#FFFFFF' }}
                  />
                  <div
                    className="w-6 h-2 border border-gray-300"
                    style={{ backgroundColor: form.theme?.textColor || '#1F2937' }}
                  />
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {forms.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="text-center">
            <CardContent>
              <p className="text-2xl font-bold text-black">{forms.length}</p>
              <p className="text-xs text-gray-600">Total Forms</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {forms.filter(f => f.status === 'published').length}
              </p>
              <p className="text-xs text-gray-600">Published</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">
                {forms.filter(f => f.status === 'draft').length}
              </p>
              <p className="text-xs text-gray-600">Drafts</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">
                {forms.reduce((sum, f) => sum + (f.total_submissions || 0), 0)}
              </p>
              <p className="text-xs text-gray-600">Total Responses</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Share Modal */}
      {shareModalForm && shareModalForm.slug && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShareModalForm(null)}>
          <div 
            className="bg-white border-2 border-black shadow-neo p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">🔗 Share "{shareModalForm.name}"</h3>
              <button 
                onClick={() => setShareModalForm(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                ✕
              </button>
            </div>

            {/* Direct Link */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Direct Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getFormUrl(shareModalForm.slug)}
                    className="flex-1 p-2 border-2 border-gray-300 bg-gray-50 text-sm font-mono"
                  />
                  <Button 
                    variant={copiedText === 'direct' ? 'success' : 'outline'}
                    onClick={() => handleCopyLink(getFormUrl(shareModalForm.slug!), 'direct')}
                  >
                    {copiedText === 'direct' ? '✓ Copied!' : '📋 Copy'}
                  </Button>
                </div>
              </div>

              {/* Embed Options */}
              <div>
                <label className="block text-sm font-semibold mb-2">Embed Code (iFrame)</label>
                <div className="flex gap-2">
                  <textarea
                    readOnly
                    value={generateEmbedCode(shareModalForm.id, shareModalForm.slug, { mode: 'iframe' })}
                    className="flex-1 p-2 border-2 border-gray-300 bg-gray-50 text-xs font-mono resize-none"
                    rows={3}
                  />
                  <Button 
                    variant={copiedText === 'iframe' ? 'success' : 'outline'}
                    onClick={() => handleCopyLink(generateEmbedCode(shareModalForm.id, shareModalForm.slug!, { mode: 'iframe' }), 'iframe')}
                  >
                    {copiedText === 'iframe' ? '✓' : '📋'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Popup Button</label>
                <div className="flex gap-2">
                  <textarea
                    readOnly
                    value={generateEmbedCode(shareModalForm.id, shareModalForm.slug, { mode: 'popup' })}
                    className="flex-1 p-2 border-2 border-gray-300 bg-gray-50 text-xs font-mono resize-none"
                    rows={2}
                  />
                  <Button 
                    variant={copiedText === 'popup' ? 'success' : 'outline'}
                    onClick={() => handleCopyLink(generateEmbedCode(shareModalForm.id, shareModalForm.slug!, { mode: 'popup' }), 'popup')}
                  >
                    {copiedText === 'popup' ? '✓' : '📋'}
                  </Button>
                </div>
              </div>

              {/* Social Share */}
              <div>
                <label className="block text-sm font-semibold mb-2">Share on Social</label>
                <div className="flex gap-2 flex-wrap">
                  {(() => {
                    const links = generateShareLinks(shareModalForm.slug!);
                    return (
                      <>
                        <a
                          href={links.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border-2 border-black hover:bg-blue-100 text-sm font-semibold"
                        >
                          🐦 Twitter
                        </a>
                        <a
                          href={links.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border-2 border-black hover:bg-blue-100 text-sm font-semibold"
                        >
                          💼 LinkedIn
                        </a>
                        <a
                          href={links.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border-2 border-black hover:bg-blue-100 text-sm font-semibold"
                        >
                          📘 Facebook
                        </a>
                        <a
                          href={links.email}
                          className="px-4 py-2 border-2 border-black hover:bg-yellow-100 text-sm font-semibold"
                        >
                          ✉️ Email
                        </a>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* QR Code hint */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  💡 Tip: Use a QR code generator with the direct link for print materials
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <a
                  href={getFormUrl(shareModalForm.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-purple-600 text-white font-semibold border-2 border-black shadow-neo hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                >
                  👁️ Preview Form
                </a>
                <Button variant="outline" onClick={() => setShareModalForm(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy notification toast */}
      {copiedText && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg animate-pulse z-50">
          ✓ Copied to clipboard!
        </div>
      )}
    </div>
  );
};

export default FormsList;
