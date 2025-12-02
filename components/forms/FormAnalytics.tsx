import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Form, FormSubmission, FormAnalyticsSummary, FormField, FORM_FIELD_TYPES } from '../../types/forms';
import { getFormAnalytics, getFormSubmissions, getForm } from '../../services/formService';
import { formatDistanceToNow, format } from 'date-fns';

interface FormAnalyticsProps {
  form: Form;
  onBack: () => void;
}

// Helper to get field type icon
const getFieldTypeIcon = (type: string): string => {
  const fieldType = FORM_FIELD_TYPES.find(ft => ft.type === type);
  return fieldType?.icon || '📝';
};

// Helper to format field values for display
const formatFieldValue = (value: any, fieldType?: string): string => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    // Handle address or other complex objects
    if (value.street || value.city || value.state) {
      return [value.street, value.city, value.state, value.zip, value.country]
        .filter(Boolean)
        .join(', ');
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  // Handle rating/NPS display
  if (fieldType === 'rating') {
    return '⭐'.repeat(Number(value)) || String(value);
  }
  if (fieldType === 'nps') {
    const score = Number(value);
    const emoji = score >= 9 ? '😊' : score >= 7 ? '😐' : '😞';
    return `${emoji} ${value}/10`;
  }
  return String(value);
};

export const FormAnalytics: React.FC<FormAnalyticsProps> = ({ form, onBack }) => {
  const [analytics, setAnalytics] = useState<FormAnalyticsSummary | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'responses' | 'sources'>('overview');
  const [submissionsPage, setSubmissionsPage] = useState(0);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const pageSize = 10;

  // Create a mapping from field ID to field details
  const fieldMap = useMemo(() => {
    const map: Record<string, { label: string; type: string }> = {};
    formFields.forEach(field => {
      map[field.id] = { label: field.label, type: field.type };
    });
    return map;
  }, [formFields]);

  useEffect(() => {
    loadData();
  }, [form.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch form with fields if not already present
      let fields = form.fields || [];
      if (!fields.length) {
        const { data: fullForm } = await getForm(form.id);
        if (fullForm?.fields) {
          fields = fullForm.fields;
        }
      }
      setFormFields(fields);

      const [analyticsResult, submissionsResult] = await Promise.all([
        getFormAnalytics(form.id),
        getFormSubmissions(form.id, { limit: pageSize, offset: 0 }),
      ]);

      if (analyticsResult.data) {
        setAnalytics(analyticsResult.data);
      }
      if (!submissionsResult.error) {
        setSubmissions(submissionsResult.data);
        setTotalSubmissions(submissionsResult.total);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreSubmissions = async () => {
    const nextPage = submissionsPage + 1;
    const { data, error } = await getFormSubmissions(form.id, {
      limit: pageSize,
      offset: nextPage * pageSize,
    });
    if (!error && data) {
      setSubmissions(prev => [...prev, ...data]);
      setSubmissionsPage(nextPage);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl mx-4">
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onBack}>
      <div 
        className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between bg-gray-50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold">📊 Analytics: {form.name}</h2>
            <p className="text-sm text-gray-600">
              {form.status === 'published' ? '🟢 Published' : '📝 Draft'} • 
              Created {formatDistanceToNow(new Date(form.created_at), { addSuffix: true })}
            </p>
          </div>
          <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded">✕</button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex">
          {(['overview', 'responses', 'sources'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium capitalize transition-colors ${
                activeTab === tab 
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              {tab === 'overview' ? '📈 Overview' : tab === 'responses' ? '📥 Responses' : '🔗 Sources'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="text-center py-4">
                    <p className="text-3xl font-bold text-blue-600">{analytics?.total_views || 0}</p>
                    <p className="text-sm text-gray-600">👁️ Views</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="text-center py-4">
                    <p className="text-3xl font-bold text-purple-600">{analytics?.total_starts || 0}</p>
                    <p className="text-sm text-gray-600">✏️ Started</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="text-center py-4">
                    <p className="text-3xl font-bold text-green-600">{analytics?.total_submissions || form.total_submissions || 0}</p>
                    <p className="text-sm text-gray-600">✅ Completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="text-center py-4">
                    <p className="text-3xl font-bold text-yellow-600">
                      {analytics?.conversion_rate?.toFixed(1) || 0}%
                    </p>
                    <p className="text-sm text-gray-600">📊 Conversion</p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>⏱️ Completion Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {analytics?.average_completion_time 
                        ? `${Math.floor(analytics.average_completion_time / 60)}m ${analytics.average_completion_time % 60}s`
                        : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">Average time to complete</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>📉 Abandonment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-600">{analytics?.total_abandons || 0}</p>
                    <p className="text-sm text-gray-500">Users who started but didn't complete</p>
                  </CardContent>
                </Card>
              </div>

              {/* Empty State */}
              {(analytics?.total_views || 0) === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <span className="text-6xl mb-4 block">📭</span>
                    <h3 className="text-lg font-bold mb-2">No data yet</h3>
                    <p className="text-gray-600 mb-4">
                      Share your form to start collecting responses and analytics.
                    </p>
                    {form.status !== 'published' && (
                      <Badge variant="warning">Form is not published</Badge>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'responses' && (
            <div className="space-y-4">
              {submissions.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <span className="text-6xl mb-4 block">📥</span>
                    <h3 className="text-lg font-bold mb-2">No responses yet</h3>
                    <p className="text-gray-600">
                      Responses will appear here once people submit the form.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 font-medium">{totalSubmissions} total responses</p>
                    {formFields.length > 0 && (
                      <p className="text-xs text-gray-400">{formFields.filter(f => !['heading', 'paragraph', 'divider', 'image'].includes(f.type)).length} questions</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    {submissions.map((submission, index) => {
                      const isExpanded = expandedSubmission === submission.id;
                      const responseData = submission.data || {};
                      const responseEntries = Object.entries(responseData);
                      
                      // Sort entries by field position if we have field info
                      const sortedEntries = responseEntries.sort((a, b) => {
                        const fieldA = formFields.find(f => f.id === a[0]);
                        const fieldB = formFields.find(f => f.id === b[0]);
                        return (fieldA?.position || 999) - (fieldB?.position || 999);
                      });
                      
                      return (
                        <Card 
                          key={submission.id} 
                          className={`hover:shadow-md transition-all cursor-pointer ${isExpanded ? 'ring-2 ring-blue-500' : ''}`}
                          onClick={() => setExpandedSubmission(isExpanded ? null : submission.id)}
                        >
                          <CardContent className="py-4">
                            {/* Response Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Badge variant="default" size="sm" className="bg-purple-100 text-purple-700">
                                  #{totalSubmissions - index}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                  {format(new Date(submission.created_at), 'MMM d, yyyy')}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {format(new Date(submission.created_at), 'h:mm a')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {submission.completion_time_seconds && (
                                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                    ⏱️ {Math.floor(submission.completion_time_seconds / 60)}m {submission.completion_time_seconds % 60}s
                                  </span>
                                )}
                                <span className="text-xs text-gray-400">
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                              </div>
                            </div>
                            
                            {/* Response Preview (collapsed) */}
                            {!isExpanded && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {sortedEntries.slice(0, 4).map(([fieldId, value]) => {
                                  const fieldInfo = fieldMap[fieldId];
                                  const label = fieldInfo?.label || fieldId;
                                  const displayValue = formatFieldValue(value, fieldInfo?.type);
                                  
                                  return (
                                    <div key={fieldId} className="text-sm truncate">
                                      <span className="text-gray-500 font-medium">{label}:</span>{' '}
                                      <span className="text-gray-800">{displayValue}</span>
                                    </div>
                                  );
                                })}
                                {sortedEntries.length > 4 && (
                                  <span className="text-gray-400 text-xs col-span-2">
                                    +{sortedEntries.length - 4} more answers • Click to expand
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Full Response (expanded) */}
                            {isExpanded && (
                              <div className="space-y-4 mt-2">
                                <div className="border-t pt-4">
                                  {sortedEntries.length === 0 ? (
                                    <p className="text-gray-500 text-sm italic">No response data</p>
                                  ) : (
                                    <div className="space-y-3">
                                      {sortedEntries.map(([fieldId, value]) => {
                                        const fieldInfo = fieldMap[fieldId];
                                        const label = fieldInfo?.label || fieldId;
                                        const fieldType = fieldInfo?.type || 'text';
                                        const displayValue = formatFieldValue(value, fieldType);
                                        
                                        return (
                                          <div key={fieldId} className="bg-gray-50 rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-xs text-gray-400 uppercase tracking-wide">
                                                {fieldType.replace('_', ' ')}
                                              </span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
                                            <p className="text-base text-gray-900">
                                              {displayValue}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Submission Metadata */}
                                <div className="border-t pt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-400">
                                  {submission.source_url && (
                                    <div>
                                      <span className="block text-gray-500">Source</span>
                                      <span className="truncate block" title={submission.source_url}>
                                        {new URL(submission.source_url).hostname}
                                      </span>
                                    </div>
                                  )}
                                  {submission.utm_params?.utm_source && (
                                    <div>
                                      <span className="block text-gray-500">UTM Source</span>
                                      {submission.utm_params.utm_source}
                                    </div>
                                  )}
                                  {submission.utm_params?.utm_campaign && (
                                    <div>
                                      <span className="block text-gray-500">Campaign</span>
                                      {submission.utm_params.utm_campaign}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  {submissions.length < totalSubmissions && (
                    <div className="text-center pt-4">
                      <Button variant="outline" onClick={loadMoreSubmissions}>
                        Load More Responses
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="space-y-6">
              {/* Top Referrers */}
              <Card>
                <CardHeader>
                  <CardTitle>🔗 Top Referrers</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.top_referrers && analytics.top_referrers.length > 0 ? (
                    <div className="space-y-2">
                      {analytics.top_referrers.map((ref, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm truncate flex-1">{ref.referrer || 'Direct'}</span>
                          <Badge variant="default">{ref.count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No referrer data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* UTM Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">UTM Source</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics?.utm_breakdown?.source && Object.keys(analytics.utm_breakdown.source).length > 0 ? (
                      <div className="space-y-1">
                        {Object.entries(analytics.utm_breakdown.source).map(([source, count]) => (
                          <div key={source} className="flex justify-between text-sm">
                            <span>{source}</span>
                            <span className="text-gray-500">{count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs">No data</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">UTM Medium</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics?.utm_breakdown?.medium && Object.keys(analytics.utm_breakdown.medium).length > 0 ? (
                      <div className="space-y-1">
                        {Object.entries(analytics.utm_breakdown.medium).map(([medium, count]) => (
                          <div key={medium} className="flex justify-between text-sm">
                            <span>{medium}</span>
                            <span className="text-gray-500">{count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs">No data</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">UTM Campaign</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics?.utm_breakdown?.campaign && Object.keys(analytics.utm_breakdown.campaign).length > 0 ? (
                      <div className="space-y-1">
                        {Object.entries(analytics.utm_breakdown.campaign).map(([campaign, count]) => (
                          <div key={campaign} className="flex justify-between text-sm">
                            <span>{campaign}</span>
                            <span className="text-gray-500">{count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs">No data</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-black p-4 bg-gray-50 flex justify-end">
          <Button variant="outline" onClick={onBack}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default FormAnalytics;
