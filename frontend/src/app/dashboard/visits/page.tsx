'use client';
import { apiFetch } from '@/lib/api/client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Calendar, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

interface VisitItem {
  _id: string;
  propertyId: {
    _id: string;
    title: string;
    slug: string;
    rent: number;
    address: { locality: string; city: string };
  };
  scheduledAt: string;
  timeSlot: string;
  status: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REJECTED';
  notes?: string;
}

function VisitsContent() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('propertyId');
  const action = searchParams.get('action');

  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduledSuccess, setScheduledSuccess] = useState(false);

  // Quick schedule form state
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('11:00 AM - 12:00 PM');
  const [notes, setNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    async function loadVisits() {
      try {
        const res = await apiFetch('/visits');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.data)) {
            setVisits(data.data);
          }
        }
      } catch {
        // Fallback demo visits
      } finally {
        setLoading(false);
      }
    }
    loadVisits();
  }, []);

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) return;
    setScheduling(true);

    try {
      const res = await apiFetch('/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          scheduledAt: new Date(date).toISOString(),
          timeSlot,
          notes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setVisits([data.data, ...visits]);
        setScheduledSuccess(true);
      }
    } catch {
      // Ignore
    } finally {
      setScheduling(false);
    }
  };

  const handleCancelVisit = async (visitId: string) => {
    try {
      const res = await apiFetch(`/visits/${visitId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (res.ok) {
        setVisits(
          visits.map((v) => (v._id === visitId ? { ...v, status: 'CANCELLED' as const } : v)),
        );
      }
    } catch {
      // Ignore
    }
  };

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Physical Property Visits
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Coordinate on-site walkthroughs directly with property owners
        </p>
      </div>

      {/* Schedule Form Modal / Banner if propertyId passed in URL */}
      {propertyId && action === 'schedule' && !scheduledSuccess && (
        <div className="rounded-2xl border bg-primary/5 p-6 mb-8 border-primary/20 space-y-4">
          <h2 className="text-base font-bold text-foreground">Schedule Physical Visit</h2>
          <p className="text-xs text-muted-foreground">
            Select a preferred date and time to visit and inspect the property in person.
          </p>

          <form onSubmit={handleScheduleVisit} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="field-preferred-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Preferred Date</label>
              <input id="field-preferred-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="field-time-slot" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Time Slot</label>
              <select id="field-time-slot"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                <option value="11:00 AM - 12:00 PM">11:00 AM - 12:00 PM</option>
                <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
                <option value="04:00 PM - 05:00 PM">04:00 PM - 05:00 PM</option>
                <option value="06:00 PM - 07:00 PM">06:00 PM - 07:00 PM</option>
              </select>
            </div>

            <div>
              <label htmlFor="field-notes-for-owner" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Notes for Owner</label>
              <input id="field-notes-for-owner"
                type="text"
                placeholder="e.g. Bringing family / Checking room size"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <Button type="submit" disabled={scheduling} size="sm" className="font-semibold">
              {scheduling ? 'Scheduling...' : 'Confirm Appointment'}
            </Button>
          </form>
        </div>
      )}

      {scheduledSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 mb-6 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <span>Visit requested successfully! The property owner has been notified.</span>
        </div>
      )}

      {/* Visits List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading your scheduled visits...</div>
        ) : visits.length > 0 ? (
          visits.map((visit) => (
            <div
              key={visit._id}
              className="rounded-xl border bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      visit.status === 'CONFIRMED'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : visit.status === 'CANCELLED'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {visit.status}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {visit.timeSlot || 'Daytime'}
                  </span>
                </div>

                <Link
                  href={visit.propertyId?.slug ? `/properties/${visit.propertyId.slug}` : '#'}
                  className="font-semibold text-base text-foreground hover:text-primary transition block"
                >
                  {visit.propertyId?.title || 'Property Visit'}
                </Link>

                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Scheduled for {formatDate(visit.scheduledAt)}
                </p>
              </div>

              {visit.status !== 'CANCELLED' && visit.status !== 'COMPLETED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelVisit(visit._id)}
                  className="text-destructive hover:bg-destructive/10 self-start sm:self-center"
                >
                  Cancel Visit
                </Button>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed p-12 text-center max-w-md mx-auto my-8">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <h2 className="text-base font-semibold text-foreground">No visits scheduled</h2>
            <p className="text-xs text-muted-foreground mt-1 mb-6">
              When viewing a property, click "Schedule Physical Visit" to book an on-site walkthrough.
            </p>
            <Link
              href="/search"
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Explore Properties
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function VisitsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-12 text-center text-sm text-muted-foreground">
          <div className="mx-auto h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
          Loading scheduled visits...
        </div>
      }
    >
      <VisitsContent />
    </Suspense>
  );
}
