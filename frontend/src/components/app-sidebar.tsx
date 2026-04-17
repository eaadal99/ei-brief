'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, logout } from '@/lib/auth';
import { CurrentUser } from '@/lib/types';
import { ThemeToggle } from './theme-toggle';
import { onKey } from './keyboard-shortcuts';

// ── Nav structure ─────────────────────────────────────────────────────────────

const primaryNav = [
  {
    label: 'Feed',
    href: '/',
    shortcut: 'f',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" />
      </svg>
    ),
  },
  {
    label: 'The Brief',
    href: '/digest',
    shortcut: 'd',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>
    ),
  },
  {
    label: 'All News',
    href: '/all',
    shortcut: 'a',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
  {
    label: 'Saved',
    href: '/saved',
    shortcut: 's',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
      </svg>
    ),
  },
  {
    label: 'Newsletter',
    href: '/newsletter',
    shortcut: 'n',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      </svg>
    ),
  },
];

const secondaryNav = [
  {
    label: 'Preferences',
    href: '/preferences',
    shortcut: 'p',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 4H14" /><path d="M10 4H3" />
        <path d="M21 12H12" /><path d="M8 12H3" />
        <path d="M21 20H16" /><path d="M12 20H3" />
        <path d="M14 2v4" /><path d="M8 10v4" /><path d="M16 18v4" />
      </svg>
    ),
  },
  {
    label: 'System',
    href: '/system',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

// ── Sidebar ──────────────────────────────────────────────────────────────────

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  // Register `g f / g d / g a / g s / g p` jump shortcuts via a two-key combo
  useEffect(() => {
    let armed = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const armOff = onKey('g', () => {
      armed = true;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => { armed = false; }, 1200);
    });

    const routes: Array<[string, string]> = [
      ['f', '/'], ['d', '/digest'], ['a', '/all'], ['s', '/saved'],
      ['n', '/newsletter'], ['p', '/preferences'],
    ];
    const offs = routes.map(([k, href]) =>
      onKey(k, () => {
        if (armed) {
          armed = false;
          router.push(href);
        }
      })
    );

    return () => {
      armOff();
      offs.forEach(o => o());
      if (timeout) clearTimeout(timeout);
    };
  }, [router]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const initials = (user?.display_name || user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className="group/sidebar hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200 ease-out"
      style={{ width: '64px' }}
      onMouseEnter={(e) => { e.currentTarget.style.width = '224px'; }}
      onMouseLeave={(e) => { e.currentTarget.style.width = '64px'; }}
    >
      {/* Logo + wordmark (wordmark fades in on expand) */}
      <div className="h-16 px-3 flex items-center gap-2.5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 brand-bg">
          <span className="text-sidebar font-bold text-sm leading-none">E</span>
        </div>
        <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
          <p className="display-serif text-[15px] font-semibold leading-none">E&amp;I Brief</p>
          <p className="eyebrow text-sidebar-foreground/50 mt-1 leading-none">Energy Intelligence</p>
        </div>
      </div>

      {/* Primary */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden no-scrollbar">
        {primaryNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`relative flex items-center gap-3 h-10 px-2.5 rounded-md text-sm font-medium transition-all ${
                active
                  ? 'text-sidebar-primary bg-white/[0.04]'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/[0.03]'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full brand-bg" />
              )}
              <span className="shrink-0 w-[18px] flex items-center justify-center">{item.icon}</span>
              <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}

        <div className="my-3 mx-1 h-px bg-sidebar-border" />

        {secondaryNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`relative flex items-center gap-3 h-10 px-2.5 rounded-md text-sm font-medium transition-all ${
                active
                  ? 'text-sidebar-primary bg-white/[0.04]'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/[0.03]'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full brand-bg" />
              )}
              <span className="shrink-0 w-[18px] flex items-center justify-center">{item.icon}</span>
              <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ⌘K hint */}
      <div className="px-3 py-2 border-t border-sidebar-border">
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="flex items-center gap-2 w-full h-9 px-2 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/[0.03] transition-colors"
          title="Command palette"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs flex-1 text-left">
            Search
          </span>
          <kbd className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap font-mono text-[10px] px-1.5 py-0.5 rounded border border-sidebar-border bg-white/[0.04]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* User / theme / sign-out */}
      <div className="px-2 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 h-10 px-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-white/10 bg-white/[0.04]">
            <span className="brand-text text-[10px] font-semibold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
            <p className="text-xs font-medium text-sidebar-foreground/85 truncate leading-tight">
              {user?.display_name || user?.name || 'Signed in'}
            </p>
            <p className="text-[10px] text-sidebar-foreground/45 truncate leading-tight mt-0.5">
              Press ? for shortcuts
            </p>
          </div>
          <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 flex items-center gap-1">
            <ThemeToggle compact />
            <button
              onClick={logout}
              title="Sign out"
              className="shrink-0 text-sidebar-foreground/40 hover:text-sidebar-foreground/90 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
