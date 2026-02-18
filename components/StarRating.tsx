"use client";

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: "sm" | "md";
}

function StarIcon({ filled, half }: { filled: boolean; half?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      {half ? (
        <>
          <defs>
            <clipPath id="halfClip">
              <rect x="0" y="0" width="12" height="24" />
            </clipPath>
          </defs>
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill="#D4A574"
            clipPath="url(#halfClip)"
          />
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill="none"
            stroke="#D4A574"
            strokeWidth="1.5"
            opacity="0.3"
          />
        </>
      ) : (
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill={filled ? "#D4A574" : "none"}
          stroke="#D4A574"
          strokeWidth="1.5"
          opacity={filled ? 1 : 0.3}
        />
      )}
    </svg>
  );
}

export default function StarRating({ rating, onChange, size = "md" }: StarRatingProps) {
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  const interactive = !!onChange;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.floor(rating);
        const half = !filled && star === Math.ceil(rating) && rating % 1 >= 0.25;
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            className={`${sizeClass} ${
              interactive
                ? "cursor-pointer hover:scale-110 transition-transform"
                : "cursor-default"
            }`}
          >
            <StarIcon filled={filled} half={half} />
          </button>
        );
      })}
    </div>
  );
}
