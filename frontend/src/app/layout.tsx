import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import { PUBLIC_SITE_URL, SITE_DESCRIPTION, SITE_NAME } from '@/constants/seo.constants';

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_SITE_URL),
  title: {
    default: "STORE | E-Commerce",
    template: "%s | STORE",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'shopping',
  keywords: ['e-commerce', 'belanja online', 'fashion', 'aksesori', 'online store'],
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: SITE_NAME,
    title: 'STORE | E-Commerce',
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'STORE | E-Commerce',
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="antialiased">
      <body className="min-h-screen flex flex-col bg-background font-sans">
        <Providers>
          {children}
          <Toaster richColors position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
