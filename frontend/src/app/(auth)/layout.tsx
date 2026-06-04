import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { AuthRouteGuard } from '@/components/auth/AuthRouteGuard';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-12">
        <Suspense fallback={null}>
          <AuthRouteGuard>{children}</AuthRouteGuard>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
