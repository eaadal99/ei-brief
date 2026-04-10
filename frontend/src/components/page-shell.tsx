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
}

export default function PageShell({ children, title, subtitle }: PageShellProps) {
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
      <div className="flex items-center justify-center h-screen text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />

      <main className="flex-1 lg:pl-60 pb-20 lg:pb-0">
        <header className="sticky top-0 z-10 bg-background border-b px-6 py-5">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </header>

        <div className="p-6 max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
