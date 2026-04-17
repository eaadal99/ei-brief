'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AppSidebar from '@/components/app-sidebar';
import MobileNav from '@/components/mobile-nav';

interface PageShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Optional element rendered to the right of the title (e.g. action buttons) */
  actions?: React.ReactNode;
}

export default function PageShell({ children, title, subtitle, actions }: PageShellProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 lg:pl-60 pb-24 lg:pb-0">
        {/* Sticky header with backdrop blur */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/70 px-6 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </header>

        <div className="px-6 py-6 max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
