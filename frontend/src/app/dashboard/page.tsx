import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Building2,
  Heart,
  Calendar,
  MessageSquare,
  Plus,
  TrendingUp,
  User,
  ExternalLink,
  Bell,
  Search,
  Settings,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { privateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = privateMetadata(
  'Dashboard',
  'Manage your listings, scheduled visits, inquiries, and saved properties.',
);

export default function DashboardPage() {
  return (
    <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            My Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your rental journey, listings, visits, and messages
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/properties/new"
            className={buttonVariants({ variant: 'default', size: 'sm', className: 'gap-1.5' })}
          >
            <Plus className="h-4 w-4" /> Post New Property
          </Link>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 my-8">
        {[
          { href: '/dashboard/favorites', label: 'Saved', sub: 'Bookmarked properties', icon: Heart, color: 'text-rose-500' },
          { href: '/dashboard/visits', label: 'Visits', sub: 'Scheduled appointments', icon: Calendar, color: 'text-primary' },
          { href: '/dashboard/messages', label: 'Messages', sub: 'Tenant-owner chats', icon: MessageSquare, color: 'text-emerald-600' },
          { href: '/dashboard/properties', label: 'My Listings', sub: 'Manage properties', icon: Building2, color: 'text-amber-500' },
          { href: '/dashboard/notifications', label: 'Alerts', sub: 'All notifications', icon: Bell, color: 'text-violet-500' },
          { href: '/dashboard/saved-searches', label: 'Searches', sub: 'Saved queries', icon: Search, color: 'text-sky-500' },
        ].map(({ href, label, sub, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-sm font-bold text-foreground group-hover:text-primary transition leading-tight">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Action Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* For Tenants Card */}
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Tenant Shortcuts</h2>
              <p className="text-xs text-muted-foreground">Track your applications & visits</p>
            </div>
          </div>

          <div className="divide-y text-sm">
            <Link href="/search" className="py-3 flex items-center justify-between hover:text-primary transition">
              <span>Explore nearby rentals</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link href="/dashboard/visits" className="py-3 flex items-center justify-between hover:text-primary transition">
              <span>View upcoming physical visits</span>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link href="/dashboard/favorites" className="py-3 flex items-center justify-between hover:text-primary transition">
              <span>View wishlist / saved rentals</span>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link href="/dashboard/saved-searches" className="py-3 flex items-center justify-between hover:text-primary transition">
              <span>Manage saved search alerts</span>
              <Search className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link href="/dashboard/profile" className="py-3 flex items-center justify-between hover:text-primary transition">
              <span>Edit profile &amp; preferences</span>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* For Owners Card */}
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Property Owner Shortcuts</h2>
              <p className="text-xs text-muted-foreground">List and verify properties</p>
            </div>
          </div>

          <div className="divide-y text-sm">
            <Link
              href="/dashboard/properties/new"
              className="py-3 flex items-center justify-between hover:text-primary transition"
            >
              <span>Post a new PG, room or flat</span>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href="/dashboard/properties"
              className="py-3 flex items-center justify-between hover:text-primary transition"
            >
              <span>Manage active & draft listings</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href="/dashboard/messages"
              className="py-3 flex items-center justify-between hover:text-primary transition"
            >
              <span>Reply to prospective tenants</span>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href="/dashboard/notifications"
              className="py-3 flex items-center justify-between hover:text-primary transition"
            >
              <span>View all notifications &amp; alerts</span>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
