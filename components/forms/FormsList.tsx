import React, { useState, useEffect, useCallback } from 'react';
import { useDebouncedValue, useCopyWithId } from '../../hooks';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Card, CardContent } from '../ui/Card';
import { Select } from '../ui/Select';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { SquareSpinner } from '../shared/Loading';
import { Form, FormStatus } from '../../types/forms';
import { getWorkspaceForms, getWorkspaceFormStats, deleteForm, duplicateForm, archiveForm, publishForm, unpublishForm, generateEmbedCode, generateShareLinks } from '../../src/services/formService';
import { formatDistanceToNow } from 'date-fns';
import { ChevronLeft, ChevronRight, FileText, BarChart2, TrendingUp, HelpCircle, MessageSquare, Globe, Lock, KeyRound, Megaphone, User, MoreVertical, Pencil, BarChart, Rocket, FileEdit, Copy, Link2, ExternalLink, Archive, Trash2, Inbox, Clock, RefreshCw, AlertCircle } from 'lucide-react';

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
const FORM_TYPE_ICONS: Record<FormType, React.ReactNode> = {
  form: <FileText className="w-4 h-4" />,
  survey: <BarChart2 className="w-4 h-4" />,
  poll: <TrendingUp className="w-4 h-4" />,
  quiz: <HelpCircle className="w-4 h-4" />,
  feedback: <MessageSquare className="w-4 h-4" />,
};

// Visibility icons
const VISIBILITY_ICONS: Record<string, React.ReactNode> = {
  public: <Globe className="w-4 h-4 text-slate-500" />,
  private: <Lock className="w-4 h-4 text-slate-500" />,
  link: <KeyRound className="w-4 h-4 text-slate-500" />,
};

// Form type labels
const FORM_TYPE_LABELS: Record<FormType, string> = {
  form: 'Form',
  survey: 'Survey',
  poll: 'Poll',
  quiz: 'Quiz',
  feedback: 'Feedback',
};

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

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
  const { copiedId, copyWithId } = useCopyWithId<string>();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; formId: string | null; formName: string }>({ isOpen: false, formId: null, formName: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Aggregate stats (fetched separately to show correct totals)
  const [aggregateStats, setAggregateStats] = useState<{
    totalPublished: number;
    totalDraft: number;
    totalResponses: number;
  } | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  
  // Use shared debounce hook instead of manual implementation
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), SEARCH_DEBOUNCE_MS);
  
  // Track searching state
  useEffect(() => {
    if (searchQuery.trim() && searchQuery.trim() !== debouncedSearch) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchQuery, debouncedSearch]);
  
  // Reset page when debounced search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter]);

  // Load forms with pagination
  const loadForms = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    console.log('[FormsList] Loading forms for workspace:', workspaceId);
    
    const { data, error: fetchError, totalCount: count } = await getWorkspaceForms(workspaceId, {
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
      status: statusFilter,
      type: typeFilter,
      search: debouncedSearch,
    });
    
    console.log('[FormsList] Forms loaded:', { count: data?.length, totalCount: count, error: fetchError });
    
    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      setIsSearching(false);
      return;
    }
    
    setForms(data as ExtendedForm[]);
    setTotalCount(count || data.length);
    setLoading(false);
    setIsSearching(false);
  }, [workspaceId, currentPage, statusFilter, typeFilter, debouncedSearch]);
  
  // Fetch aggregate stats using efficient count queries (no over-fetching)
  const fetchAggregateStats = useCallback(async () => {
    if (!workspaceId) return;
    
    const { data: stats, error: statsError } = await getWorkspaceFormStats(workspaceId);
    
    if (!statsError && stats) {
      setAggregateStats({
        totalPublished: stats.totalPublished,
        totalDraft: stats.totalDraft,
        totalResponses: stats.totalResponses,
      });
    }
  }, [workspaceId]);

  useEffect(() => {
    console.log('[FormsList] workspaceId:', workspaceId);
    if (workspaceId) {
      loadForms();
      fetchAggregateStats();
    } else {
      setLoading(false);
    }
  }, [workspaceId, loadForms, fetchAggregateStats]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleDelete = async (formId: string) => {
    setIsDeleting(true);
    const { error: deleteError } = await deleteForm(formId);
    if (!deleteError) {
      // Calculate if we need to go back a page (deleted last item on current page)
      const newTotalCount = totalCount - 1;
      const newTotalPages = Math.ceil(newTotalCount / PAGE_SIZE);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
      // Refresh both forms list and aggregate stats
      await Promise.all([loadForms(), fetchAggregateStats()]);
    }
    setIsDeleting(false);
    setDeleteConfirm({ isOpen: false, formId: null, formName: '' });
  };

  const openDeleteConfirm = (form: ExtendedForm) => {
    setDeleteConfirm({ isOpen: true, formId: form.id, formName: form.name });
    setOpenMenuId(null);
  };

  const handleDuplicate = async (form: ExtendedForm) => {
    const userId = localStorage.getItem('userId') || '';
    if (!workspaceId || !userId) return;
    
    const { error: dupError } = await duplicateForm(form.id, workspaceId, userId);
    if (!dupError) {
      // Refresh both forms list and aggregate stats
      await Promise.all([loadForms(), fetchAggregateStats()]);
    }
    setOpenMenuId(null);
  };

  const handleArchive = async (formId: string) => {
    const { error: archiveError } = await archiveForm(formId);
    if (!archiveError) {
      // If filtering by non-archived status, archiving removes item from view
      if (statusFilter !== 'all' && statusFilter !== 'archived') {
        const newTotalCount = totalCount - 1;
        const newTotalPages = Math.ceil(newTotalCount / PAGE_SIZE);
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        }
      }
      // Refresh both forms list and aggregate stats
      await Promise.all([loadForms(), fetchAggregateStats()]);
    }
    setOpenMenuId(null);
  };

  const handlePublish = async (formId: string) => {
    const { error: publishError } = await publishForm(formId);
    if (!publishError) {
      // Refresh both forms list and aggregate stats
      await Promise.all([loadForms(), fetchAggregateStats()]);
    }
    setOpenMenuId(null);
  };

  const handleUnpublish = async (formId: string) => {
    const { error: unpublishError } = await unpublishForm(formId);
    if (!unpublishError) {
      // Refresh both forms list and aggregate stats
      await Promise.all([loadForms(), fetchAggregateStats()]);
    }
    setOpenMenuId(null);
  };

  const handleCopyLink = async (text: string, label: string) => {
    await copyWithId(label, text);
  };

  const getFormUrl = (slug: string) => {
    // Use configured APP_URL for consistent URLs across environments (SSR, Electron, etc.)
    const baseUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://founderhq.setique.com');
    return `${baseUrl}/forms/${slug}`;
  };

  // Client-side sort (server handles filter/search, we sort locally for flexibility)
  const sortedForms = [...forms].sort((a, b) => {
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
          <h2 className="text-2xl font-bold text-black flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Forms & Surveys
          </h2>
          <p className="text-sm text-gray-600">Create and manage forms, surveys, and polls</p>
        </div>
        <Button onClick={onCreateForm} variant="primary">
          + Create New
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Input
            id="forms-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search forms..."
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <SquareSpinner size="xs" />
            </div>
          )}
        </div>
        <Select
          id="forms-type-filter"
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'form', label: 'Forms' },
            { value: 'survey', label: 'Surveys' },
            { value: 'poll', label: 'Polls' },
            { value: 'quiz', label: 'Quizzes' },
            { value: 'feedback', label: 'Feedback' },
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

      {/* Error State */}
      {error && !loading && (
        <Card>
          <div className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-bold text-black mb-2">
              Failed to load forms
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {error}
            </p>
            <Button onClick={loadForms} variant="primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </Card>
      )}

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
      ) : error ? null : sortedForms.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <Inbox className="w-16 h-16 mx-auto mb-4 text-gray-400" />
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
          {sortedForms.map(form => {
            const formType = (form.type || 'form') as FormType;
            return (
            <Card
              key={form.id}
              className="relative group cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onEditForm(form)}
            >
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Type Badge */}
                    <span className="text-slate-600" title={FORM_TYPE_LABELS[formType]}>
                      {FORM_TYPE_ICONS[formType]}
                    </span>
                    <Badge variant={getStatusVariant(form.status)} size="sm">
                      {form.status}
                    </Badge>
                    <span title={form.visibility}>
                      {VISIBILITY_ICONS[form.visibility] || VISIBILITY_ICONS.link}
                    </span>
                    {form.default_campaign_id && (
                      <span title="Linked to campaign">
                        <Megaphone className="w-4 h-4 text-slate-500" />
                      </span>
                    )}
                    {form.auto_create_contact && (
                      <span title="Auto-creates contacts">
                        <User className="w-4 h-4 text-slate-500" />
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === form.id ? null : form.id);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                      title="Options"
                    >
                      <MoreVertical className="w-4 h-4" />
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
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-20 min-w-[180px] overflow-hidden">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEditForm(form); setOpenMenuId(null); }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onViewAnalytics(form); setOpenMenuId(null); }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
                          >
                            <BarChart className="w-4 h-4" /> Analytics
                          </button>
                          
                          <hr className="border-slate-200" />
                          
                          {/* Publish / Unpublish */}
                          {form.status === 'draft' || form.status === 'archived' ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePublish(form.id); }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 text-green-700 flex items-center gap-2"
                            >
                              <Rocket className="w-4 h-4" /> Publish
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUnpublish(form.id); }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
                            >
                              <FileEdit className="w-4 h-4" /> Unpublish
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
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
                              >
                                <Copy className="w-4 h-4" /> Copy Link
                              </button>
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setShareModalForm(form);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
                              >
                                <Link2 className="w-4 h-4" /> Share & Embed
                              </button>
                              <a
                                href={getFormUrl(form.slug)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2 block"
                              >
                                <ExternalLink className="w-4 h-4" /> View Live
                              </a>
                            </>
                          )}
                          
                          <hr className="border-slate-200" />
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDuplicate(form); }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
                          >
                            <Copy className="w-4 h-4" /> Duplicate
                          </button>
                          {form.status !== 'archived' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleArchive(form.id); }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
                            >
                              <Archive className="w-4 h-4" /> Archive
                            </button>
                          )}
                          <hr className="border-slate-200" />
                          <button
                            onClick={(e) => { e.stopPropagation(); openDeleteConfirm(form); }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
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

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Inbox className="w-3 h-3" /> {form.total_submissions || 0} responses
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(form.updated_at), { addSuffix: true })}
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
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} forms
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    disabled={loading}
                    className={`w-8 h-8 text-sm font-semibold border-2 ${
                      currentPage === pageNum
                        ? 'bg-yellow-400 border-black'
                        : 'border-gray-300 hover:border-black hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Stats - Use aggregate stats for accurate totals across all pages */}
      {(forms.length > 0 || aggregateStats) && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="text-center">
            <CardContent>
              <p className="text-2xl font-bold text-black">{totalCount}</p>
              <p className="text-xs text-gray-600">Total Forms</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {aggregateStats?.totalPublished ?? forms.filter(f => f.status === 'published').length}
              </p>
              <p className="text-xs text-gray-600">Published</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">
                {aggregateStats?.totalDraft ?? forms.filter(f => f.status === 'draft').length}
              </p>
              <p className="text-xs text-gray-600">Drafts</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">
                {aggregateStats?.totalResponses ?? forms.reduce((sum, f) => sum + (f.total_submissions || 0), 0)}
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
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Share "{shareModalForm.name}"
              </h3>
              <button 
                onClick={() => setShareModalForm(null)}
                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <span className="text-xl font-bold">&times;</span>
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
                    variant={copiedId === 'direct' ? 'success' : 'outline'}
                    onClick={() => handleCopyLink(getFormUrl(shareModalForm.slug!), 'direct')}
                  >
                    {copiedId === 'direct' ? 'Copied!' : 'Copy'}
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
                    variant={copiedId === 'iframe' ? 'success' : 'outline'}
                    onClick={() => handleCopyLink(generateEmbedCode(shareModalForm.id, shareModalForm.slug!, { mode: 'iframe' }), 'iframe')}
                  >
                    {copiedId === 'iframe' ? 'Copied!' : 'Copy'}
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
                    variant={copiedId === 'popup' ? 'success' : 'outline'}
                    onClick={() => handleCopyLink(generateEmbedCode(shareModalForm.id, shareModalForm.slug!, { mode: 'popup' }), 'popup')}
                  >
                    {copiedId === 'popup' ? 'Copied!' : 'Copy'}
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
                          className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-blue-50 text-sm font-medium transition-colors"
                        >
                          Twitter
                        </a>
                        <a
                          href={links.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-blue-50 text-sm font-medium transition-colors"
                        >
                          LinkedIn
                        </a>
                        <a
                          href={links.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-blue-50 text-sm font-medium transition-colors"
                        >
                          Facebook
                        </a>
                        <a
                          href={links.email}
                          className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-yellow-50 text-sm font-medium transition-colors"
                        >
                          Email
                        </a>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* QR Code hint */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Tip: Use a QR code generator with the direct link for print materials
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <a
                  href={getFormUrl(shareModalForm.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 hover:shadow-md transition-all flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Preview Form
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
      {copiedId && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg animate-pulse z-50">
          Copied to clipboard!
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, formId: null, formName: '' })}
        onConfirm={() => deleteConfirm.formId && handleDelete(deleteConfirm.formId)}
        title="Delete Form"
        message={`Are you sure you want to delete "${deleteConfirm.formName}"? This will permanently remove the form and all its submissions. This action cannot be undone.`}
        confirmLabel="Delete Form"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default FormsList;
