import type { Metadata } from "next";
import { Geist, Fraunces } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ArticlesProvider } from "@/components/articles-context";
import KeyboardShortcutsRoot from "@/components/keyboard-shortcuts";
import CommandPalette from "@/components/command-palette";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "E&I Brief — Energy Intelligence",
  description: "A terminal for energy markets. Personalised, fast, serious.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="ink"
          themes={["ink", "paper"]}
          value={{ ink: "ink", paper: "paper" }}
          enableSystem={false}
          storageKey="ei-brief-theme"
        >
          <ArticlesProvider>
            {children}
            <CommandPalette />
            <KeyboardShortcutsRoot />
            <Toaster position="top-right" />
          </ArticlesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
