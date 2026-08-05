import type { Metadata } from 'next';
import SupportPageClient from './support-page-client';

export const metadata: Metadata = {
  title: 'Get help',
};

export default function SupportPage() {
  return <SupportPageClient />;
}
