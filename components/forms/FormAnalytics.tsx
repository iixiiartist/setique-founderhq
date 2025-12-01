import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Form, FormSubmission, FormAnalyticsSummary } from '../../types/forms';
import { getFormAnalytics, getFormSubmissions } from '../../services/formService';
import { formatDistanceToNow, format } from 'date-fns';

interface FormAnalyticsProps {
  form: Form;
  onBack: () => void;
}

export const FormAnalytics: React.FC<FormAnalyticsProps> = ({ form, onBack }) => {
  const [analytics, setAnalytics] = useState<FormAnalyticsSummary | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'sources'>('overview');
  const [submissionsPage, setSubmissionsPage] = useState(0);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    loadData();
  }, [form.id]);

  const loadData = async () => {
    setLoading(true);
    try {
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
          {(['overview', 'submissions', 'sources'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium capitalize transition-colors ${
                activeTab === tab 
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              {tab === 'overview' ? '📈 Overview' : tab === 'submissions' ? '📥 Responses' : '🔗 Sources'}
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

          {activeTab === 'submissions' && (
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
                  <p className="text-sm text-gray-600">{totalSubmissions} total responses</p>
                  <div className="space-y-3">
                    {submissions.map((submission, index) => (
                      <Card key={submission.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="py-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="default" size="sm">#{totalSubmissions - index}</Badge>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(submission.created_at), 'MMM d, yyyy h:mm a')}
                                </span>
                                {submission.completion_time_seconds && (
                                  <span className="text-xs text-gray-400">
                                    ⏱️ {Math.floor(submission.completion_time_seconds / 60)}m {submission.completion_time_seconds % 60}s
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                {Object.entries(submission.data || {}).slice(0, 4).map(([key, value]) => (
                                  <div key={key} className="truncate">
                                    <span className="text-gray-500">{key}:</span>{' '}
                                    <span className="font-medium">
                                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                  </div>
                                ))}
                                {Object.keys(submission.data || {}).length > 4 && (
                                  <span className="text-gray-400 text-xs">
                                    +{Object.keys(submission.data || {}).length - 4} more fields
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {submissions.length < totalSubmissions && (
                    <div className="text-center">
                      <Button variant="outline" onClick={loadMoreSubmissions}>
                        Load More
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
