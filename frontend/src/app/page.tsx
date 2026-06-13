import type { Metadata } from 'next';
import { HomePageContent } from '@/components/layout/home-page-content';
import { SITE_DESCRIPTION } from '@/constants/seo.constants';

export const metadata: Metadata = {
  title: 'STORE | E-Commerce',
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'STORE | E-Commerce',
    description: SITE_DESCRIPTION,
    url: '/',
    type: 'website',
  },
};

export default function Home() {
  return <HomePageContent />;
}
