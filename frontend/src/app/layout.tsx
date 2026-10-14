import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { rootMetadata } from '@/lib/seo/metadata';

// Montserrat is self-hosted by next/font: no render-blocking request to Google
// Fonts, and `adjustFontFallback` generates a metric-matched local fallback so
// text does not visibly reflow (CLS) while the font loads. Only the weights the
// UI actually uses are downloaded.
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
  weight: ['400', '500', '600', '700', '800'],
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = rootMetadata();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The font variable must be declared on <html>, not <body>: `:root` (which is
    // <html>) builds `--font-sans` from `--font-montserrat`, and a variable set on
    // a descendant like <body> is not visible to `:root`, so Montserrat never applied.
    <html lang="en-IN" className={montserrat.variable}>
      <body className="min-h-dvh flex flex-col bg-background text-foreground antialiased">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
