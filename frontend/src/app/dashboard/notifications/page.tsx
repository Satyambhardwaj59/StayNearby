'use client';
import { apiFetch } from '@/lib/api/client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  ArrowLeft,
  MessageSquare,
  Calendar,
  Building2,
  Heart,
  AlertCircle,
  CheckCircle2,
  Star,
  Search,
  Trash2,
  CheckCheck,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AppNotification, NotificationType } from '@/lib/api/types';

const TYPE_ICON: Record<NotificationType, React.ElementType> = {
  NEW_MESSAGE: MessageSquare,
  VISIT_REQUESTED: Calendar,
  VISIT_CONFIRMED: Calendar,
  VISIT_RESCHEDULED: Calendar,
  VISIT_CANCELLED: Calendar,
  VISIT_REMINDER: Calendar,
  LISTING_APPROVED: Building2,
  LISTING_REJECTED: AlertCircle,
  LISTING_EXPIRING: AlertCircle,
  LISTING_EXPIRED: AlertCircle,
  SAVED_SEARCH_MATCH: Search,
  REPORT_UPDATE: AlertCircle,
  REVIEW_RECEIVED: Star,
  ACCOUNT_UPDATE: CheckCircle2,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  NEW_MESSAGE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  VISIT_REQUESTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  VISIT_CONFIRMED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  VISIT_RESCHEDULED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  VISIT_CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  VISIT_REMINDER: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  LISTING_APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  LISTING_REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  LISTING_EXPIRING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LISTING_EXPIRED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  SAVED_SEARCH_MATCH: 'bg-primary/10 text-primary',
  REPORT_UPDATE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  REVIEW_RECEIVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ACCOUNT_UPDATE: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

const CATEGORY_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Messages', value: 'message' },
  { label: 'Visits', value: 'visit' },
  { label: 'Listings', value: 'listing' },
  { label: 'Other', value: 'other' },
] as const;

type FilterCategory = (typeof CATEGORY_FILTERS)[number]['value'];

function matchesCategory(type: NotificationType, cat: FilterCategory): boolean {
  if (cat === 'all') return true;
  if (cat === 'message') return type === 'NEW_MESSAGE';
  if (cat === 'visit') return type.startsWith('VISIT_');
  if (cat === 'listing') return type.startsWith('LISTING_');
  return true;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/notifications?limit=50');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.data)) setNotifications(data.data);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const markAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // Ignore
    }
  };

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // Ignore
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Ignore
    }
  };

  const filtered = notifications.filter(
    (n) => matchesCategory(n.type, filter) && (!showUnreadOnly || !n.read)
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="rounded-xl bg-primary p-2.5 text-primary-foreground shadow-card">
                <Bell className="h-6 w-6" />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-2xs font-bold text-destructive-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              className="gap-1.5 rounded-xl text-xs shrink-0"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setFilter(cat.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition ${
              filter === cat.value
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          className={`shrink-0 ml-auto rounded-full px-3.5 py-1.5 text-xs font-semibold border transition flex items-center gap-1.5 ${
            showUnreadOnly
              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
              : 'bg-card text-muted-foreground border-border hover:border-primary/40'
          }`}
        >
          <Filter className="h-3 w-3" /> Unread only
        </button>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Loading notifications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-16 text-center">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-base font-semibold text-foreground">No notifications here</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {showUnreadOnly ? "You've read all your notifications!" : "You're all caught up. Come back later."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Heart;
            const colorClass = TYPE_COLOR[n.type] ?? 'bg-primary/10 text-primary';
            return (
              <div
                key={n.id}
                className={`group relative rounded-2xl border bg-card p-4 flex items-start gap-4 transition hover:shadow-md ${
                  !n.read ? 'border-primary/20 bg-primary/5 dark:bg-primary/5' : ''
                }`}
              >
                {/* Unread dot */}
                {!n.read && (
                  <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}

                {/* Icon */}
                <div className={`shrink-0 p-2.5 rounded-xl ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                    {n.data.url && (
                      <Link
                        href={n.data.url}
                        className="text-xs font-semibold text-primary hover:underline"
                        onClick={() => !n.read && markRead(n.id)}
                      >
                        View →
                      </Link>
                    )}
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="text-xs text-muted-foreground hover:text-foreground transition"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => deleteNotification(n.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Delete notification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
