'use client';
import { apiFetch } from '@/lib/api/client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Lock,
  Trash2,
  Save,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PrivateUser, UserRole } from '@/lib/api/types';

const GENDER_OPTIONS = ['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY'] as const;
const OCCUPATION_OPTIONS = [
  'STUDENT',
  'WORKING_PROFESSIONAL',
  'SELF_EMPLOYED',
  'FREELANCER',
  'HOMEMAKER',
  'OTHER',
] as const;
const PROPERTY_TYPE_OPTIONS = ['PG', 'ROOM', 'FLAT', 'APARTMENT', 'HOUSE', 'HOSTEL', 'CO_LIVING', 'INDEPENDENT_HOUSE'];

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && <div className="px-5 pb-6 pt-1 border-t">{children}</div>}
    </div>
  );
}

export default function ProfilePage() {
  const [user, setUser] = useState<PrivateUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [citySlug, setCitySlug] = useState('');

  // Preferences
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [preferredCities, setPreferredCities] = useState('');
  const [preferredPropertyTypes, setPreferredPropertyTypes] = useState<string[]>([]);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await apiFetch('/users/me');
        if (res.ok) {
          const data = await res.json();
          const u: PrivateUser = data.data;
          setUser(u);
          setName(u.name ?? '');
          setPhone(u.phone ?? '');
          setBio(u.bio ?? '');
          setGender(u.gender ?? '');
          setOccupation(u.occupation ?? '');
          setCitySlug(u.citySlug ?? '');
          setBudgetMin(String(u.preferences?.budgetMin ?? ''));
          setBudgetMax(String(u.preferences?.budgetMax ?? ''));
          setPreferredCities((u.preferences?.preferredCities ?? []).join(', '));
          setPreferredPropertyTypes(u.preferences?.preferredPropertyTypes ?? []);
        }
      } catch {
        // Fallback — show empty form
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: phone || null, bio: bio || null, gender: gender || null, occupation: occupation || null, citySlug: citySlug || null }),
      });
      if (res.ok) {
        showToast('success', 'Profile updated successfully!');
      } else {
        const err = await res.json();
        showToast('error', err?.error?.message ?? 'Failed to update profile.');
      }
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/users/me/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetMin: budgetMin ? Number(budgetMin) : null,
          budgetMax: budgetMax ? Number(budgetMax) : null,
          preferredCities: preferredCities.split(',').map((c) => c.trim()).filter(Boolean),
          preferredPropertyTypes,
        }),
      });
      if (res.ok) {
        showToast('success', 'Preferences saved!');
      } else {
        showToast('error', 'Failed to save preferences.');
      }
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('error', 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      showToast('error', 'Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        showToast('success', 'Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json();
        showToast('error', err?.error?.message ?? 'Failed to change password.');
      }
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const togglePropertyType = (type: string) => {
    setPreferredPropertyTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const roleLabel: Record<UserRole, string> = {
    TENANT: 'Tenant',
    OWNER: 'Property Owner',
    MODERATOR: 'Moderator',
    ADMIN: 'Administrator',
  };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed right-4 top-20 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-popover animate-toast-in ${
            toast.type === 'success'
              ? 'border-success/25 bg-card text-success'
              : 'border-destructive/25 bg-card text-destructive'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary text-white shadow-lg">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Profile &amp; Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your personal information, preferences and account security
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Loading your profile...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Avatar + Role Banner */}
          <div className="rounded-2xl border bg-card p-5 flex items-center gap-5 shadow-sm">
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-md">
                {(user?.name ?? 'U').charAt(0).toUpperCase()}
              </div>
              <button
                type="button"
                className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full bg-card border-2 border-border flex items-center justify-center hover:bg-muted transition shadow-sm"
                title="Change avatar"
              >
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xl text-foreground truncate">{user?.name ?? 'Your Name'}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5">
                  {user?.role ? roleLabel[user.role] : 'User'}
                </span>
                {user?.emailVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Email Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <SectionCard title="Personal Information" description="Update your name, contact and bio" icon={User}>
            <form onSubmit={handleSaveProfile} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="profile-name">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="profile-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full rounded-xl border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="profile-phone">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="profile-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="profile-gender">
                    Gender
                  </label>
                  <select
                    id="profile-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="profile-occupation">
                    Occupation
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      id="profile-occupation"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      className="w-full rounded-xl border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    >
                      <option value="">Select occupation</option>
                      {OCCUPATION_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="profile-city">
                    Current City (slug)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="profile-city"
                      type="text"
                      value={citySlug}
                      onChange={(e) => setCitySlug(e.target.value)}
                      placeholder="e.g. bangalore"
                      className="w-full rounded-xl border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="profile-email">
                    Email (read-only)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="profile-email"
                      type="email"
                      value={user?.email ?? ''}
                      disabled
                      className="w-full rounded-xl border bg-muted/50 pl-9 pr-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="profile-bio">
                  Bio / About You
                </label>
                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Tell property owners a little about yourself — your lifestyle, work schedule, etc."
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/500</p>
              </div>

              <div className="flex justify-end pt-1">
                <Button type="submit" disabled={saving} className="gap-2 rounded-xl px-6">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </SectionCard>

          {/* Tenant Preferences */}
          <SectionCard
            title="Rental Preferences"
            description="Set your budget and preferred property types"
            icon={Settings}
            defaultOpen={false}
          >
            <form onSubmit={handleSavePreferences} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="pref-budget-min">
                    Min Budget (₹/month)
                  </label>
                  <input
                    id="pref-budget-min"
                    type="number"
                    min={0}
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="pref-budget-max">
                    Max Budget (₹/month)
                  </label>
                  <input
                    id="pref-budget-max"
                    type="number"
                    min={0}
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="e.g. 20000"
                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="pref-cities">
                  Preferred Cities (comma-separated slugs)
                </label>
                <input
                  id="pref-cities"
                  type="text"
                  value={preferredCities}
                  onChange={(e) => setPreferredCities(e.target.value)}
                  placeholder="e.g. bangalore, mumbai, hyderabad"
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Preferred Property Types</p>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_TYPE_OPTIONS.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => togglePropertyType(type)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${
                        preferredPropertyTypes.includes(type)
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                      }`}
                    >
                      {type.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button type="submit" disabled={saving} className="gap-2 rounded-xl px-6">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </form>
          </SectionCard>

          {/* Change Password */}
          <SectionCard
            title="Change Password"
            description="Use a strong password with 8+ characters"
            icon={Lock}
            defaultOpen={false}
          >
            <form onSubmit={handleChangePassword} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="pwd-current">
                  Current Password
                </label>
                <input
                  id="pwd-current"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="pwd-new">
                    New Password
                  </label>
                  <input
                    id="pwd-new"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5" htmlFor="pwd-confirm">
                    Confirm New Password
                  </label>
                  <input
                    id="pwd-confirm"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving} variant="outline" className="gap-2 rounded-xl px-6">
                  <Lock className="h-4 w-4" />
                  {saving ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </SectionCard>

          {/* Danger Zone */}
          <SectionCard
            title="Danger Zone"
            description="Permanent actions — proceed with caution"
            icon={Trash2}
            defaultOpen={false}
          >
            <div className="pt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 mt-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">Delete Account</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Permanently delete your account and all associated data including listings, messages, and visit history.
                    This action <strong>cannot be undone</strong>.
                  </p>
                  <button
                    type="button"
                    className="mt-3 rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-white hover:bg-destructive/90 transition shadow-sm"
                    onClick={() => {
                      if (window.confirm('Are you absolutely sure? This cannot be undone.')) {
                        apiFetch('/users/me', { method: 'DELETE' });
                      }
                    }}
                  >
                    Delete My Account
                  </button>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </main>
  );
}
