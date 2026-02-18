import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-[120px] leading-none font-[family-name:var(--font-display)] text-accent/20">
          404
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl mt-4 mb-3">
          Recipe Not Found
        </h1>
        <p className="text-text-muted mb-8">
          Looks like this recipe wandered off. Let&apos;s get you back to the
          kitchen.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/recipes/"
            className="px-6 py-3 bg-accent text-bg font-medium text-sm uppercase tracking-[0.15em] rounded-full hover:shadow-[0_0_30px_rgba(212,165,116,0.3)] transition-all duration-300"
          >
            Browse Recipes
          </Link>
          <Link
            href="/"
            className="px-6 py-3 border border-border-light text-text-muted text-sm uppercase tracking-[0.15em] rounded-full hover:border-accent hover:text-accent transition-all duration-300"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
