'use client';
import { apiFetch } from '@/lib/api/client';

import { useState, useEffect } from 'react';
import { Star, MessageSquare, AlertCircle, CheckCircle2, User, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReviewItem {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  userId: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

interface PropertyReviewsProps {
  propertyId: string;
  currentUserId?: string;
}

export function PropertyReviews({ propertyId, currentUserId }: PropertyReviewsProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Form state
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await apiFetch(`/reviews/property/${propertyId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setReviews(json.data.reviews || []);
            setAvgRating(json.data.stats?.avgRating || 0);
            setTotal(json.data.stats?.total || 0);
          }
        }
      } catch {
        // Silently handle error
      } finally {
        setLoading(false);
      }
    }

    if (propertyId) {
      fetchReviews();
    }
  }, [propertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 5) {
      setFeedback({ type: 'error', message: 'Comment must be at least 5 characters.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await apiFetch('/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          rating,
          comment: comment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to submit review');
      }

      setFeedback({ type: 'success', message: 'Your review has been posted successfully!' });
      setComment('');
      setRating(5);

      // Refresh reviews
      const refRes = await apiFetch(`/reviews/property/${propertyId}`);
      if (refRes.ok) {
        const json = await refRes.json();
        if (json.data) {
          setReviews(json.data.reviews || []);
          setAvgRating(json.data.stats?.avgRating || 0);
          setTotal(json.data.stats?.total || 0);
        }
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Failed to post review. Please ensure you are logged in.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to remove your review?')) return;
    try {
      const res = await apiFetch(`/reviews/${reviewId}`, { method: 'DELETE' });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r._id !== reviewId));
        setTotal((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // Failed to delete
    }
  };

  return (
    <section className="space-y-6 pt-6 border-t" id="reviews">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Tenant Reviews & Ratings
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Verified feedback from renters who inspected or lived at this location.
          </p>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-3 bg-muted/40 px-4 py-2 rounded-xl border">
            <div className="flex items-center text-amber-500">
              <Star className="h-5 w-5 fill-amber-400 stroke-amber-500" />
              <span className="text-lg font-bold text-foreground ml-1.5">{avgRating.toFixed(1)}</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">({total} {total === 1 ? 'review' : 'reviews'})</span>
          </div>
        )}
      </div>

      {/* Review Submission Form */}
      <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm">
        <h3 className="text-base font-semibold text-foreground mb-1">Leave a Review</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Share your inspection notes, neighborhood safety, owner response, and amenities quality.
        </p>

        {feedback && (
          <div
            className={`p-3 rounded-lg text-sm mb-4 flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                : 'bg-destructive/10 text-destructive border border-destructive/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Your Rating
            </p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 rounded transition hover:scale-110 focus:outline-none"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        isFilled
                          ? 'fill-amber-400 stroke-amber-500 text-amber-500'
                          : 'stroke-muted-foreground/40 text-muted-foreground/40'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="text-xs font-semibold text-muted-foreground ml-2">
                {rating === 5 ? 'Excellent (5/5)' : rating === 4 ? 'Good (4/5)' : rating === 3 ? 'Average (3/5)' : rating === 2 ? 'Below Average (2/5)' : 'Poor (1/5)'}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="reviewComment" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Review Comment
            </label>
            <textarea
              id="reviewComment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="How was the experience? Tell others about maintenance, water supply, electricity, and owner behavior..."
              className="w-full rounded-xl border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              required
              minLength={5}
              maxLength={1000}
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
              <span>Minimum 5 characters</span>
              <span>{comment.length}/1000</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Sign-in required to post • Must be genuine tenant inspection
            </p>
            <Button type="submit" disabled={submitting} size="sm" className="gap-2">
              <Send className="h-3.5 w-3.5" />
              {submitting ? 'Posting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <div className="mx-auto h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
            Loading community reviews...
          </div>
        ) : reviews.length > 0 ? (
          reviews.map((rev) => (
            <div key={rev._id} className="rounded-xl border bg-card p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                    {rev.userId?.name ? rev.userId.name.charAt(0) : <User className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{rev.userId?.name || 'Verified Tenant'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= rev.rating
                            ? 'fill-amber-400 stroke-amber-500 text-amber-500'
                            : 'stroke-muted-foreground/30 text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>

                  {currentUserId && rev.userId?._id === currentUserId && (
                    <button
                      onClick={() => handleDelete(rev._id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition"
                      title="Delete review"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-foreground/90 leading-relaxed pt-1">
                {rev.comment}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center bg-muted/10">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-semibold text-foreground">No reviews yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Be the first to inspect and share your thoughts about this rental!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
