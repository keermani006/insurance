'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MOCK_CLAIMS } from '@/mock/claims';
import { StatusChip, SeverityBadge, FraudBadge } from '@/components/ui/Badges';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';
import { SEVERITY_CONFIG } from '@/constants';

const previewClaims = MOCK_CLAIMS.filter((c) => c.assessment).slice(0, 3);

const features = [
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'AI Damage Detection',
    description: 'Computer vision identifies damage zones, categorizes impact type, and annotates locations to the pixel — in seconds.',
    stat: '97%',
    statLabel: 'detection accuracy',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
    title: 'Fraud Detection',
    description: 'Cross-references claim history, policy dates, and damage patterns to flag anomalies before they become costly payouts.',
    stat: '91%',
    statLabel: 'fraud catch rate',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Instant Cost Estimate',
    description: 'Real-time repair cost models trained on 2.4M+ vehicle repair records. Estimates arrive with the assessment, not days later.',
    stat: '±8%',
    statLabel: 'estimate accuracy',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Fast Claim Processing',
    description: 'From photo upload to adjuster briefing in under 90 seconds. Status tracking keeps everyone informed, every step.',
    stat: '< 90s',
    statLabel: 'avg. assessment time',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      {/* ── Landing Nav ──────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="ClaimSight">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-display text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 700 }}>
              ClaimSight
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium hidden sm:block"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign in
            </Link>
            <Link href="/upload" className="btn-primary text-sm">
              Start assessment
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero — Asymmetric Layout ──────────────────── */}
      <section className="max-w-[1400px] mx-auto px-6 pt-16 pb-12 lg:pt-24 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[55%_1fr] gap-12 lg:gap-16 items-start">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Eyebrow */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
              style={{
                backgroundColor: 'var(--brand-primary-light)',
                color: 'var(--brand-primary)',
                border: '1px solid var(--brand-primary)30',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--brand-primary)' }} />
              AI-Powered · Claims Assessor · v2.4
            </div>

            <h1 className="text-display-xl mb-6" style={{ maxWidth: '540px' }}>
              Damage assessed.
              <br />
              <span style={{ color: 'var(--brand-primary)' }}>Claim closed.</span>
            </h1>

            <p className="text-body-md mb-8" style={{ color: 'var(--text-secondary)', maxWidth: '460px', lineHeight: '1.7' }}>
              ClaimSight reads a damage photo and delivers a full assessment in under 90 seconds — 
              annotated damage zones, repair cost estimate, fraud risk score, and a structured report 
              ready for adjuster review. No spreadsheets. No guessing.
            </p>

            <div className="flex flex-wrap gap-3 mb-12">
              <Link
                href="/upload"
                className="btn-primary"
                style={{ fontSize: '1rem', padding: '0.75rem 1.75rem' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Start assessment
              </Link>
              <Link
                href="/dashboard"
                className="btn-secondary"
                style={{ fontSize: '1rem', padding: '0.75rem 1.75rem' }}
              >
                View dashboard
              </Link>
            </div>

            {/* Trust metrics */}
            <div className="flex flex-wrap gap-8">
              {[
                { value: '2.4M+', label: 'Claims processed' },
                { value: '97%', label: 'Detection accuracy' },
                { value: '< 90s', label: 'Average assessment' },
              ].map((metric) => (
                <div key={metric.label}>
                  <div className="text-data-lg font-semibold" style={{ color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                    {metric.value}
                  </div>
                  <div className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Live claim UI panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="relative"
          >
            {/* Panel header */}
            <div
              className="card overflow-hidden"
              style={{ boxShadow: '0 8px 32px rgba(37,99,235,0.08), 0 2px 8px rgba(0,0,0,0.06)' }}
            >
              {/* Panel chrome */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                  </div>
                  <span className="text-data-sm ml-2">LIVE ASSESSMENT QUEUE</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--fraud-clear)' }} />
                  <span className="text-data-sm">ONLINE</span>
                </div>
              </div>

              {/* Claims preview */}
              <div className="divide-y divide-[var(--border-default)]">
                {previewClaims.map((claim, i) => (
                  <motion.div
                    key={claim.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="p-4 hover:bg-[var(--bg-subtle)] transition-colors"
                    style={{ borderColor: 'var(--border-default)' }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Vehicle image */}
                      <div
                        className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border"
                        style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card-secondary)' }}
                      >
                        {claim.imageUrl ? (
                          <img
                            src={claim.imageUrl}
                            alt={`${claim.vehicleInfo.year} ${claim.vehicleInfo.make} ${claim.vehicleInfo.model}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                            N/A
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-data-sm">{claim.claimNumber}</span>
                          <StatusChip status={claim.status} />
                        </div>
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {claim.vehicleInfo.year} {claim.vehicleInfo.make} {claim.vehicleInfo.model}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {claim.assessment && (
                            <>
                              <SeverityBadge severity={claim.assessment.severity} size="sm" />
                              <span className="text-data-sm">
                                {formatCurrency(claim.assessment.estimatedCost)}
                              </span>
                              {claim.assessment.fraud.flagged && (
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: 'var(--fraud-alert-bg)', color: 'var(--fraud-alert)' }}
                                >
                                  FRAUD
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {claim.assessment && (
                      <div className="mt-2.5">
                        {/* Confidence bar */}
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-elevated)' }}
                          >
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: SEVERITY_CONFIG[claim.assessment.severity].barColor }}
                              initial={{ width: 0 }}
                              animate={{ width: `${claim.assessment.confidence}%` }}
                              transition={{ delay: 0.6 + i * 0.15, duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                          <span className="text-data-sm">{claim.assessment.confidence}%</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Panel footer */}
              <div
                className="px-4 py-3 flex items-center justify-between border-t"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
              >
                <span className="text-data-sm">16 active claims · 3 pending review</span>
                <Link
                  href="/dashboard"
                  className="text-xs font-semibold"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  View all →
                </Link>
              </div>
            </div>

            {/* Floating assessment indicator */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.4 }}
              className="absolute -bottom-4 -right-4 card px-4 py-3 flex items-center gap-3 shadow-lg"
              style={{ borderColor: 'var(--border-default)' }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--fraud-clear-bg)' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="var(--fraud-clear)" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Assessment complete</div>
                <div className="text-data-sm">CLM-2024-10042 · 94% confidence</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Features Section ──────────────────────────── */}
      <section
        className="py-20 border-t"
        style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}
        aria-labelledby="features-heading"
      >
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-14"
          >
            <div
              className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ color: 'var(--brand-primary)' }}
            >
              Built for claims professionals
            </div>
            <h2 id="features-heading" className="text-display-md max-w-xl">
              Every tool an adjuster needs.<br />
              None they don&#39;t.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="card p-6 group hover:border-[var(--brand-secondary)] transition-colors"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:bg-[var(--brand-primary)]"
                  style={{ backgroundColor: 'var(--brand-primary-light)', color: 'var(--brand-primary)' }}
                >
                  <div className="group-hover:text-white transition-colors">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-heading-sm mb-2">{feature.title}</h3>
                <p className="text-body-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {feature.description}
                </p>
                <div className="pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
                  <span className="text-data-lg" style={{ color: 'var(--brand-primary)' }}>
                    {feature.stat}
                  </span>
                  <div className="text-data-sm mt-0.5">{feature.statLabel}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl overflow-hidden relative"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {/* Background grid pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            <div className="relative px-8 py-14 sm:px-14 flex flex-col sm:flex-row items-center gap-8 justify-between">
              <div>
                <h2 className="text-display-md text-white mb-3">
                  Your next claim is waiting.
                </h2>
                <p className="text-white/80 text-body-md max-w-md">
                  Upload a photo and get a full damage assessment, fraud check, and cost estimate in under 90 seconds.
                </p>
              </div>
              <Link
                href="/upload"
                className="flex-shrink-0 inline-flex items-center gap-2 font-semibold px-6 py-3.5 rounded-xl transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: 'white', color: 'var(--brand-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Start assessment
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="border-t py-8" style={{ borderColor: 'var(--border-default)' }}>
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-display text-sm" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}>
              ClaimSight
            </span>
          </div>
          <div className="text-data-sm text-center" style={{ color: 'var(--text-muted)' }}>
            © 2024 ClaimSight · AI Damage Assessment Platform · v2.4.1
          </div>
        </div>
      </footer>
    </div>
  );
}
