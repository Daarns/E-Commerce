import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 min-h-[calc(100svh-4rem)]">
        {children}
      </main>
      <Footer />
    </div>
  );
}
