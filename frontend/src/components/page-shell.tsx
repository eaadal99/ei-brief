'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AppSidebar from '@/components/app-sidebar';
import MobileNav from '@/components/mobile-nav';
import MarketTicker from '@/components/market-ticker';
import ShortcutsHelp from '@/components/shortcuts-help';

interface PageShellProps {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  /** Optional element rendered to the right of the title (e.g. action buttons) */
  actions?: React.ReactNode;
  /** Hide the market ticker (e.g. for the digest print view) */
  hideTicker?: boolean;
  /** Max-width of the content container; default 'content' (1100px). 'narrow' = 780px, 'wide' = full */
  width?: 'narrow' | 'content' | 'wide';
}

const widthClass = {
  narrow: 'max-w-[780px]',
  content: 'max-w-[1100px]',
  wide: 'max-w-none',
} as const;

export default function PageShell({
  children,
  title,
  eyebrow,
  subtitle,
  actions,
  hideTicker = false,
  width = 'content',
}: PageShellProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) router.replace('/login');
    else setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex items-center gap-2.5 text-muted-foreground text-xs eyebrow">
          <span className="w-1.5 h-1.5 rounded-full brand-bg animate-pulse-dot" />
          Connecting
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 lg:pl-16 pb-24 lg:pb-0">
        {/* Market ticker */}
        {!hideTicker && <MarketTicker />}

        {/* Header */}
        <header className="sticky top-0 z-20 bg-background no-print">
          <div className={`px-6 py-6 mx-auto ${widthClass[width]}`}>
            <div className="flex items-end justify-between gap-3">
              <div>
                {eyebrow && (
                  <p className="eyebrow text-muted-foreground mb-2">{eyebrow}</p>
                )}
                <h1 className="display-serif text-[28px] sm:text-[34px] font-semibold leading-none text-foreground">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-[13px] text-muted-foreground mt-2 max-w-xl">{subtitle}</p>
                )}
              </div>
              {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </div>
          </div>
        </header>

        <div className={`px-6 py-8 mx-auto ${widthClass[width]}`}>
          {children}
        </div>
      </main>

      <MobileNav />
      <ShortcutsHelp />
    </div>
  );
}
