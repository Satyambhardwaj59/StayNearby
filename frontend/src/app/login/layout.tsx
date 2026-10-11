import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { privateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = privateMetadata(
  'Sign in',
  'Sign in to your StayNearby account to save homes and contact owners.',
);

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
