'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  {
    label: 'Feed',
    href: '/',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" />
      </svg>
    ),
  },
  {
    label: 'Brief',
    href: '/digest',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>
    ),
  },
  {
    label: 'Search',
    action: 'search' as const,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    label: 'All',
    href: '/all',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
  {
    label: 'Saved',
    href: '/saved',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
      </svg>
    ),
  },
];

export default function MobileNav() {
  const pathname = usePathname();

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-sidebar text-sidebar-foreground lg:hidden z-50 border-t border-sidebar-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around pt-1 pb-1.5">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const commonClass = `flex-1 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md transition-colors ${
            active ? 'brand-text' : 'text-sidebar-foreground/55 hover:text-sidebar-foreground'
          }`;

          if (tab.action === 'search') {
            return (
              <button
                key="search"
                className={commonClass}
                onClick={() =>
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
                }
              >
                <span className="shrink-0">{tab.icon}</span>
                <span className="text-[10px] leading-tight font-medium">{tab.label}</span>
              </button>
            );
          }

          return (
            <Link key={tab.href} href={tab.href!} className={commonClass}>
              <span className="shrink-0">{tab.icon}</span>
              <span className="text-[10px] leading-tight font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
