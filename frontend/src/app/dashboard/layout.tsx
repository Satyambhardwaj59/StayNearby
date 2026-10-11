import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { privateMetadata } from '@/lib/seo/metadata';

// One place that keeps every dashboard route private and out of search results.
export const metadata: Metadata = privateMetadata(
  'Dashboard',
  'Manage your StayNearby listings, visits, messages and saved properties.',
);

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
