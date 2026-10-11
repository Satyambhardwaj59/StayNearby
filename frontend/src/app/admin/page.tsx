'use client';
import { apiFetch } from '@/lib/api/client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Building,
  Activity,
  ArrowLeft,
  Server,
  FileWarning,
  RefreshCw,
  ExternalLink,
  Clock,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  users: { total: number; breakdown: Record<string, number> };
  properties: { total: number; breakdown: Record<string, number> };
  visits: { total: number };
  moderation: { pendingListings: number; openReports: number };
}

interface ModerationItem {
  _id: string;
  title: string;
  slug: string;
  rent: number;
  listingStatus: string;
  verificationStatus: string;
  ownerId: { _id?: string; name: string; email: string; phone?: string };
  address?: { locality: string; city: string };
  createdAt: string;
}

interface ReportItem {
  _id: string;
  reason: string;
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  propertyId: { _id?: string; title: string; slug: string } | null;
  reporterId: { _id?: string; name: string; email: string } | null;
  createdAt: string;
}

interface SystemHealth {
  status: string;
  database: { status: string; name: string };
  redis: { status: string };
  process: { uptimeSeconds: number; nodeVersion: string };
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'reports' | 'health'>('queue');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queue, setQueue] = useState<ModerationItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, queueRes, reportsRes, healthRes] = await Promise.all([
        apiFetch('/admin/stats'),
        apiFetch('/admin/moderation-queue'),
        apiFetch('/reports'),
        apiFetch('/admin/health'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }
      if (queueRes.ok) {
        const queueData = await queueRes.json();
        if (Array.isArray(queueData.data)) {
          setQueue(queueData.data);
        }
      }
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        if (Array.isArray(reportsData.data)) {
          setReports(reportsData.data);
        }
      }
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (propertyId: string) => {
    setProcessingId(propertyId);
    try {
      const res = await apiFetch(`/properties/${propertyId}/publish`, { method: 'POST' });
      if (res.ok) {
        setQueue((prev) => prev.filter((item) => item._id !== propertyId));
        setStats((prev) =>
          prev
            ? {
                ...prev,
                moderation: {
                  ...prev.moderation,
                  pendingListings: Math.max(0, prev.moderation.pendingListings - 1),
                },
              }
            : null
        );
      }
    } catch {
      // Ignore
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (propertyId: string) => {
    const reason = prompt('Please enter rejection reason:', 'Listing details or verification documents do not meet marketplace standards');
    if (!reason) return;

    setProcessingId(propertyId);
    try {
      const res = await apiFetch(`/properties/${propertyId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setQueue((prev) => prev.filter((item) => item._id !== propertyId));
      }
    } catch {
      // Ignore
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, newStatus: ReportItem['status']) => {
    setProcessingId(reportId);
    try {
      const res = await apiFetch(`/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r._id === reportId ? { ...r, status: newStatus } : r))
        );
      }
    } catch {
      // Ignore
    } finally {
      setProcessingId(null);
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to user dashboard
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Marketplace Command Center
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Moderation queue, user safety reports, and platform infrastructure health
          </p>
        </div>

        <Button
          onClick={loadData}
          variant="outline"
          size="sm"
          disabled={loading}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
            Total Users <Users className="h-4 w-4 text-primary" />
          </span>
          <p className="text-2xl font-bold mt-2 text-foreground">{stats?.users?.total ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.users?.breakdown?.OWNER || 0} Owners • {stats?.users?.breakdown?.TENANT || 0} Tenants
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
            Properties <Building className="h-4 w-4 text-emerald-600" />
          </span>
          <p className="text-2xl font-bold mt-2 text-foreground">{stats?.properties?.total ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.properties?.breakdown?.PUBLISHED || 0} Active Live
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
            Visits Scheduled <Activity className="h-4 w-4 text-amber-500" />
          </span>
          <p className="text-2xl font-bold mt-2 text-foreground">{stats?.visits?.total ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">Physical inspections</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
            Action Needed <AlertTriangle className="h-4 w-4 text-rose-500" />
          </span>
          <p className="text-2xl font-bold mt-2 text-rose-600">
            {(stats?.moderation?.pendingListings || queue.length) + (stats?.moderation?.openReports || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {queue.length} pending • {reports.filter((r) => r.status === 'OPEN').length} reports
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6 gap-6">
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'queue'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building className="h-4 w-4" />
          Verification Queue ({queue.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'reports'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileWarning className="h-4 w-4" />
          User Reports ({reports.length})
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'health'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Server className="h-4 w-4" />
          System Health
        </button>
      </div>

      {/* TAB 1: Moderation Queue */}
      {activeTab === 'queue' && (
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Pending Property Verifications</h2>
              <p className="text-xs text-muted-foreground">Listings waiting for moderator verification or review</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {queue.length} In Queue
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <div className="mx-auto h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
              Loading moderation queue...
            </div>
          ) : queue.length > 0 ? (
            <div className="divide-y">
              {queue.map((item) => (
                <div
                  key={item._id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600">
                        {item.listingStatus}
                      </span>
                      {item.address && (
                        <span className="text-xs text-muted-foreground">
                          {item.address.locality}, {item.address.city}
                        </span>
                      )}
                    </div>

                    <p className="font-semibold text-sm text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Owner: {item.ownerId?.name || 'Owner'} ({item.ownerId?.email || 'N/A'}{item.ownerId?.phone ? ` • ${item.ownerId.phone}` : ''})
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Link
                      href={`/properties/${item.slug}`}
                      target="_blank"
                      className="px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Preview
                    </Link>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processingId === item._id}
                      onClick={() => handleApprove(item._id)}
                      className="gap-1.5 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve & Publish
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processingId === item._id}
                      onClick={() => handleReject(item._id)}
                      className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
              <p className="font-semibold text-foreground text-sm">Moderation Queue Clear</p>
              <p className="mt-1">All submitted properties have been reviewed and approved.</p>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: User Reports */}
      {activeTab === 'reports' && (
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Flagged Listings & Community Reports</h2>
              <p className="text-xs text-muted-foreground">Reports filed by tenants regarding fake listings, rent discrepancies, or harassment</p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Loading reports...</div>
          ) : reports.length > 0 ? (
            <div className="divide-y">
              {reports.map((report) => (
                <div key={report._id} className="py-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          report.status === 'OPEN'
                            ? 'bg-rose-500/10 text-rose-600'
                            : report.status === 'INVESTIGATING'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-emerald-500/10 text-emerald-600'
                        }`}
                      >
                        {report.status}
                      </span>
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                        Reason: {report.reason.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <span className="text-xs text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-sm text-foreground bg-muted/20 p-3 rounded-lg border">
                    &quot;{report.description}&quot;
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground pt-1 gap-2">
                    <div>
                      {report.propertyId ? (
                        <span>
                          Target Property:{' '}
                          <Link
                            href={`/properties/${report.propertyId.slug}`}
                            className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                          >
                            {report.propertyId.title} <ExternalLink className="h-3 w-3" />
                          </Link>
                        </span>
                      ) : (
                        <span>Property: N/A</span>
                      )}
                      {report.reporterId && (
                        <span className="ml-3">
                          Reporter: {report.reporterId.name} ({report.reporterId.email})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {report.status !== 'RESOLVED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processingId === report._id}
                          onClick={() => handleUpdateReportStatus(report._id, 'RESOLVED')}
                          className="h-7 text-xs text-emerald-600 gap-1 hover:bg-emerald-500/10"
                        >
                          <Check className="h-3 w-3" /> Mark Resolved
                        </Button>
                      )}
                      {report.status !== 'DISMISSED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={processingId === report._id}
                          onClick={() => handleUpdateReportStatus(report._id, 'DISMISSED')}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
              <p className="font-semibold text-foreground text-sm">No Active Reports</p>
              <p className="mt-1">Zero community violations or flagged listings reported.</p>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: System Health */}
      {activeTab === 'health' && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase">API Status</span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </div>
              <p className="text-lg font-bold text-foreground capitalize">{health?.status || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">High-availability microservice backend</p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Database</span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    health?.database?.status === 'up' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              </div>
              <p className="text-lg font-bold text-foreground capitalize">{health?.database?.status || '—'}</p>
              <p className="text-xs text-muted-foreground">MongoDB replica cluster: {health?.database?.name || 'prod'}</p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Cache / Redis</span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    health?.redis?.status === 'up' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </div>
              <p className="text-lg font-bold text-foreground capitalize">{health?.redis?.status || 'Fallback (In-Memory)'}</p>
              <p className="text-xs text-muted-foreground">L1 caching & session storage</p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Process Telemetry
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg border bg-muted/10">
                <span className="text-muted-foreground block">Uptime</span>
                <span className="font-semibold text-foreground text-sm mt-0.5 block">
                  {formatUptime(health?.process?.uptimeSeconds)}
                </span>
              </div>
              <div className="p-3 rounded-lg border bg-muted/10">
                <span className="text-muted-foreground block">Node Runtime</span>
                <span className="font-semibold text-foreground text-sm mt-0.5 block">
                  {health?.process?.nodeVersion || 'v20.x'}
                </span>
              </div>
              <div className="p-3 rounded-lg border bg-muted/10">
                <span className="text-muted-foreground block">Platform Target</span>
                <span className="font-semibold text-foreground text-sm mt-0.5 block">
                  Linux x86_64 / Windows
                </span>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
