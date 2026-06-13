import { OrderDetailPageContent } from '@/components/shop/order-detail-page-content';

interface OrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;

  return <OrderDetailPageContent orderId={id} />;
}

export async function generateMetadata({ params }: OrderDetailPageProps) {
  const { id } = await params;

  return {
    title: `Order #${id} - E-Commerce Store`,
    description: 'View your order details, status, and tracking information.',
    robots: { index: false, follow: false, nocache: true },
  };
}
