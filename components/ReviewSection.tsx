"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getUser, setUser } from "@/lib/user";
import StarRating from "./StarRating";

interface Review {
  id: string;
  author_name: string;
  rating: number;
  comment: string | null;
  likes: number;
  created_at: string;
}

interface ReviewSectionProps {
  recipeSlug: string;
  recipeSource: "cookbook" | "personal" | "community";
}

export default function ReviewSection({ recipeSlug, recipeSource }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  // Load user from localStorage
  useEffect(() => {
    const user = getUser();
    if (user) setName(user.name);
  }, []);

  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("recipe_slug", recipeSlug)
      .eq("recipe_source", recipeSource)
      .order("created_at", { ascending: false });

    if (data) setReviews(data);
    setLoading(false);

    // Check which reviews user has liked
    const user = getUser();
    if (user && data && data.length > 0) {
      const { data: likes } = await supabase
        .from("review_likes")
        .select("review_id")
        .eq("fingerprint", user.fingerprint)
        .in(
          "review_id",
          data.map((r) => r.id)
        );

      if (likes) {
        setLikedIds(new Set(likes.map((l) => l.review_id)));
      }
    }
  }, [recipeSlug, recipeSource]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Submit review
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || rating === 0) return;

    setSubmitting(true);
    const user = setUser(name.trim());

    const newReview = {
      recipe_slug: recipeSlug,
      recipe_source: recipeSource,
      author_name: user.name,
      rating,
      comment: comment.trim() || null,
      likes: 0,
    };

    const { data } = await supabase
      .from("reviews")
      .insert(newReview)
      .select()
      .single();

    if (data) {
      setReviews((prev) => [data, ...prev]);
      setRating(0);
      setComment("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }

    setSubmitting(false);
  };

  // Toggle like
  const toggleLike = async (reviewId: string) => {
    const user = getUser() || setUser("Anonymous");

    const { data } = await supabase.rpc("toggle_review_like", {
      p_review_id: reviewId,
      p_fingerprint: user.fingerprint,
    });

    if (data) {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, likes: data.likes } : r
        )
      );
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (data.liked) next.add(reviewId);
        else next.delete(reviewId);
        return next;
      });
    }
  };

  // Compute average
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="mt-16 pt-12 border-t border-border">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center gap-6 mb-10">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Reviews
          </h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-3">
              <StarRating rating={avgRating} size="sm" />
              <span className="text-sm text-text-muted">
                {avgRating.toFixed(1)} ({reviews.length}{" "}
                {reviews.length === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}
        </div>

        {/* Submit form */}
        <form onSubmit={handleSubmit} className="mb-12">
          <div className="bg-bg-surface border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm uppercase tracking-[0.15em] text-text-muted mb-2">
              Leave a Review
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-dim block mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-dim/50 focus:outline-none focus:border-accent/50 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-text-dim block mb-1.5">
                  Rating
                </label>
                <StarRating rating={rating} onChange={setRating} />
              </div>
            </div>

            <div>
              <label className="text-xs text-text-dim block mb-1.5">
                Comment (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you think of this recipe?"
                rows={3}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-dim/50 focus:outline-none focus:border-accent/50 transition-colors resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting || !name.trim() || rating === 0}
                className="px-5 py-2.5 bg-accent text-bg text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Review"}
              </button>

              <AnimatePresence>
                {submitted && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-green-400"
                  >
                    Review submitted!
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </form>

        {/* Review list */}
        {loading ? (
          <div className="text-center py-8 text-text-dim text-sm">
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-center py-8 text-text-dim text-sm">
            No reviews yet. Be the first to share your thoughts!
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-bg-surface border border-border rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-text">
                        {review.author_name}
                      </span>
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-xs text-text-dim">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-text-muted leading-relaxed">
                        {review.comment}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => toggleLike(review.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                      likedIds.has(review.id)
                        ? "bg-accent/15 text-accent border border-accent/30"
                        : "bg-bg-elevated text-text-dim border border-border hover:border-border-light hover:text-text-muted"
                    }`}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill={likedIds.has(review.id) ? "currentColor" : "none"}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    {review.likes > 0 && <span>{review.likes}</span>}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
