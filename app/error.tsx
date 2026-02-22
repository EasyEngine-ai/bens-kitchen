"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="font-[family-name:var(--font-display)] text-4xl mb-4">
          Something went wrong
        </h1>
        <p className="text-text-muted mb-8">
          The kitchen had a little mishap. Let&apos;s try that again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-accent text-bg rounded-lg font-medium hover:bg-accent-light transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
