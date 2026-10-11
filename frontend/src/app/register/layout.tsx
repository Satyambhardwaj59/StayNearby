import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { privateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = privateMetadata(
  'Create your account',
  'Create a StayNearby account to find a home or list your property.',
);

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children;
}
