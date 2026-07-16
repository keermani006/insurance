'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const NAV_LINKS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/upload',
    label: 'New Assessment',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    href: '/claims',
    label: 'Claims',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState('adjuster@claimsight.io');
  const [initials, setInitials] = useState('MW');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setEmail(user.email);
        const namePart = user.email.split('@')[0] || '';
        setInitials(namePart.substring(0, 2).toUpperCase() || 'AD');
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside
      className="sidebar hidden lg:flex flex-col w-64 fixed left-0 top-0 h-screen z-40"
      aria-label="Primary navigation"
    >
      {/* Logo */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--border-default)' }}>
        <Link href="/" className="flex items-center gap-3 group" aria-label="ClaimSight home">
          {/* Logo mark */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="font-display text-lg leading-tight" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              ClaimSight
            </div>
            <div className="text-data-sm" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
              v2.4.1 · ADJUSTER
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
        <div className="mb-3 px-2">
          <span className="text-data-sm" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em', fontSize: '10px', textTransform: 'uppercase' }}>
            Workspace
          </span>
        </div>
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn('nav-item', isActive && 'active')}
              aria-current={isActive ? 'page' : undefined}
            >
              {link.icon}
              <span>{link.label}</span>
              {link.href === '/upload' && (
                <span
                  className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
                >
                  NEW
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
        {/* User avatar */}
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: 'var(--brand-primary)' }}
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {email}
              </div>
              <div className="text-data-sm truncate">Adjuster</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-text-secondary hover:text-brand-primary p-1.5 rounded transition-colors flex-shrink-0"
            title="Logout"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

// Mobile navbar
export function MobileNavbar() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
      aria-label="Mobile navigation"
    >
      <div className="flex">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors',
                isActive
                  ? 'text-brand-primary'
                  : 'text-text-secondary'
              )}
              style={{ color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)' }}
              aria-current={isActive ? 'page' : undefined}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Top bar (for mobile)
export function TopBar() {
  const router = useRouter();
  const [initials, setInitials] = useState('MW');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        const namePart = user.email.split('@')[0] || '';
        setInitials(namePart.substring(0, 2).toUpperCase() || 'AD');
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header
      className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
    >
      <Link href="/" className="flex items-center gap-2" aria-label="ClaimSight home">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="font-display text-base" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          ClaimSight
        </span>
      </Link>
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: 'var(--brand-primary)' }}
          aria-label="User account"
        >
          {initials}
        </div>
        <button
          onClick={handleLogout}
          className="text-text-secondary hover:text-brand-primary p-1 rounded transition-colors"
          title="Logout"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
        </button>
      </div>
    </header>
  );
}
