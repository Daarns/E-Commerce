import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-12">
        {children}
      </main>
      <Footer />
    </>
  );
}
