import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Claim Not on File — ClaimSight',
  description: 'The page you\'re looking for doesn\'t exist in this system.',
};

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-16"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      {/* Instrument-panel 404 */}
      <div className="mb-6 relative">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-5 rounded-2xl"
          style={{
            backgroundImage: 'linear-gradient(var(--border-default) 1px, transparent 1px), linear-gradient(90deg, var(--border-default) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div
          className="text-[120px] leading-none font-black relative"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--border-strong)',
            letterSpacing: '-0.04em',
          }}
        >
          404
        </div>
      </div>

      {/* Annotation dot motif */}
      <div className="relative w-12 h-12 flex items-center justify-center mb-6">
        <div
          className="absolute w-full h-full rounded-full border-2 border-dashed opacity-30"
          style={{ borderColor: 'var(--brand-primary)' }}
        />
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: 'var(--brand-primary-light)', border: '2px solid var(--brand-primary)' }}
        />
      </div>

      <h1
        className="text-display-md mb-3"
        style={{ color: 'var(--text-primary)' }}
      >
        Claim not on file
      </h1>
      <p
        className="text-body-md max-w-md mb-8"
        style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}
      >
        The page or claim you&#39;re looking for doesn&#39;t exist in this system. 
        Double-check the claim number, or start a new assessment from the upload page.
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          href="/dashboard"
          className="btn-primary"
          style={{ padding: '0.75rem 1.5rem' }}
        >
          Back to dashboard
        </Link>
        <Link
          href="/upload"
          className="btn-secondary"
          style={{ padding: '0.75rem 1.5rem' }}
        >
          Start assessment
        </Link>
      </div>

      {/* Footer note */}
      <div className="mt-16 text-data-sm" style={{ color: 'var(--text-muted)' }}>
        ClaimSight · AI Damage Assessment · If you believe this is an error, contact your system administrator.
      </div>
    </div>
  );
}
