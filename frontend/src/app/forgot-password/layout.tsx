import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { privateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = privateMetadata(
  'Reset your password',
  'Reset the password for your StayNearby account.',
);

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
