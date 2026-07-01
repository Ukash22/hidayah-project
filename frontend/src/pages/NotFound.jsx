import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
      <p className="text-8xl font-display font-bold text-primary/20 leading-none select-none">404</p>
      <h1 className="mt-4 text-2xl font-display font-bold text-text">Page not found</h1>
      <p className="mt-2 text-text-muted max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-text-muted text-sm font-semibold hover:bg-surface-overlay transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm"
        >
          <Home className="h-4 w-4" />
          Home
        </Link>
      </div>
    </div>
  );
}
