import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewsSection } from '@/components/product/reviews-section';

interface ProductDetailTabsProps {
  productId: string;
  description: string;
  reviewCount: number;
}

export function ProductDetailTabs({
  productId,
  description,
  reviewCount,
}: ProductDetailTabsProps) {
  return (
    <Tabs defaultValue="description" className="mt-16">
      <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
        <TabsTrigger
          value="description"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
        >
          Description
        </TabsTrigger>
        <TabsTrigger
          value="reviews"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
        >
          Reviews ({reviewCount})
        </TabsTrigger>
        <TabsTrigger
          value="shipping"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
        >
          Shipping & Returns
        </TabsTrigger>
      </TabsList>

      <TabsContent value="description" className="py-6">
        <div className="prose max-w-none">
          {description || 'No description available.'}
        </div>
      </TabsContent>

      <TabsContent value="reviews" className="py-6">
        <ReviewsSection productId={productId} />
      </TabsContent>

      <TabsContent value="shipping" className="py-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Shipping</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Free shipping on orders over Rp 500.000</li>
              <li>Standard delivery: 3-5 business days</li>
              <li>Express delivery: 1-2 business days</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Returns</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>30-day return policy</li>
              <li>Items must be unworn with tags attached</li>
              <li>Free returns on all orders</li>
            </ul>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
